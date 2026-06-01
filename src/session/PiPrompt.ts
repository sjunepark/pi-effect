import { Effect } from "effect";
import type { PiPromptOptions, PiSessionLike } from "./PiSession.js";
import {
  PiPromptError,
  PiPromptRejectedError,
  PiSessionAbortedError,
  normalizePromptError,
} from "./PiSessionError.js";

export type PiPromptFailure = PiPromptError | PiPromptRejectedError | PiSessionAbortedError;

const withPreflightRejectionTracking = (
  options: PiPromptOptions | undefined,
  reject: () => void,
): PiPromptOptions => ({
  ...options,
  preflightResult: (success) => {
    if (!success) reject();
    options?.preflightResult?.(success);
  },
});

const abortSession = (session: PiSessionLike): Effect.Effect<void> =>
  Effect.tryPromise({
    try: () => session.abort(),
    catch: () => undefined,
  }).pipe(Effect.catchAll(() => Effect.void));

/** Run a PI prompt and abort the underlying PI session if the Effect fiber is interrupted. */
export const run = (
  session: PiSessionLike,
  input: string,
  options?: PiPromptOptions,
): Effect.Effect<void, PiPromptFailure> =>
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
        if (rejected) throw new PiPromptRejectedError();
      },
      catch: (cause) => {
        if (!rejected) return normalizePromptError(cause);
        return cause instanceof PiPromptRejectedError ? cause : new PiPromptRejectedError({ cause });
      },
    });
  }).pipe(Effect.onInterrupt(() => abortSession(session)));

export const PiPrompt = {
  run,
} as const;
