import { Effect, Result } from "effect";
import { describe, expect, it } from "vitest";
import {
  SettingsManagerEffect,
  SettingsManagerPersistenceError,
  type SettingsManagerLike,
} from "../../src/index.js";

describe("SettingsManagerEffect", () => {
  it("flushes and succeeds when PI recorded no settings errors", async () => {
    let flushed = false;
    const manager: SettingsManagerLike = {
      async flush() {
        flushed = true;
      },
      drainErrors: () => [],
    };

    await Effect.runPromise(SettingsManagerEffect.flush(manager));

    expect(flushed).toBe(true);
  });

  it("turns drained PI settings write errors into SettingsManagerPersistenceError", async () => {
    const cause = new Error("disk full");
    const manager: SettingsManagerLike = {
      async flush() {},
      drainErrors: () => [{ scope: "global", error: cause }],
    };

    const result = await Effect.runPromise(SettingsManagerEffect.flush(manager).pipe(Effect.result));

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.failure).toBeInstanceOf(SettingsManagerPersistenceError);
      expect(result.failure.cause).toEqual([{ scope: "global", error: cause }]);
    }
  });
});
