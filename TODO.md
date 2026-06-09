# TODO

## Near-term tickets

- [x] Add a PI SDK-shaped per-request stream-options hook for session-local provider state.
  - Added `requestStreamOptions` to `createAgentSessionEffect` / `AgentSessionEffect.create` so callers can derive extra stream options from `{ model, context, options }` without mutating `session.agent.streamFn` downstream.
  - The hook wraps PI's existing session stream function, preserving normal auth lookup, attribution/header merging, retry/timeout settings, and global `model.api` provider dispatch.
  - Added compatibility coverage showing a custom API registration remains globally available while two sessions receive isolated request headers/metadata.
  - Validation: `bun run typecheck` passed; `bun run test tests/compatibility/session.compat.test.ts` passed; `bun run test` passed; `bun run build` passed.
