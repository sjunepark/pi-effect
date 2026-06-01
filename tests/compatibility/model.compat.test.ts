import { describe, expect, it } from "vitest";
import { AuthStorage, ModelRegistry } from "@earendil-works/pi-coding-agent";
import { Effect, Either } from "effect";
import { PiModelRegistry, PiModelNotFoundError } from "../../src/index.js";

describe("PI ModelRegistry compatibility", () => {
  it("normalizes public ModelRegistry missing-model lookup", async () => {
    const modelRegistry = ModelRegistry.inMemory(AuthStorage.inMemory());

    const result = await Effect.runPromise(
      PiModelRegistry.find(modelRegistry, "pi-effect-missing-provider", "missing-model").pipe(Effect.either),
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left).toBeInstanceOf(PiModelNotFoundError);
      expect(result.left.cause).toEqual({
        provider: "pi-effect-missing-provider",
        modelId: "missing-model",
      });
    }
  });
});
