# TODO

## Near-term tickets

- [ ] Track Effect v4 beta releases and replace the exact beta pin once v4 is stable.
  - The adapter currently targets `effect@4.0.0-beta.98`; beta-to-beta API changes require an explicit upgrade and the full compatibility suite.

- [x] Add a PI SDK-shaped per-request stream-options hook for session-local provider state.
  - Added `requestStreamOptions` to `createAgentSessionEffect` / `AgentSessionEffect.create` so callers can derive extra stream options from `{ model, context, options }` without mutating `session.agent.streamFn` downstream.
  - The hook wraps PI's existing session stream function, preserving normal auth lookup, attribution/header merging, retry/timeout settings, and global `model.api` provider dispatch.
  - Added compatibility coverage showing a custom API registration remains globally available while two sessions receive isolated request headers/metadata.
  - Validation: `bun run typecheck` passed; `bun run test tests/compatibility/session.compat.test.ts` passed; `bun run test` passed; `bun run build` passed.
