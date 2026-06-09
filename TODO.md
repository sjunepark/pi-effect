# TODO

## Near-term tickets

- [ ] Add a PI SDK-shaped per-request stream-options hook for session-local provider state.
  - Downstream apps that register global custom APIs currently have to wrap `session.agent.streamFn` to add request-local metadata/headers before PI resolves `model.api` through the process-global provider registry.
  - Provide a public `createAgentSession` / `AgentSessionEffect.create` option that can derive `SimpleStreamOptions` from `{ model, context, options }` without bypassing PI's normal provider dispatch or requiring direct `@earendil-works/pi-agent-core` / `@earendil-works/pi-ai` wrappers.
  - Avoid requiring downstream mutation of `session.agent.streamFn`, and preserve existing auth/header attribution behavior.
  - Add compatibility coverage proving custom provider registrations remain global while request metadata/headers are isolated per session/request.
