import { Data } from "effect";

const messageFromCause = (cause: unknown, fallback: string): string => {
  if (cause instanceof Error && cause.message.length > 0) return cause.message;
  if (typeof cause === "string" && cause.length > 0) return cause;
  return fallback;
};

interface ToolEffectErrorData {
  readonly message: string;
  readonly cause: unknown;
}

/** Options shared by errors raised from `defineToolEffect(...)` Promise boundaries. */
export interface ToolEffectErrorOptions {
  readonly message?: string;
  readonly cause?: unknown;
}

/** Effect failure from a tool handler, exposed as a rejected PI tool execution. */
export class ToolEffectExecutionError extends Data.TaggedError(
  "ToolEffectExecutionError",
)<ToolEffectErrorData> {
  constructor(options: ToolEffectErrorOptions = {}) {
    super({
      message: options.message ?? messageFromCause(options.cause, "PI tool Effect handler failed"),
      cause: options.cause,
    });
  }
}

/** Defect or synchronous throw from a tool handler, exposed as a rejected PI tool execution. */
export class ToolEffectDefectError extends Data.TaggedError("ToolEffectDefectError")<ToolEffectErrorData> {
  constructor(options: ToolEffectErrorOptions = {}) {
    super({
      message: options.message ?? messageFromCause(options.cause, "PI tool Effect handler defect"),
      cause: options.cause,
    });
  }
}

/** Abort-signal interruption from a tool handler, with the original Effect FiberFailure preserved as cause. */
export class ToolEffectInterruptedError extends Data.TaggedError(
  "ToolEffectInterruptedError",
)<ToolEffectErrorData> {
  constructor(options: ToolEffectErrorOptions = {}) {
    super({
      message: options.message ?? messageFromCause(options.cause, "PI tool Effect handler interrupted"),
      cause: options.cause,
    });
  }
}

/** Stable error union for `defineToolEffect(...)` Promise rejections. */
export type ToolEffectError = ToolEffectExecutionError | ToolEffectDefectError | ToolEffectInterruptedError;
