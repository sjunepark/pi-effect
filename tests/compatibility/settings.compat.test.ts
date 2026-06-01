import { describe, expect, it } from "vitest";
import { SettingsManager } from "@earendil-works/pi-coding-agent";
import { Effect } from "effect";
import { PiSettings } from "../../src/index.js";

describe("PI SettingsManager compatibility", () => {
  it("surfaces flush and drainErrors as a durability boundary", async () => {
    const settingsManager = SettingsManager.inMemory({ compaction: { enabled: false } });

    settingsManager.setCompactionEnabled(true);
    await Effect.runPromise(PiSettings.flush(settingsManager));

    expect(settingsManager.getCompactionEnabled()).toBe(true);
    expect(settingsManager.drainErrors()).toEqual([]);
  });
});
