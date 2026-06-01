import { describe, expect, it } from "vitest";
import { Effect } from "effect";
import { isInterruptedFiberFailure } from "../../src/effect/EffectRuntimeFailure.js";

const runAndCaptureRejection = async (effect: Effect.Effect<unknown, unknown>): Promise<unknown> => {
  try {
    await Effect.runPromise(effect);
  } catch (error) {
    return error;
  }
  throw new Error("Expected Effect.runPromise to reject");
};

describe("Effect runtime failure classification", () => {
  it("recognizes Effect runtime rejections that are only interruption", async () => {
    const controller = new AbortController();
    const rejection = Effect.runPromise(Effect.never, { signal: controller.signal }).catch((error) => error);

    controller.abort();

    expect(isInterruptedFiberFailure(await rejection)).toBe(true);
  });

  it("does not treat Effect failures or defects as interruption", async () => {
    const failure = await runAndCaptureRejection(Effect.fail("boom"));
    const defect = await runAndCaptureRejection(Effect.die(new Error("defect")));

    expect(isInterruptedFiberFailure(failure)).toBe(false);
    expect(isInterruptedFiberFailure(defect)).toBe(false);
  });

  it("does not treat non-Effect rejections as interruption", () => {
    expect(isInterruptedFiberFailure(new Error("plain error"))).toBe(false);
    expect(isInterruptedFiberFailure("boom")).toBe(false);
  });
});
