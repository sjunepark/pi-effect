import type { SettingsManager } from "@earendil-works/pi-coding-agent";
import { Effect } from "effect";
import { PiSettingsPersistenceError } from "../session/PiSessionError.js";

export interface PiSettingsError {
  readonly scope: "global" | "project";
  readonly error: Error;
}

export interface PiSettingsManagerLike {
  flush(): Promise<void>;
  drainErrors(): PiSettingsError[];
}

export type PiSettingsFlushError = PiSettingsPersistenceError;

const formatSettingsErrors = (errors: readonly PiSettingsError[]): string =>
  errors.map((entry) => `${entry.scope}: ${entry.error.message}`).join("; ");

/** Await PI settings persistence and fail if PI recorded async write errors. */
export const flush = (
  settingsManager: PiSettingsManagerLike | SettingsManager,
): Effect.Effect<void, PiSettingsFlushError> =>
  Effect.tryPromise({
    try: async () => {
      await settingsManager.flush();
      const errors = settingsManager.drainErrors();
      if (errors.length > 0) {
        throw new PiSettingsPersistenceError({
          message: `PI settings persistence failed: ${formatSettingsErrors(errors)}`,
          cause: errors,
        });
      }
    },
    catch: (cause) =>
      cause instanceof PiSettingsPersistenceError ? cause : new PiSettingsPersistenceError({ cause }),
  });

/** Drain PI settings persistence errors without treating them as failures. */
export const drainErrors = (
  settingsManager: PiSettingsManagerLike | SettingsManager,
): Effect.Effect<PiSettingsError[]> => Effect.sync(() => settingsManager.drainErrors());

export const PiSettings = {
  flush,
  drainErrors,
} as const;
