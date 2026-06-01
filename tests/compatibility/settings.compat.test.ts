import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SettingsManager } from "@earendil-works/pi-coding-agent";
import { Effect, Either } from "effect";
import { SettingsManagerEffect, SettingsManagerPersistenceError } from "../../src/index.js";

describe("PI SettingsManager compatibility", () => {
  it("surfaces flush and drainErrors as a durability boundary", async () => {
    const settingsManager = SettingsManager.inMemory({ compaction: { enabled: false } });

    settingsManager.setCompactionEnabled(true);
    await Effect.runPromise(SettingsManagerEffect.flush(settingsManager));

    expect(settingsManager.getCompactionEnabled()).toBe(true);
    expect(settingsManager.drainErrors()).toEqual([]);
  });

  it("turns file-backed SettingsManager write errors into SettingsManagerPersistenceError", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "pi-effect-settings-"));
    const blockedAgentDir = join(tempDir, "agent-dir-is-a-file");
    writeFileSync(blockedAgentDir, "not a directory");
    const settingsManager = SettingsManager.create(tempDir, blockedAgentDir);

    try {
      settingsManager.setTheme("compat-theme");
      const result = await Effect.runPromise(SettingsManagerEffect.flush(settingsManager).pipe(Effect.either));

      expect(Either.isLeft(result)).toBe(true);
      if (Either.isLeft(result)) {
        expect(result.left).toBeInstanceOf(SettingsManagerPersistenceError);
        expect(result.left.cause).toEqual([
          {
            scope: "global",
            error: expect.objectContaining({ message: expect.stringContaining("settings.json") }),
          },
        ]);
      }
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("turns public SettingsManager write errors into SettingsManagerPersistenceError", async () => {
    const cause = new Error("storage unavailable");
    const settingsManager = SettingsManager.fromStorage({
      withLock: (_scope, update) => {
        const next = update(undefined);
        if (next !== undefined) throw cause;
      },
    });

    settingsManager.setTheme("compat-theme");
    const result = await Effect.runPromise(SettingsManagerEffect.flush(settingsManager).pipe(Effect.either));

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left).toBeInstanceOf(SettingsManagerPersistenceError);
      expect(result.left.cause).toEqual([{ scope: "global", error: cause }]);
    }
  });
});
