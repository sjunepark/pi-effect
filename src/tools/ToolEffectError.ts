const messageFromCause = (cause: unknown, fallback: string): string => {
  if (cause instanceof Error && cause.message.length > 0) return cause.message;
  if (typeof cause === "string" && cause.length > 0) return cause;
  return fallback;
};

/** Options shared by errors raised from `defineToolEffect(...)` Promise boundaries. */
export interface ToolEffectErrorOptions {
  readonly message?: string;
  readonly cause?: unknown;
}

/** Effect failure from a tool handler, exposed as a rejected PI tool execution. */
export class ToolEffectExecutionError extends Error {
  readonly _tag = "ToolEffectExecutionError" as const;
  override readonly cause: unknown;

  constructor(options: ToolEffectErrorOptions = {}) {
    super(options.message ?? messageFromCause(options.cause, "PI tool Effect handler failed"));
    this.name = "ToolEffectExecutionError";
    this.cause = options.cause;
  }
}

/** Defect or synchronous throw from a tool handler, exposed as a rejected PI tool execution. */
export class ToolEffectDefectError extends Error {
  readonly _tag = "ToolEffectDefectError" as const;
  override readonly cause: unknown;

  constructor(options: ToolEffectErrorOptions = {}) {
    super(options.message ?? messageFromCause(options.cause, "PI tool Effect handler defect"));
    this.name = "ToolEffectDefectError";
    this.cause = options.cause;
  }
}

/** Abort-signal interruption from a tool handler, with the original Effect FiberFailure preserved as cause. */
export class ToolEffectInterruptedError extends Error {
  readonly _tag = "ToolEffectInterruptedError" as const;
  override readonly cause: unknown;

  constructor(options: ToolEffectErrorOptions = {}) {
    super(options.message ?? messageFromCause(options.cause, "PI tool Effect handler interrupted"));
    this.name = "ToolEffectInterruptedError";
    this.cause = options.cause;
  }
}

/** Stable error union for `defineToolEffect(...)` Promise rejections. */
export type ToolEffectError = ToolEffectExecutionError | ToolEffectDefectError | ToolEffectInterruptedError;
