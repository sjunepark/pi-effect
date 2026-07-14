import { describe, expect, it } from "vitest";
import { Cause, Effect } from "effect";
import { isInterruptedCause } from "../../src/effect/EffectRuntimeFailure.js";

const runAndCaptureCause = async (effect: Effect.Effect<unknown, unknown>): Promise<Cause.Cause<unknown>> => {
  const exit = await Effect.runPromiseExit(effect);
  if (exit._tag === "Failure") return exit.cause;
  throw new Error("Expected Effect.runPromiseExit to fail");
};

describe("Effect cause classification", () => {
  it("recognizes Effect causes that are only interruption", async () => {
    const controller = new AbortController();
    const exit = Effect.runPromiseExit(Effect.never, { signal: controller.signal });

    controller.abort();

    const result = await exit;
    expect(result._tag).toBe("Failure");
    if (result._tag === "Failure") {
      expect(isInterruptedCause(result.cause)).toBe(true);
    }
  });

  it("does not treat Effect failures or defects as interruption", async () => {
    const failure = await runAndCaptureCause(Effect.fail("boom"));
    const defect = await runAndCaptureCause(Effect.die(new Error("defect")));

    expect(isInterruptedCause(failure)).toBe(false);
    expect(isInterruptedCause(defect)).toBe(false);
  });

  it("does not treat non-Cause values as interruption", () => {
    expect(isInterruptedCause(new Error("plain error"))).toBe(false);
    expect(isInterruptedCause("boom")).toBe(false);
  });
});
