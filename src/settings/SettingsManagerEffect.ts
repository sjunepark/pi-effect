import type { SettingsManager } from "@earendil-works/pi-coding-agent";
import { Effect } from "effect";
import { SettingsManagerPersistenceError } from "../session/AgentSessionEffectError.js";

/** Error record shape returned by PI SDK `SettingsManager.drainErrors()`. */
export interface SettingsManagerRecordedError {
  readonly scope: "global" | "project";
  readonly error: Error;
}

/** Structural subset of PI SDK `SettingsManager` used by Effect helpers and tests. */
export interface SettingsManagerLike {
  flush(): Promise<void>;
  drainErrors(): SettingsManagerRecordedError[];
}

export type SettingsManagerFlushError = SettingsManagerPersistenceError;

const formatSettingsErrors = (errors: readonly SettingsManagerRecordedError[]): string =>
  errors.map((entry) => `${entry.scope}: ${entry.error.message}`).join("; ");

/**
 * Effect wrapper around PI SDK `SettingsManager.flush()` plus `drainErrors()`.
 *
 * PI records some asynchronous persistence failures for later draining. This
 * helper treats those recorded errors as part of the flush durability boundary
 * and preserves the drained records as the typed error cause.
 */
export const flush = (
  settingsManager: SettingsManagerLike | SettingsManager,
): Effect.Effect<void, SettingsManagerFlushError> =>
  Effect.tryPromise({
    try: async () => {
      await settingsManager.flush();
      const errors = settingsManager.drainErrors();
      if (errors.length > 0) {
        throw new SettingsManagerPersistenceError({
          message: `PI settings persistence failed: ${formatSettingsErrors(errors)}`,
          cause: errors,
        });
      }
    },
    catch: (cause) =>
      cause instanceof SettingsManagerPersistenceError ? cause : new SettingsManagerPersistenceError({ cause }),
  });

/** Effect wrapper around PI SDK `SettingsManager.drainErrors()` without failing on recorded errors. */
export const drainErrors = (
  settingsManager: SettingsManagerLike | SettingsManager,
): Effect.Effect<SettingsManagerRecordedError[]> => Effect.sync(() => settingsManager.drainErrors());

/** Effect helpers grouped by the original PI SDK `SettingsManager` concept. */
export const SettingsManagerEffect = {
  flush,
  drainErrors,
} as const;
