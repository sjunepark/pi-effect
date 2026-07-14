import { Cause } from "effect";

/**
 * True when an Effect v4 cause represents only fiber interruption.
 *
 * Effect v4 Promise runners squash causes before rejecting, so non-Effect
 * boundaries must inspect `runPromiseExit(...)` results before translating
 * interruption into package-level errors.
 */
export const isInterruptedCause = (cause: unknown): boolean =>
  Cause.isCause(cause) && Cause.hasInterruptsOnly(cause);
