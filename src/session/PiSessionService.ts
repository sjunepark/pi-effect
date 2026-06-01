import { createAgentSession, type CreateAgentSessionOptions } from "@earendil-works/pi-coding-agent";
import { Effect, Scope } from "effect";
import type { PiSessionLike, PiSdkSession } from "./PiSession.js";
import { PiSessionCreateError, normalizeSessionCreateError } from "./PiSessionError.js";

export interface PiSessionAcquireResult<Session extends PiSessionLike = PiSdkSession> {
  readonly session: Session;
}

export type PiSessionFactory<Session extends PiSessionLike = PiSdkSession> = () => PromiseLike<
  PiSessionAcquireResult<Session>
>;

const releaseSession = (session: PiSessionLike): Effect.Effect<void> =>
  Effect.sync(() => {
    try {
      session.dispose();
    } catch {
      // Scope finalizers must not mask the original use-site exit.
    }
  });

/**
 * Acquire a PI session from an injected factory as a scoped Effect resource.
 *
 * This helper is public for compatibility tests and downstream fakes; production
 * callers should normally use `acquire` so the public PI SDK creates the session.
 */
export const acquireFrom = <Session extends PiSessionLike>(
  factory: PiSessionFactory<Session>,
): Effect.Effect<Session, PiSessionCreateError, Scope.Scope> =>
  Effect.acquireRelease(
    Effect.tryPromise({
      try: async () => (await factory()).session,
      catch: normalizeSessionCreateError,
    }),
    releaseSession,
  );

/** Acquire a public PI SDK AgentSession as a scoped Effect resource. */
export const acquire = (
  options?: CreateAgentSessionOptions,
): Effect.Effect<PiSdkSession, PiSessionCreateError, Scope.Scope> => acquireFrom(() => createAgentSession(options));

export const PiSessionService = {
  acquire,
  acquireFrom,
} as const;
