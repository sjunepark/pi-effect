import type {
  AgentSession,
  AgentSessionEvent,
  AgentSessionEventListener,
  CreateAgentSessionResult,
  PromptOptions,
} from "@earendil-works/pi-coding-agent";
import { events } from "./AgentSessionEventStream.js";
import { prompt } from "./AgentSessionPromptEffect.js";
import { createAgentSessionEffect, createAgentSessionEffectFrom } from "./createAgentSessionEffect.js";

/**
 * Minimal structural subset of PI SDK `AgentSession` used by pi-effect helpers.
 *
 * Production callers normally pass the real PI SDK `AgentSession`. The structural
 * shape keeps tests and downstream fakes aligned with the same PI method names
 * instead of introducing a parallel session model.
 */
export interface AgentSessionLike {
  readonly sessionId?: string;
  prompt(text: string, options?: PromptOptions): Promise<void>;
  abort(): Promise<void>;
  subscribe(listener: AgentSessionEventListener): () => void;
  dispose(): void;
}

/** A PI session-creation result, narrowed only enough to allow fake sessions in tests. */
export type AgentSessionFactoryResult<Session extends AgentSessionLike = AgentSession> = Omit<
  CreateAgentSessionResult,
  "session"
> & {
  readonly session: Session;
};

/** Factory shape accepted by `createAgentSessionEffectFrom(...)` for tests and dependency injection. */
export type CreateAgentSessionEffectFactory<
  Session extends AgentSessionLike = AgentSession,
  Result extends { readonly session: Session } = AgentSessionFactoryResult<Session>,
> = () => PromiseLike<Result>;

export type { AgentSession, AgentSessionEvent, AgentSessionEventListener, PromptOptions };

/**
 * Effect helpers grouped by the original PI SDK `AgentSession` concept.
 *
 * Use these when you want PI's session model and method names with Effect
 * resource, error, interruption, and Stream semantics layered on top.
 */
export const AgentSessionEffect = {
  create: createAgentSessionEffect,
  createFrom: createAgentSessionEffectFrom,
  prompt,
  events,
} as const;
