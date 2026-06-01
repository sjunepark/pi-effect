import {
  defineTool,
  type AgentToolResult,
  type AgentToolUpdateCallback,
  type ExtensionContext,
  type ToolDefinition,
} from "@earendil-works/pi-coding-agent";
import { Effect, Either } from "effect";
import type { Static, TSchema } from "typebox";
import { PiToolExecutionError } from "./PiToolError.js";

export interface PiToolHandlerContext<TParams extends TSchema, TDetails> {
  readonly toolCallId: string;
  readonly params: Static<TParams>;
  readonly signal: AbortSignal | undefined;
  readonly onUpdate: AgentToolUpdateCallback<TDetails> | undefined;
  readonly piContext: ExtensionContext;
}

export type PiToolHandler<TParams extends TSchema, TDetails, E = never> = (
  context: PiToolHandlerContext<TParams, TDetails>,
) => Effect.Effect<AgentToolResult<TDetails>, E>;

export type PiToolConfig<TParams extends TSchema, TDetails, TState = unknown> = Omit<
  ToolDefinition<TParams, TDetails, TState>,
  "execute"
>;

/**
 * Convert an Effect handler into a public PI `defineTool(...)` definition.
 *
 * Handler failures are rejected as `PiToolExecutionError`; PI's agent loop then
 * turns that rejection into an error tool-result message and `isError: true`.
 */
export const make = <TParams extends TSchema, TDetails = unknown, TState = unknown, E = never>(
  config: PiToolConfig<TParams, TDetails, TState>,
  handler: PiToolHandler<TParams, TDetails, E>,
): ToolDefinition<TParams, TDetails, TState> =>
  defineTool<TParams, TDetails, TState>({
    ...config,
    execute: (toolCallId, params, signal, onUpdate, piContext) => {
      const effect = handler({ toolCallId, params, signal, onUpdate, piContext }).pipe(
        Effect.mapError((cause) => new PiToolExecutionError({ cause })),
        Effect.either,
      );
      return Effect.runPromise(effect, { signal }).then((result) => {
        if (Either.isLeft(result)) throw result.left;
        return result.right;
      });
    },
  });

export const PiTool = {
  make,
} as const;
