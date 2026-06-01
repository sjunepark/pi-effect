import { Effect, Either, Runtime } from "effect";
import { isInterruptedFiberFailure } from "./EffectRuntimeFailure.js";

export interface EffectPromiseBoundaryOptions<E> {
  readonly signal?: AbortSignal | undefined;
  readonly mapError: (error: E) => unknown;
  readonly mapDefect: (defect: unknown) => unknown;
  readonly mapInterrupted: (failure: Runtime.FiberFailure) => unknown;
}

const runPromise = <A, E>(effect: Effect.Effect<A, E>, signal: AbortSignal | undefined) =>
  signal === undefined ? Effect.runPromise(effect) : Effect.runPromise(effect, { signal });

/**
 * Run an Effect implementation behind a non-Effect Promise callback boundary.
 *
 * Effect failures and defects are mapped before leaving the Effect runtime.
 * Runtime interruption is mapped only at the Promise rejection boundary because
 * JavaScript Promises have no native interruption channel.
 */
export const runEffectAsPromise = <A, E>(
  effect: Effect.Effect<A, E>,
  options: EffectPromiseBoundaryOptions<E>,
): Promise<A> => {
  const boundaryEffect = effect.pipe(
    Effect.mapError(options.mapError),
    Effect.catchAllDefect((defect) => Effect.fail(options.mapDefect(defect))),
    Effect.either,
  );

  return runPromise(boundaryEffect, options.signal).then(
    (result) => {
      if (Either.isLeft(result)) throw result.left;
      return result.right;
    },
    (cause) => {
      throw isInterruptedFiberFailure(cause) ? options.mapInterrupted(cause) : options.mapDefect(cause);
    },
  );
};
