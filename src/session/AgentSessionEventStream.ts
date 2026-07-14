import { Cause, Effect, Queue, Stream } from "effect";
import type { AgentSessionEvent, AgentSessionLike } from "./AgentSessionEffect.js";
import {
  AgentSessionEventStreamError,
  AgentSessionEventStreamOverflowError,
} from "./AgentSessionEffectError.js";

/** Options for the Effect Stream created from PI SDK `AgentSession.subscribe(...)`. */
export interface AgentSessionEventStreamOptions {
  readonly bufferSize?: number | "unbounded";
}

export type AgentSessionEventStreamFailure =
  | AgentSessionEventStreamError
  | AgentSessionEventStreamOverflowError;

const subscribe = (
  session: AgentSessionLike,
  queue: Queue.Queue<AgentSessionEvent, AgentSessionEventStreamFailure | Cause.Done>,
  bufferSize: number | "unbounded",
) => {
  let unsubscribe: (() => void) | undefined;
  let closeRequested = false;
  let closed = false;
  const close = () => {
    closeRequested = true;
    if (unsubscribe === undefined || closed) return;

    closed = true;
    try {
      unsubscribe();
    } catch {
      // Stream finalizers and overflow cleanup must not mask the stream exit.
    }
  };

  return Effect.acquireRelease(
    Effect.try({
      try: () => {
        unsubscribe = session.subscribe((event) => {
          const accepted = Queue.offerUnsafe(queue, event);
          if (!accepted && bufferSize !== "unbounded") {
            Queue.failCauseUnsafe(
              queue,
              Cause.fail(new AgentSessionEventStreamOverflowError({ bufferSize })),
            );
          }
          if (!accepted) close();
        });
        if (closeRequested) close();
        return close;
      },
      catch: (cause) => new AgentSessionEventStreamError({ cause }),
    }),
    (close) => Effect.sync(close),
  ).pipe(Effect.catch((error) => Queue.fail(queue, error)));
};

/**
 * Convert PI SDK `AgentSession.subscribe(...)` into an Effect Stream.
 *
 * The emitted values are the original PI `AgentSessionEvent` objects. Stream
 * finalization calls the PI unsubscribe callback so consumers get scoped cleanup
 * without learning a pi-effect-specific event model.
 */
export const events = (
  session: AgentSessionLike,
  options: AgentSessionEventStreamOptions = {},
): Stream.Stream<AgentSessionEvent, AgentSessionEventStreamFailure> => {
  const bufferSize = options.bufferSize ?? "unbounded";

  return Stream.callback<AgentSessionEvent, AgentSessionEventStreamFailure>(
    (queue) => subscribe(session, queue, bufferSize),
    bufferSize === "unbounded"
      ? undefined
      : { bufferSize, strategy: "dropping" },
  );
};

/** Namespace for stream-specific helpers around PI SDK `AgentSession` events. */
export const AgentSessionEventStream = {
  fromSession: events,
} as const;
