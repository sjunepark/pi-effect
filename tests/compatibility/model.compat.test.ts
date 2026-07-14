import { describe, expect, it } from "vitest";
import { AuthStorage, ModelRegistry } from "@earendil-works/pi-coding-agent";
import { Effect, Result } from "effect";
import { ModelRegistryEffect, ModelRegistryModelNotFoundError } from "../../src/index.js";

describe("PI ModelRegistry compatibility", () => {
  it("normalizes public ModelRegistry missing-model lookup", async () => {
    const modelRegistry = ModelRegistry.inMemory(AuthStorage.inMemory());

    const result = await Effect.runPromise(
      ModelRegistryEffect.find(modelRegistry, "pi-effect-missing-provider", "missing-model").pipe(Effect.result),
    );

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.failure).toBeInstanceOf(ModelRegistryModelNotFoundError);
      expect(result.failure.cause).toEqual({
        provider: "pi-effect-missing-provider",
        modelId: "missing-model",
      });
    }
  });
});
