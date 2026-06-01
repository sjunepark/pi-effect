import type { ModelRegistry } from "@earendil-works/pi-coding-agent";
import { Effect } from "effect";
import {
  ModelRegistryModelNotFoundError,
  UnknownPiSdkError,
  normalizeUnknownPiSdkError,
} from "../session/AgentSessionEffectError.js";

/** Model object shape returned by PI SDK `ModelRegistry.find(...)`. */
export type ModelRegistryModel = NonNullable<ReturnType<ModelRegistry["find"]>>;

/** Structural subset of PI SDK `ModelRegistry` used by Effect helpers and tests. */
export interface ModelRegistryLike {
  find(provider: string, modelId: string): ModelRegistryModel | undefined;
}

export type ModelRegistryLookupError = ModelRegistryModelNotFoundError | UnknownPiSdkError;

/**
 * Effect wrapper around PI SDK `ModelRegistry.find(...)`.
 *
 * The successful value is the original PI model object. The wrapper only turns
 * the `undefined` not-found result into a typed Effect failure so callers can
 * handle missing models without losing unexpected lookup causes.
 */
export const find = (
  modelRegistry: ModelRegistryLike | ModelRegistry,
  provider: string,
  modelId: string,
): Effect.Effect<ModelRegistryModel, ModelRegistryLookupError> =>
  Effect.try({
    try: () => {
      const model = modelRegistry.find(provider, modelId);
      if (!model) {
        throw new ModelRegistryModelNotFoundError({
          message: `PI model not found: ${provider}/${modelId}`,
          cause: { provider, modelId },
        });
      }
      return model;
    },
    catch: (cause) =>
      cause instanceof ModelRegistryModelNotFoundError ? cause : normalizeUnknownPiSdkError(cause),
  });

/** Effect helpers grouped by the original PI SDK `ModelRegistry` concept. */
export const ModelRegistryEffect = {
  find,
} as const;
