import {
  defineTool,
  type AgentToolResult,
  type AgentToolUpdateCallback,
  type ExtensionContext,
  type ToolDefinition,
} from "@earendil-works/pi-coding-agent";
import { Effect } from "effect";
import type { Static, TSchema } from "typebox";
import { runEffectAsPromise } from "../effect/EffectPromiseBoundary.js";
import { PiToolDefectError, PiToolExecutionError, PiToolInterruptedError } from "./PiToolError.js";

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
 * Abort-signal interruption is classified separately while preserving Effect's
 * original `FiberFailure` as the error cause for low-level diagnostics.
 */
export const make = <TParams extends TSchema, TDetails = unknown, TState = unknown, E = never>(
  config: PiToolConfig<TParams, TDetails, TState>,
  handler: PiToolHandler<TParams, TDetails, E>,
): ToolDefinition<TParams, TDetails, TState> =>
  defineTool<TParams, TDetails, TState>({
    ...config,
    execute: (toolCallId, params, signal, onUpdate, piContext) => {
      const effect = Effect.suspend(() => handler({ toolCallId, params, signal, onUpdate, piContext }));
      return runEffectAsPromise(effect, {
        signal,
        mapError: (cause) => new PiToolExecutionError({ cause }),
        mapDefect: (cause) => new PiToolDefectError({ cause }),
        mapInterrupted: (cause) => new PiToolInterruptedError({ cause }),
      });
    },
  });

export const PiTool = {
  make,
} as const;
