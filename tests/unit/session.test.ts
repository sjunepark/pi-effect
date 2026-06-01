import { describe, expect, it, vi } from "vitest";
import { Effect, Stream } from "effect";
import { PiEventStream, PiPrompt, PiSessionService } from "../../src/index.js";
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

    expect(session.prompts).toEqual([{ text: "hello", options: undefined }]);
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
