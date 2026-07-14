import type { AgentSessionEvent } from "@earendil-works/pi-coding-agent";
import { Effect, Result, Stream } from "effect";
import { describe, expect, it, vi } from "vitest";
import {
  AgentSessionEffect,
  AgentSessionEventStreamOverflowError,
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
      AgentSessionEffect.prompt(session, "rejected", { preflightResult }).pipe(Effect.result),
    );

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.failure).toBeInstanceOf(AgentSessionPromptRejectedError);
      expect(result.failure.cause).toBe(cause);
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

    const result = await Effect.runPromise(AgentSessionEffect.prompt(session, "fail").pipe(Effect.result));

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.failure).toMatchObject({
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
    const program = AgentSessionEffect.prompt(session, "reuse me").pipe(Effect.result);

    const first = await Effect.runPromise(program);
    const second = await Effect.runPromise(program);

    expect(Result.isFailure(first)).toBe(true);
    if (Result.isFailure(first)) {
      expect(first.failure).toBeInstanceOf(AgentSessionPromptRejectedError);
      expect(first.failure.cause).toBe(preflightCause);
    }
    expect(Result.isFailure(second)).toBe(true);
    if (Result.isFailure(second)) {
      expect(second.failure).toMatchObject({
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

  it("fails the event stream when session subscription throws", async () => {
    const session = new FakeAgentSession();
    const cause = new Error("subscribe failed");
    vi.spyOn(session, "subscribe").mockImplementation(() => {
      throw cause;
    });

    const result = await Effect.runPromise(
      AgentSessionEffect.events(session).pipe(Stream.runCollect, Effect.result),
    );

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.failure).toMatchObject({
        _tag: "AgentSessionEventStreamError",
        cause,
      });
    }
  });

  it("fails bounded event streams instead of silently dropping overflow events", async () => {
    const first = { type: "queue_update", steering: ["a"], followUp: [] } satisfies AgentSessionEvent;
    const second = { type: "queue_update", steering: [], followUp: ["b"] } satisfies AgentSessionEvent;
    const session = new FakeAgentSession();
    const collected = Effect.runPromise(
      AgentSessionEffect.events(session, { bufferSize: 1 }).pipe(Stream.runCollect, Effect.result),
    );

    await vi.waitFor(() => expect(session.listenerCount).toBe(1));
    session.emit(first);
    session.emit(second);

    const result = await collected;

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.failure).toEqual(
        new AgentSessionEventStreamOverflowError({ bufferSize: 1 }),
      );
    }
    expect(session.unsubscribeCount).toBe(1);
  });

  it("unsubscribes immediately on overflow even when downstream stalls on a buffered event", async () => {
    const first = { type: "queue_update", steering: ["a"], followUp: [] } satisfies AgentSessionEvent;
    const second = { type: "queue_update", steering: [], followUp: ["b"] } satisfies AgentSessionEvent;
    const session = new FakeAgentSession();
    const controller = new AbortController();
    const running = Effect.runPromise(
      AgentSessionEffect.events(session, { bufferSize: 1 }).pipe(
        Stream.mapEffect(() => Effect.never),
        Stream.runDrain,
      ),
      { signal: controller.signal },
    ).catch(() => undefined);

    await vi.waitFor(() => expect(session.listenerCount).toBe(1));
    session.emit(first);
    session.emit(second);

    await vi.waitFor(() => expect(session.listenerCount).toBe(0));
    expect(session.unsubscribeCount).toBe(1);

    controller.abort();
    await running;
    expect(session.unsubscribeCount).toBe(1);
  });
});
