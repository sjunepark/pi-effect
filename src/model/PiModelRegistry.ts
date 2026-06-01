import type { ModelRegistry } from "@earendil-works/pi-coding-agent";
import { Effect } from "effect";
import { PiModelNotFoundError, PiUnknownError, normalizeUnknownError } from "../session/PiSessionError.js";

export type PiModel = NonNullable<ReturnType<ModelRegistry["find"]>>;

export interface PiModelRegistryLike {
  find(provider: string, modelId: string): PiModel | undefined;
}

export type PiModelLookupError = PiModelNotFoundError | PiUnknownError;

/** Look up a PI model and normalize the missing-model case into a typed Effect failure. */
export const find = (
  modelRegistry: PiModelRegistryLike | ModelRegistry,
  provider: string,
  modelId: string,
): Effect.Effect<PiModel, PiModelLookupError> =>
  Effect.try({
    try: () => {
      const model = modelRegistry.find(provider, modelId);
      if (!model) {
        throw new PiModelNotFoundError({
          message: `PI model not found: ${provider}/${modelId}`,
          cause: { provider, modelId },
        });
      }
      return model;
    },
    catch: (cause) => (cause instanceof PiModelNotFoundError ? cause : normalizeUnknownError(cause)),
  });

export const PiModelRegistry = {
  find,
} as const;
