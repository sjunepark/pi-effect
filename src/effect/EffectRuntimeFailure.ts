import { Cause, Runtime } from "effect";

/**
 * True when an Effect runtime rejection represents only fiber interruption.
 *
 * Use this at non-Effect Promise boundaries before translating Effect runtime
 * failures into package-level interruption errors. Keep wrapper-specific error
 * mapping in the owning adapter module.
 */
export const isInterruptedFiberFailure = (cause: unknown): cause is Runtime.FiberFailure =>
  Runtime.isFiberFailure(cause) && Cause.isInterruptedOnly(cause[Runtime.FiberFailureCauseId]);
