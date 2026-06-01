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
import { ToolEffectDefectError, ToolEffectExecutionError, ToolEffectInterruptedError } from "./ToolEffectError.js";

/** Context passed to an Effect handler by `defineToolEffect(...)`, matching PI SDK tool execution inputs. */
export interface DefineToolEffectHandlerContext<TParams extends TSchema, TDetails> {
  readonly toolCallId: string;
  readonly params: Static<TParams>;
  readonly signal: AbortSignal | undefined;
  readonly onUpdate: AgentToolUpdateCallback<TDetails> | undefined;
  readonly piContext: ExtensionContext;
}

/** Effect-native handler for a PI SDK `ToolDefinition`. */
export type DefineToolEffectHandler<TParams extends TSchema, TDetails, E = never> = (
  context: DefineToolEffectHandlerContext<TParams, TDetails>,
) => Effect.Effect<AgentToolResult<TDetails>, E>;

/** PI SDK `ToolDefinition` configuration without `execute`, supplied by the Effect wrapper. */
export type DefineToolEffectConfig<TParams extends TSchema, TDetails, TState = unknown> = Omit<
  ToolDefinition<TParams, TDetails, TState>,
  "execute"
>;

/**
 * Effect-backed companion to PI SDK `defineTool(...)`.
 *
 * The returned value is a normal PI `ToolDefinition`; only the implementation of
 * `execute(...)` is adapted from Effect to PI's Promise contract. Handler
 * failures, defects, and abort-signal interruption are mapped to stable errors
 * while preserving the original cause for diagnostics.
 */
export const defineToolEffect = <TParams extends TSchema, TDetails = unknown, TState = unknown, E = never>(
  config: DefineToolEffectConfig<TParams, TDetails, TState>,
  handler: DefineToolEffectHandler<TParams, TDetails, E>,
): ToolDefinition<TParams, TDetails, TState> =>
  defineTool<TParams, TDetails, TState>({
    ...config,
    execute: (toolCallId, params, signal, onUpdate, piContext) => {
      const effect = Effect.suspend(() => handler({ toolCallId, params, signal, onUpdate, piContext }));
      return runEffectAsPromise(effect, {
        signal,
        mapError: (cause) => new ToolEffectExecutionError({ cause }),
        mapDefect: (cause) => new ToolEffectDefectError({ cause }),
        mapInterrupted: (cause) => new ToolEffectInterruptedError({ cause }),
      });
    },
  });
