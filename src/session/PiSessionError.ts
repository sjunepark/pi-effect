const messageFromCause = (cause: unknown, fallback: string): string => {
  if (cause instanceof Error && cause.message.length > 0) return cause.message;
  if (typeof cause === "string" && cause.length > 0) return cause;
  return fallback;
};

export interface PiErrorOptions {
  readonly message?: string;
  readonly cause?: unknown;
}

export class PiUnknownError extends Error {
  readonly _tag = "PiUnknownError" as const;
  override readonly cause: unknown;

  constructor(options: PiErrorOptions = {}) {
    super(options.message ?? messageFromCause(options.cause, "Unknown PI SDK error"));
    this.name = "PiUnknownError";
    this.cause = options.cause;
  }
}

export class PiSessionCreateError extends Error {
  readonly _tag = "PiSessionCreateError" as const;
  override readonly cause: unknown;

  constructor(options: PiErrorOptions = {}) {
    super(options.message ?? messageFromCause(options.cause, "Failed to create PI session"));
    this.name = "PiSessionCreateError";
    this.cause = options.cause;
  }
}

export class PiPromptError extends Error {
  readonly _tag = "PiPromptError" as const;
  override readonly cause: unknown;

  constructor(options: PiErrorOptions = {}) {
    super(options.message ?? messageFromCause(options.cause, "PI prompt failed"));
    this.name = "PiPromptError";
    this.cause = options.cause;
  }
}

export class PiPromptRejectedError extends Error {
  readonly _tag = "PiPromptRejectedError" as const;
  override readonly cause: unknown;

  constructor(options: PiErrorOptions = {}) {
    super(options.message ?? messageFromCause(options.cause, "PI prompt was rejected before execution"));
    this.name = "PiPromptRejectedError";
    this.cause = options.cause;
  }
}

export class PiSessionAbortedError extends Error {
  readonly _tag = "PiSessionAbortedError" as const;
  override readonly cause: unknown;

  constructor(options: PiErrorOptions = {}) {
    super(options.message ?? messageFromCause(options.cause, "PI session operation was aborted"));
    this.name = "PiSessionAbortedError";
    this.cause = options.cause;
  }
}

export class PiEventStreamError extends Error {
  readonly _tag = "PiEventStreamError" as const;
  override readonly cause: unknown;

  constructor(options: PiErrorOptions = {}) {
    super(options.message ?? messageFromCause(options.cause, "PI session event stream failed"));
    this.name = "PiEventStreamError";
    this.cause = options.cause;
  }
}

export class PiModelNotFoundError extends Error {
  readonly _tag = "PiModelNotFoundError" as const;
  override readonly cause: unknown;

  constructor(options: PiErrorOptions = {}) {
    super(options.message ?? messageFromCause(options.cause, "PI model was not found"));
    this.name = "PiModelNotFoundError";
    this.cause = options.cause;
  }
}

export class PiAuthError extends Error {
  readonly _tag = "PiAuthError" as const;
  override readonly cause: unknown;

  constructor(options: PiErrorOptions = {}) {
    super(options.message ?? messageFromCause(options.cause, "PI authentication failed"));
    this.name = "PiAuthError";
    this.cause = options.cause;
  }
}

export class PiSettingsPersistenceError extends Error {
  readonly _tag = "PiSettingsPersistenceError" as const;
  override readonly cause: unknown;

  constructor(options: PiErrorOptions = {}) {
    super(options.message ?? messageFromCause(options.cause, "PI settings persistence failed"));
    this.name = "PiSettingsPersistenceError";
    this.cause = options.cause;
  }
}

export type PiSessionError =
  | PiSessionCreateError
  | PiPromptError
  | PiPromptRejectedError
  | PiSessionAbortedError
  | PiEventStreamError
  | PiModelNotFoundError
  | PiAuthError
  | PiSettingsPersistenceError
  | PiUnknownError;

export const normalizeSessionCreateError = (cause: unknown): PiSessionCreateError =>
  cause instanceof PiSessionCreateError ? cause : new PiSessionCreateError({ cause });

export const normalizePromptError = (cause: unknown): PiPromptError | PiPromptRejectedError | PiSessionAbortedError => {
  if (cause instanceof PiPromptError || cause instanceof PiPromptRejectedError || cause instanceof PiSessionAbortedError) {
    return cause;
  }
  return new PiPromptError({ cause });
};

export const normalizeUnknownError = (cause: unknown): PiUnknownError =>
  cause instanceof PiUnknownError ? cause : new PiUnknownError({ cause });
