import { Effect } from "effect";
import type { PiPromptOptions, PiSessionLike } from "./PiSession.js";
import {
  PiPromptError,
  PiPromptRejectedError,
  PiSessionAbortedError,
  normalizePromptError,
} from "./PiSessionError.js";

export type PiPromptFailure = PiPromptError | PiPromptRejectedError | PiSessionAbortedError;

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
  Effect.tryPromise({
    try: () => session.prompt(input, options),
    catch: normalizePromptError,
  }).pipe(Effect.onInterrupt(() => abortSession(session)));

export const PiPrompt = {
  run,
} as const;
