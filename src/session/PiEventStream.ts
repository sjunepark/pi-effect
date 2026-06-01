import { Effect, Stream } from "effect";
import type { PiSessionEvent, PiSessionLike } from "./PiSession.js";
import { PiEventStreamError } from "./PiSessionError.js";

export interface PiEventStreamOptions {
  readonly bufferSize?: number | "unbounded";
}

const subscribe = (session: PiSessionLike, emit: { single(value: PiSessionEvent): boolean }) =>
  Effect.acquireRelease(
    Effect.try({
      try: () => session.subscribe((event) => emit.single(event)),
      catch: (cause) => new PiEventStreamError({ cause }),
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

/** Convert `session.subscribe(...)` into an Effect Stream with scoped unsubscribe cleanup. */
export const fromSession = (
  session: PiSessionLike,
  options: PiEventStreamOptions = {},
): Stream.Stream<PiSessionEvent, PiEventStreamError> =>
  Stream.asyncPush<PiSessionEvent, PiEventStreamError>(
    (emit) => subscribe(session, emit),
    options.bufferSize === undefined ? undefined : { bufferSize: options.bufferSize },
  );

export const PiEventStream = {
  fromSession,
} as const;
