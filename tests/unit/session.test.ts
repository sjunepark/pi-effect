import { describe, expect, it, vi } from "vitest";
import { Effect, Either, Stream } from "effect";
import { PiEventStream, PiPrompt, PiPromptError, PiPromptRejectedError, PiSessionService } from "../../src/index.js";
import { FakePiSession, fakePiSessionFactory } from "../../src/testing/FakePiSession.js";
import type { AgentSessionEvent } from "@earendil-works/pi-coding-agent";

describe("PiSessionService", () => {
  it("disposes an acquired session exactly once when the scope closes", async () => {
    const session = new FakePiSession();

    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const acquired = yield* PiSessionService.acquireFrom(fakePiSessionFactory(session));
          expect(acquired).toBe(session);
          expect(session.disposeCount).toBe(0);
        }),
      ),
    );

    expect(session.disposeCount).toBe(1);
  });
});

describe("PiPrompt", () => {
  it("delegates successful prompts to the PI session", async () => {
    const session = new FakePiSession();

    await Effect.runPromise(PiPrompt.run(session, "hello"));

    expect(session.prompts).toEqual([
      { text: "hello", options: { preflightResult: expect.any(Function) } },
    ]);
  });

  it("maps PI preflight rejection to PiPromptRejectedError", async () => {
    const cause = new Error("no model selected");
    const preflightResult = vi.fn();
    const session = new FakePiSession({
      prompt: async (_text, options) => {
        options?.preflightResult?.(false);
        throw cause;
      },
    });

    const result = await Effect.runPromise(
      PiPrompt.run(session, "rejected", { preflightResult }).pipe(Effect.either),
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left).toBeInstanceOf(PiPromptRejectedError);
      expect(result.left.cause).toBe(cause);
    }
    expect(preflightResult).toHaveBeenCalledWith(false);
  });

  it("normalizes prompt failures while preserving the original cause", async () => {
    const cause = new Error("provider failed");
    const session = new FakePiSession({
      prompt: async () => {
        throw cause;
      },
    });

    const result = await Effect.runPromise(PiPrompt.run(session, "fail").pipe(Effect.either));

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left).toMatchObject({
        _tag: "PiPromptError",
        cause,
      } satisfies Partial<PiPromptError>);
    }
  });

  it("keeps preflight rejection tracking isolated per Effect execution", async () => {
    const preflightCause = new Error("no model selected");
    const promptCause = new Error("provider failed later");
    let runCount = 0;
    const session = new FakePiSession({
      prompt: async (_text, options) => {
        runCount += 1;
        if (runCount === 1) {
          options?.preflightResult?.(false);
          throw preflightCause;
        }
        throw promptCause;
      },
    });
    const program = PiPrompt.run(session, "reuse me").pipe(Effect.either);

    const first = await Effect.runPromise(program);
    const second = await Effect.runPromise(program);

    expect(Either.isLeft(first)).toBe(true);
    if (Either.isLeft(first)) {
      expect(first.left).toBeInstanceOf(PiPromptRejectedError);
      expect(first.left.cause).toBe(preflightCause);
    }
    expect(Either.isLeft(second)).toBe(true);
    if (Either.isLeft(second)) {
      expect(second.left).toMatchObject({
        _tag: "PiPromptError",
        cause: promptCause,
      } satisfies Partial<PiPromptError>);
    }
  });

  it("aborts the PI session when the Effect fiber is interrupted", async () => {
    const session = new FakePiSession({
      prompt: () => new Promise<void>(() => {}),
    });
    const controller = new AbortController();

    const running = Effect.runPromise(PiPrompt.run(session, "long prompt"), {
      signal: controller.signal,
    }).catch(() => undefined);

    await vi.waitFor(() => expect(session.prompts).toHaveLength(1));
    controller.abort();
    await running;

    expect(session.abortCount).toBe(1);
  });
});

describe("PiEventStream", () => {
  it("forwards session events in order and unsubscribes on stream completion", async () => {
    const session = new FakePiSession();
    const first = { type: "queue_update", steering: ["a"], followUp: [] } satisfies AgentSessionEvent;
    const second = { type: "queue_update", steering: [], followUp: ["b"] } satisfies AgentSessionEvent;

    const collected = Effect.runPromise(
      PiEventStream.fromSession(session).pipe(Stream.take(2), Stream.runCollect),
    );

    await vi.waitFor(() => expect(session.listenerCount).toBe(1));
    session.emit(first);
    session.emit(second);

    expect(Array.from(await collected)).toEqual([first, second]);
    expect(session.unsubscribeCount).toBe(1);
  });
});
