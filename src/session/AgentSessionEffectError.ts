import { Data } from "effect";

const messageFromCause = (cause: unknown, fallback: string): string => {
  if (cause instanceof Error && cause.message.length > 0) return cause.message;
  if (typeof cause === "string" && cause.length > 0) return cause;
  return fallback;
};

interface PiSdkEffectErrorData {
  readonly message: string;
  readonly cause: unknown;
}

/** Options shared by pi-effect errors that normalize PI SDK or Effect boundary failures. */
export interface PiSdkEffectErrorOptions {
  readonly message?: string;
  readonly cause?: unknown;
}

/** Fallback for unexpected failures crossing a PI SDK Effect wrapper boundary. */
export class UnknownPiSdkError extends Data.TaggedError("UnknownPiSdkError")<PiSdkEffectErrorData> {
  constructor(options: PiSdkEffectErrorOptions = {}) {
    super({
      message: options.message ?? messageFromCause(options.cause, "Unknown PI SDK error"),
      cause: options.cause,
    });
  }
}

/** Failure raised when the Effect wrapper around PI SDK `createAgentSession(...)` cannot create a session. */
export class CreateAgentSessionError extends Data.TaggedError(
  "CreateAgentSessionError",
)<PiSdkEffectErrorData> {
  constructor(options: PiSdkEffectErrorOptions = {}) {
    super({
      message: options.message ?? messageFromCause(options.cause, "Failed to create PI session"),
      cause: options.cause,
    });
  }
}

/** Failure raised when PI SDK `AgentSession.prompt(...)` rejects after execution starts. */
export class AgentSessionPromptError extends Data.TaggedError(
  "AgentSessionPromptError",
)<PiSdkEffectErrorData> {
  constructor(options: PiSdkEffectErrorOptions = {}) {
    super({
      message: options.message ?? messageFromCause(options.cause, "PI prompt failed"),
      cause: options.cause,
    });
  }
}

/** Failure raised when PI SDK prompt preflight rejects before provider execution. */
export class AgentSessionPromptRejectedError extends Data.TaggedError(
  "AgentSessionPromptRejectedError",
)<PiSdkEffectErrorData> {
  constructor(options: PiSdkEffectErrorOptions = {}) {
    super({
      message: options.message ?? messageFromCause(options.cause, "PI prompt was rejected before execution"),
      cause: options.cause,
    });
  }
}

/** Failure raised while converting `AgentSession.subscribe(...)` events into an Effect Stream. */
export class AgentSessionEventStreamError extends Data.TaggedError(
  "AgentSessionEventStreamError",
)<PiSdkEffectErrorData> {
  constructor(options: PiSdkEffectErrorOptions = {}) {
    super({
      message: options.message ?? messageFromCause(options.cause, "PI session event stream failed"),
      cause: options.cause,
    });
  }
}

/** Failure raised when `ModelRegistryEffect.find(...)` cannot find the requested PI model. */
export class ModelRegistryModelNotFoundError extends Data.TaggedError(
  "ModelRegistryModelNotFoundError",
)<PiSdkEffectErrorData> {
  constructor(options: PiSdkEffectErrorOptions = {}) {
    super({
      message: options.message ?? messageFromCause(options.cause, "PI model was not found"),
      cause: options.cause,
    });
  }
}

/** Reserved typed auth boundary for future Effect wrappers around PI SDK AuthStorage behavior. */
export class AuthStorageEffectError extends Data.TaggedError("AuthStorageEffectError")<PiSdkEffectErrorData> {
  constructor(options: PiSdkEffectErrorOptions = {}) {
    super({
      message: options.message ?? messageFromCause(options.cause, "PI authentication failed"),
      cause: options.cause,
    });
  }
}

/** Failure raised when PI SDK `SettingsManager.flush()` or recorded persistence errors fail durability. */
export class SettingsManagerPersistenceError extends Data.TaggedError(
  "SettingsManagerPersistenceError",
)<PiSdkEffectErrorData> {
  constructor(options: PiSdkEffectErrorOptions = {}) {
    super({
      message: options.message ?? messageFromCause(options.cause, "PI settings persistence failed"),
      cause: options.cause,
    });
  }
}

/** Union of stable pi-effect errors for current PI SDK Effect wrapper boundaries. */
export type PiSdkEffectError =
  | CreateAgentSessionError
  | AgentSessionPromptError
  | AgentSessionPromptRejectedError
  | AgentSessionEventStreamError
  | ModelRegistryModelNotFoundError
  | AuthStorageEffectError
  | SettingsManagerPersistenceError
  | UnknownPiSdkError;

export const normalizeCreateAgentSessionError = (cause: unknown): CreateAgentSessionError =>
  cause instanceof CreateAgentSessionError ? cause : new CreateAgentSessionError({ cause });

export const normalizeAgentSessionPromptError = (
  cause: unknown,
): AgentSessionPromptError | AgentSessionPromptRejectedError => {
  if (cause instanceof AgentSessionPromptError || cause instanceof AgentSessionPromptRejectedError) {
    return cause;
  }
  return new AgentSessionPromptError({ cause });
};

export const normalizeUnknownPiSdkError = (cause: unknown): UnknownPiSdkError =>
  cause instanceof UnknownPiSdkError ? cause : new UnknownPiSdkError({ cause });
