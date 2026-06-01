const errorMessage = (cause: unknown, fallback: string): string => {
  if (cause instanceof Error && cause.message.length > 0) return cause.message;
  if (typeof cause === "string" && cause.length > 0) return cause;
  return fallback;
};

export interface PiToolErrorOptions {
  readonly message?: string;
  readonly cause?: unknown;
}

export class PiToolExecutionError extends Error {
  readonly _tag = "PiToolExecutionError" as const;
  override readonly cause: unknown;

  constructor(options: PiToolErrorOptions = {}) {
    super(options.message ?? errorMessage(options.cause, "PI tool execution failed"));
    this.name = "PiToolExecutionError";
    this.cause = options.cause;
  }
}

export class PiToolDefectError extends Error {
  readonly _tag = "PiToolDefectError" as const;
  override readonly cause: unknown;

  constructor(options: PiToolErrorOptions = {}) {
    super(options.message ?? errorMessage(options.cause, "PI tool handler defect"));
    this.name = "PiToolDefectError";
    this.cause = options.cause;
  }
}

export type PiToolError = PiToolExecutionError | PiToolDefectError;
