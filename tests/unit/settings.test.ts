import { describe, expect, it } from "vitest";
import { Effect, Either } from "effect";
import { PiSettings, PiSettingsPersistenceError, type PiSettingsManagerLike } from "../../src/index.js";

describe("PiSettings", () => {
  it("flushes and succeeds when PI recorded no settings errors", async () => {
    let flushed = false;
    const manager: PiSettingsManagerLike = {
      async flush() {
        flushed = true;
      },
      drainErrors: () => [],
    };

    await Effect.runPromise(PiSettings.flush(manager));

    expect(flushed).toBe(true);
  });

  it("turns drained PI settings write errors into PiSettingsPersistenceError", async () => {
    const cause = new Error("disk full");
    const manager: PiSettingsManagerLike = {
      async flush() {},
      drainErrors: () => [{ scope: "global", error: cause }],
    };

    const result = await Effect.runPromise(PiSettings.flush(manager).pipe(Effect.either));

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left).toBeInstanceOf(PiSettingsPersistenceError);
      expect(result.left.cause).toEqual([{ scope: "global", error: cause }]);
    }
  });
});
