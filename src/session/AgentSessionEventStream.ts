import { Effect, Stream } from "effect";
import type { AgentSessionEvent, AgentSessionLike } from "./AgentSessionEffect.js";
import { AgentSessionEventStreamError } from "./AgentSessionEffectError.js";

/** Options for the Effect Stream created from PI SDK `AgentSession.subscribe(...)`. */
export interface AgentSessionEventStreamOptions {
  readonly bufferSize?: number | "unbounded";
}

const subscribe = (session: AgentSessionLike, emit: { single(value: AgentSessionEvent): boolean }) =>
  Effect.acquireRelease(
    Effect.try({
      try: () => session.subscribe((event) => emit.single(event)),
      catch: (cause) => new AgentSessionEventStreamError({ cause }),
    }),
    (unsubscribe) =>
      Effect.sync(() => {
        try {
          unsubscribe();
        } catch {
          // Stream finalizers must not mask the original stream exit.
        }
      }),
  );

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
): Stream.Stream<AgentSessionEvent, AgentSessionEventStreamError> =>
  Stream.asyncPush<AgentSessionEvent, AgentSessionEventStreamError>(
    (emit) => subscribe(session, emit),
    options.bufferSize === undefined ? undefined : { bufferSize: options.bufferSize },
  );

/** Namespace for stream-specific helpers around PI SDK `AgentSession` events. */
export const AgentSessionEventStream = {
  fromSession: events,
} as const;
