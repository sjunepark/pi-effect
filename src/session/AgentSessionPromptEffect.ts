import { Effect } from "effect";
import type { AgentSessionLike, PromptOptions } from "./AgentSessionEffect.js";
import {
  AgentSessionPromptError,
  AgentSessionPromptRejectedError,
  normalizeAgentSessionPromptError,
} from "./AgentSessionEffectError.js";

/** Error channel for completed Effect prompt attempts. Fiber interruption remains interruption. */
export type AgentSessionPromptFailure = AgentSessionPromptError | AgentSessionPromptRejectedError;

const withPreflightRejectionTracking = (
  options: PromptOptions | undefined,
  reject: () => void,
): PromptOptions => ({
  ...options,
  preflightResult: (success) => {
    if (!success) reject();
    options?.preflightResult?.(success);
  },
});

const abortSession = (session: AgentSessionLike): Effect.Effect<void> =>
  Effect.tryPromise({
    try: () => session.abort(),
    catch: () => undefined,
  }).pipe(Effect.catchAll(() => Effect.void));

/**
 * Effect wrapper around PI SDK `AgentSession.prompt(...)`.
 *
 * Arguments and behavior intentionally mirror the PI method. The wrapper adds an
 * Effect error channel for prompt failures and uses `Effect.onInterrupt` to call
 * `session.abort()` while preserving Effect interruption semantics.
 */
export const prompt = (
  session: AgentSessionLike,
  input: string,
  options?: PromptOptions,
): Effect.Effect<void, AgentSessionPromptFailure> =>
  Effect.suspend(() => {
    let rejected = false;
    return Effect.tryPromise({
      try: async () => {
        await session.prompt(
          input,
          withPreflightRejectionTracking(options, () => {
            rejected = true;
          }),
        );
        if (rejected) throw new AgentSessionPromptRejectedError();
      },
      catch: (cause) => {
        if (!rejected) return normalizeAgentSessionPromptError(cause);
        return cause instanceof AgentSessionPromptRejectedError ? cause : new AgentSessionPromptRejectedError({ cause });
      },
    });
  }).pipe(Effect.onInterrupt(() => abortSession(session)));
