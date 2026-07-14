import { Cause, Effect } from "effect";
import { isInterruptedCause } from "./EffectRuntimeFailure.js";

export interface EffectPromiseBoundaryOptions<E> {
  readonly signal?: AbortSignal | undefined;
  readonly mapError: (error: E) => unknown;
  readonly mapDefect: (defect: unknown) => unknown;
  readonly mapInterrupted: (cause: Cause.Cause<unknown>) => unknown;
}

const runPromiseExit = <A, E>(effect: Effect.Effect<A, E>, signal: AbortSignal | undefined) =>
  signal === undefined ? Effect.runPromiseExit(effect) : Effect.runPromiseExit(effect, { signal });

/**
 * Run an Effect implementation behind a non-Effect Promise callback boundary.
 *
 * Effect failures, defects, and interruption are classified from the v4
 * `Exit` before leaving the Effect runtime. JavaScript Promises have no native
 * channels for those distinctions, so each non-success exit is rejected with
 * the adapter's corresponding boundary error.
 */
export const runEffectAsPromise = <A, E>(
  effect: Effect.Effect<A, E>,
  options: EffectPromiseBoundaryOptions<E>,
): Promise<A> => {
  return runPromiseExit(effect, options.signal).then((exit) => {
    if (exit._tag === "Success") return exit.value;

    const cause = exit.cause;
    if (isInterruptedCause(cause)) throw options.mapInterrupted(cause);

    const failure = cause.reasons.find(Cause.isFailReason);
    if (failure !== undefined) throw options.mapError(failure.error);

    const defect = cause.reasons.find(Cause.isDieReason);
    throw options.mapDefect(defect?.defect ?? Cause.squash(cause));
  });
};
