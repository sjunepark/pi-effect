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
    try: () => modelRegistry.find(provider, modelId),
    catch: normalizeUnknownPiSdkError,
  }).pipe(
    Effect.flatMap((model) =>
      model === undefined
        ? Effect.fail(
            new ModelRegistryModelNotFoundError({
              message: `PI model not found: ${provider}/${modelId}`,
              cause: { provider, modelId },
            }),
          )
        : Effect.succeed(model),
    ),
  );

/** Effect helpers grouped by the original PI SDK `ModelRegistry` concept. */
export const ModelRegistryEffect = {
  find,
} as const;
