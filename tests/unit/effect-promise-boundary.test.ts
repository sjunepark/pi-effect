import { describe, expect, it } from "vitest";
import { Effect, Runtime } from "effect";
import { runEffectAsPromise } from "../../src/effect/EffectPromiseBoundary.js";

class BoundaryFailure extends Error {
  readonly _tag = "BoundaryFailure" as const;
  override readonly cause: unknown;

  constructor(cause: unknown) {
    super("boundary failure");
    this.cause = cause;
  }
}

class BoundaryDefect extends Error {
  readonly _tag = "BoundaryDefect" as const;
  override readonly cause: unknown;

  constructor(cause: unknown) {
    super("boundary defect");
    this.cause = cause;
  }
}

class BoundaryInterrupted extends Error {
  readonly _tag = "BoundaryInterrupted" as const;
  override readonly cause: Runtime.FiberFailure;

  constructor(cause: Runtime.FiberFailure) {
    super("boundary interrupted");
    this.cause = cause;
  }
}

const runBoundary = <A, E>(effect: Effect.Effect<A, E>, signal?: AbortSignal): Promise<A> =>
  runEffectAsPromise(effect, {
    signal,
    mapError: (cause) => new BoundaryFailure(cause),
    mapDefect: (cause) => new BoundaryDefect(cause),
    mapInterrupted: (cause) => new BoundaryInterrupted(cause),
  });

describe("Effect Promise boundary", () => {
  it("returns successful Effect values through the Promise boundary", async () => {
    await expect(runBoundary(Effect.succeed("ok"))).resolves.toBe("ok");
  });

  it("maps Effect failures without remapping them as Promise defects", async () => {
    await expect(runBoundary(Effect.fail("boom"))).rejects.toMatchObject({
      _tag: "BoundaryFailure",
      cause: "boom",
    } satisfies Partial<BoundaryFailure>);
  });

  it("maps Effect defects and synchronous throws as boundary defects", async () => {
    const defect = new Error("defect");
    const thrown = new Error("thrown");

    await expect(runBoundary(Effect.die(defect))).rejects.toMatchObject({
      _tag: "BoundaryDefect",
      cause: defect,
    } satisfies Partial<BoundaryDefect>);
    await expect(
      runBoundary(
        Effect.suspend(() => {
          throw thrown;
        }),
      ),
    ).rejects.toMatchObject({
      _tag: "BoundaryDefect",
      cause: thrown,
    } satisfies Partial<BoundaryDefect>);
  });

  it("maps AbortSignal interruption at the Promise rejection boundary", async () => {
    const controller = new AbortController();
    const execution = runBoundary(Effect.never, controller.signal);

    controller.abort();

    await expect(execution).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(BoundaryInterrupted);
      expect(Runtime.isFiberFailure((error as BoundaryInterrupted).cause)).toBe(true);
      return true;
    });
  });
});
