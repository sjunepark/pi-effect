import type { AgentSessionEvent } from "@earendil-works/pi-coding-agent";
import { Effect, Either, Stream } from "effect";
import { describe, expect, it, vi } from "vitest";
import {
  AgentSessionEffect,
  AgentSessionPromptError,
  AgentSessionPromptRejectedError,
} from "../../src/index.js";
import { FakeAgentSession, fakeAgentSessionFactory } from "../../src/testing/FakeAgentSession.js";

describe("AgentSessionEffect", () => {
  it("disposes an acquired session exactly once when the scope closes", async () => {
    const session = new FakeAgentSession();

    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const result = yield* AgentSessionEffect.createFrom(fakeAgentSessionFactory(session));
          expect(result.session).toBe(session);
          expect(session.disposeCount).toBe(0);
        }),
      ),
    );

    expect(session.disposeCount).toBe(1);
  });

  it("delegates successful prompts to the PI session", async () => {
    const session = new FakeAgentSession();

    await Effect.runPromise(AgentSessionEffect.prompt(session, "hello"));

    expect(session.prompts).toEqual([
      { text: "hello", options: { preflightResult: expect.any(Function) } },
    ]);
  });

  it("maps PI preflight rejection to AgentSessionPromptRejectedError", async () => {
    const cause = new Error("no model selected");
    const preflightResult = vi.fn();
    const session = new FakeAgentSession({
      prompt: async (_text, options) => {
        options?.preflightResult?.(false);
        throw cause;
      },
    });

    const result = await Effect.runPromise(
      AgentSessionEffect.prompt(session, "rejected", { preflightResult }).pipe(Effect.either),
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left).toBeInstanceOf(AgentSessionPromptRejectedError);
      expect(result.left.cause).toBe(cause);
    }
    expect(preflightResult).toHaveBeenCalledWith(false);
  });

  it("normalizes prompt failures while preserving the original cause", async () => {
    const cause = new Error("provider failed");
    const session = new FakeAgentSession({
      prompt: async () => {
        throw cause;
      },
    });

    const result = await Effect.runPromise(AgentSessionEffect.prompt(session, "fail").pipe(Effect.either));

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left).toMatchObject({
        _tag: "AgentSessionPromptError",
        cause,
      } satisfies Partial<AgentSessionPromptError>);
    }
  });

  it("keeps preflight rejection tracking isolated per Effect execution", async () => {
    const preflightCause = new Error("no model selected");
    const promptCause = new Error("provider failed later");
    let runCount = 0;
    const session = new FakeAgentSession({
      prompt: async (_text, options) => {
        runCount += 1;
        if (runCount === 1) {
          options?.preflightResult?.(false);
          throw preflightCause;
        }
        throw promptCause;
      },
    });
    const program = AgentSessionEffect.prompt(session, "reuse me").pipe(Effect.either);

    const first = await Effect.runPromise(program);
    const second = await Effect.runPromise(program);

    expect(Either.isLeft(first)).toBe(true);
    if (Either.isLeft(first)) {
      expect(first.left).toBeInstanceOf(AgentSessionPromptRejectedError);
      expect(first.left.cause).toBe(preflightCause);
    }
    expect(Either.isLeft(second)).toBe(true);
    if (Either.isLeft(second)) {
      expect(second.left).toMatchObject({
        _tag: "AgentSessionPromptError",
        cause: promptCause,
      } satisfies Partial<AgentSessionPromptError>);
    }
  });

  it("aborts the PI session when the Effect fiber is interrupted", async () => {
    const session = new FakeAgentSession({
      prompt: () => new Promise<void>(() => {}),
    });
    const controller = new AbortController();

    const running = Effect.runPromise(AgentSessionEffect.prompt(session, "long prompt"), {
      signal: controller.signal,
    }).catch(() => undefined);

    await vi.waitFor(() => expect(session.prompts).toHaveLength(1));
    controller.abort();
    await running;

    expect(session.abortCount).toBe(1);
  });

  it("forwards session events in order and unsubscribes on stream completion", async () => {
    const session = new FakeAgentSession();
    const first = { type: "queue_update", steering: ["a"], followUp: [] } satisfies AgentSessionEvent;
    const second = { type: "queue_update", steering: [], followUp: ["b"] } satisfies AgentSessionEvent;

    const collected = Effect.runPromise(
      AgentSessionEffect.events(session).pipe(Stream.take(2), Stream.runCollect),
    );

    await vi.waitFor(() => expect(session.listenerCount).toBe(1));
    session.emit(first);
    session.emit(second);

    expect(Array.from(await collected)).toEqual([first, second]);
    expect(session.unsubscribeCount).toBe(1);
  });
});
