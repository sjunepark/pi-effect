import { Effect, Either } from "effect";
import { describe, expect, it, vi } from "vitest";
import {
  ModelRegistryEffect,
  ModelRegistryModelNotFoundError,
  UnknownPiSdkError,
  type ModelRegistryModel,
} from "../../src/index.js";

const model = {
  id: "unit-model",
  name: "Unit Model",
  api: "openai-completions",
  provider: "unit-provider",
  baseUrl: "https://example.invalid/v1",
  reasoning: false,
  input: ["text"],
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  contextWindow: 4096,
  maxTokens: 1024,
} satisfies ModelRegistryModel;

describe("ModelRegistryEffect", () => {
  it("returns found models", async () => {
    const registry = { find: vi.fn(() => model) };

    await expect(Effect.runPromise(ModelRegistryEffect.find(registry, "unit-provider", "unit-model"))).resolves.toBe(
      model,
    );
    expect(registry.find).toHaveBeenCalledWith("unit-provider", "unit-model");
  });

  it("normalizes missing models to ModelRegistryModelNotFoundError", async () => {
    const registry = { find: vi.fn(() => undefined) };

    const result = await Effect.runPromise(ModelRegistryEffect.find(registry, "missing", "model").pipe(Effect.either));

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left).toBeInstanceOf(ModelRegistryModelNotFoundError);
      expect(result.left.cause).toEqual({ provider: "missing", modelId: "model" });
    }
  });

  it("preserves unexpected lookup causes through UnknownPiSdkError", async () => {
    const cause = new Error("registry failed");
    const registry = {
      find: vi.fn(() => {
        throw cause;
      }),
    };

    const result = await Effect.runPromise(ModelRegistryEffect.find(registry, "unit", "model").pipe(Effect.either));

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left).toBeInstanceOf(UnknownPiSdkError);
      expect(result.left.cause).toBe(cause);
    }
  });
});
