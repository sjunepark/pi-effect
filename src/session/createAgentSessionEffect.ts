import {
  createAgentSession,
  type CreateAgentSessionOptions,
  type CreateAgentSessionResult,
} from "@earendil-works/pi-coding-agent";
import { Effect, Scope } from "effect";
import type { AgentSessionLike, CreateAgentSessionEffectFactory } from "./AgentSessionEffect.js";
import { CreateAgentSessionError, normalizeCreateAgentSessionError } from "./AgentSessionEffectError.js";

const releaseSession = (session: AgentSessionLike): Effect.Effect<void> =>
  Effect.sync(() => {
    try {
      session.dispose();
    } catch {
      // Scope finalizers must not mask the original use-site exit.
    }
  });

/**
 * Effect wrapper around PI SDK `createAgentSession(...)`.
 *
 * The success value preserves PI's original `CreateAgentSessionResult` shape,
 * including `session`, `extensionsResult`, and any model fallback message. The
 * Effect scope only owns lifecycle: when the scope closes, `session.dispose()` is
 * called exactly once.
 */
export const createAgentSessionEffect = (
  options?: CreateAgentSessionOptions,
): Effect.Effect<CreateAgentSessionResult, CreateAgentSessionError, Scope.Scope> =>
  createAgentSessionEffectFrom(() => createAgentSession(options));

/**
 * Dependency-injected variant of `createAgentSessionEffect(...)`.
 *
 * Use this when tests or downstream adapters already have a PI-compatible session
 * factory. The result shape is otherwise left untouched so callers do not have to
 * learn a pi-effect-specific session wrapper.
 */
export const createAgentSessionEffectFrom = <
  Session extends AgentSessionLike,
  Result extends { readonly session: Session },
>(
  factory: CreateAgentSessionEffectFactory<Session, Result>,
): Effect.Effect<Result, CreateAgentSessionError, Scope.Scope> =>
  Effect.acquireRelease(
    Effect.tryPromise({
      try: async () => await factory(),
      catch: normalizeCreateAgentSessionError,
    }),
    (result) => releaseSession(result.session),
  );
