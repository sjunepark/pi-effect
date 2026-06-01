import { describe, expect, it } from "vitest";
import { SettingsManager } from "@earendil-works/pi-coding-agent";
import { Effect, Either } from "effect";
import { PiSettings, PiSettingsPersistenceError } from "../../src/index.js";

describe("PI SettingsManager compatibility", () => {
  it("surfaces flush and drainErrors as a durability boundary", async () => {
    const settingsManager = SettingsManager.inMemory({ compaction: { enabled: false } });

    settingsManager.setCompactionEnabled(true);
    await Effect.runPromise(PiSettings.flush(settingsManager));

    expect(settingsManager.getCompactionEnabled()).toBe(true);
    expect(settingsManager.drainErrors()).toEqual([]);
  });

  it("turns public SettingsManager write errors into PiSettingsPersistenceError", async () => {
    const cause = new Error("storage unavailable");
    const settingsManager = SettingsManager.fromStorage({
      withLock: (_scope, update) => {
        const next = update(undefined);
        if (next !== undefined) throw cause;
      },
    });

    settingsManager.setTheme("compat-theme");
    const result = await Effect.runPromise(PiSettings.flush(settingsManager).pipe(Effect.either));

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left).toBeInstanceOf(PiSettingsPersistenceError);
      expect(result.left.cause).toEqual([{ scope: "global", error: cause }]);
    }
  });
});
