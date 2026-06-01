# pi-effect Roadmap

`pi-effect` is a planned Effect-native adapter around the public PI SDK. It should let apps use PI through typed Effect services, scoped lifecycles, interruption-aware prompts, event streams, typed error normalization, and reusable test fixtures without copying adapter code into every project.

This document is the starting point for implementation and upgrade sessions. Use [`WRAPPING_RULES.md`](./WRAPPING_RULES.md) for durable adapter-design rules when expanding the wrapped PI SDK surface.

## Current implementation status

Initial package scaffolding is in place with `@earendil-works/pi-coding-agent@0.78.0`, `effect`, TypeScript, Vitest, and Bun lockfile metadata.

Implemented wrappers:

- `PiSessionService.acquire` / `acquireFrom` for scoped session lifecycle and single `dispose()` release
- `PiPrompt.run` for prompt execution with preflight rejection mapping and Effect interruption wired to `session.abort()`
- `PiEventStream.fromSession` for ordered event forwarding with scoped unsubscribe cleanup
- `PiTool.make` for adapting Effect-returning handlers into PI `defineTool(...)` definitions
- `PiSettings.flush` / `drainErrors` for surfacing PI settings persistence boundaries
- conservative typed errors and fake session testing fixtures

Implemented validation:

- unit tests for session release, prompt success, prompt interruption, event stream cleanup, tool success/failure behavior, and tool abort-signal interruption preserving the original Effect cause
- compatibility tests documenting the pinned PI SDK version, adapter-relevant root exports, public SDK session acquisition, the real `AgentSession` members used by the wrapper, deterministic event forwarding through `PiEventStream`, `PiTool.make` registration as a custom PI tool, `defineTool` execution shape, and public `SettingsManager` write-error draining
- a Creo import-surface sentinel covering the direct PI SDK symbols used by `../creo`: auth storage/backends, model and session managers, resource loaders, session creation options, built-in tool-definition factories, operation interfaces, and tool/session result types
- a packaging sentinel documenting that `@earendil-works/pi-coding-agent/hooks` is advertised by `0.78.0` but not importable, so it remains outside the supported adapter surface

Remaining near-term work should deepen compatibility coverage before broadening API surface, especially real PI preflight rejection behavior, file-backed settings persistence failures using temporary directories, model lookup error normalization, Effect-native wrappers for the Creo-used auth/model/resource-loader surface, and opt-in real-model integration tests.

## Core decision

Wrap `@earendil-works/pi-coding-agent` first.

Creo currently imports PI through `@earendil-works/pi-coding-agent`, and that package exposes the SDK surface we need: `createAgentSession`, `SessionManager`, `ModelRegistry`, `AuthStorage`, `AuthStorageBackend`, `SettingsManager`, `ResourceLoader`, `createExtensionRuntime`, `defineTool`, built-in tool-definition factories and operation interfaces, session events, session entries, prompts, aborts, and session disposal.

Do **not** directly wrap these packages in the first version unless a public `pi-coding-agent` API forces it:

- `@earendil-works/pi-agent-core`
- `@earendil-works/pi-ai`

They are important PI internals/building blocks, but starting with them would enlarge the compatibility surface and make the wrapper more fragile. Treat them as implementation details of `pi-coding-agent` until a real use case requires a narrower adapter.

## Most important principle: compatibility first

The wrapper must track PI SDK behavior with tests. This is essential because PI will keep changing and this package should be updated alongside it.

Do not try to make this repository an exhaustive PI SDK test suite. Keep compatibility coverage deep for the `pi-effect` contract and shallow for broader SDK packaging/import sentinels. Every public wrapper API should have compatibility tests proving how it maps to the current pinned PI version. Prefer tests against the public `@earendil-works/pi-coding-agent` API over assumptions from private internals.

Compatibility tests should cover at least:

- session acquisition and release calls `dispose()` exactly once
- prompt success resolves after `session.prompt(...)` completes
- Effect interruption calls `session.abort()` and cleans subscriptions
- session events are forwarded in order into an Effect `Stream`
- PI prompt/setup failures are normalized into typed wrapper errors
- unknown thrown values become `PiUnknownError`
- tool handlers convert Effect success/failure into PI tool results consistently
- settings manager flush/drain behavior is surfaced where relevant
- model lookup failures are stable and typed

When PI internals are inspected, use that knowledge to design tests and error classifiers, but keep the wrapper contract based on public SDK behavior.

## Package goals

- Provide a small Effect-native API over PI SDK primitives.
- Keep lifecycle and cleanup safe by default through `Scope` / `acquireRelease`.
- Map known PI failures into a stable typed error model.
- Expose PI event subscriptions as Effect streams.
- Adapt Effect-returning tools into PI `defineTool(...)` definitions.
- Centralize logging/tracing around sessions, prompts, tools, model selection, aborts, and failures.
- Let downstream apps mock PI through Effect services without real model calls.
- Keep downstream apps insulated from PI version churn.

## Non-goals

- Do not reimplement PI.
- Do not fork PI internals.
- Do not make PI internals Effect-native.
- Do not add Creo-specific concepts such as workflows, Context Store, node runs, dependency links, or app settings.
- Do not wrap `pi-agent-core` or `pi-ai` directly in v1 unless a concrete public API gap appears.
- Do not classify errors by brittle private message strings unless guarded by compatibility tests and an unknown fallback.

## Proposed package shape

Use a shallow but explicit TypeScript package structure:

```text
pi-effect/
  package.json
  tsconfig.json
  README.md
  ROADMAP.md
  src/
    index.ts
    session/
      PiSession.ts
      PiSessionService.ts
      PiPrompt.ts
      PiEventStream.ts
      PiSessionError.ts
    tools/
      PiTool.ts
      PiToolError.ts
    model/
      PiModel.ts
      PiModelError.ts
    auth/
      PiAuth.ts
      PiAuthError.ts
    resource-loader/
      PiResourceLoader.ts
    testing/
      FakePiSession.ts
      PiSdkCompatibilityHarness.ts
  tests/
    compatibility/
      session.compat.test.ts
      prompt.compat.test.ts
      events.compat.test.ts
      tools.compat.test.ts
      errors.compat.test.ts
    unit/
      error-normalization.test.ts
      tool-adapter.test.ts
```

Keep modules narrow. Each module should wrap one PI concept and export stable wrapper types. Avoid a broad utility folder.

## Public API direction

The first useful API can be small:

```ts
// Acquire a PI session as a scoped Effect resource.
PiSessionService.acquire(options)

// Run a prompt with Effect interruption wired to session.abort().
PiPrompt.run(session, input)

// Convert session.subscribe(...) to Stream<PiSessionEvent, PiEventStreamError>.
PiEventStream.fromSession(session)

// Convert an Effect handler into a PI defineTool(...) definition.
PiTool.make(config, handler)
```

The package should expose PI-compatible escape hatches where necessary, but app code should usually depend on wrapper services rather than raw PI objects.

## Error model direction

Start conservative. Known typed errors are useful, but complete classification is not required on day one.

Initial candidates:

- `PiSessionCreateError`
- `PiPromptError`
- `PiPromptRejectedError`
- `PiModelNotFoundError`
- `PiAuthError`
- `PiToolExecutionError`
- `PiToolDefectError`
- `PiToolInterruptedError`
- `PiSettingsPersistenceError`
- `PiUnknownError`

All unknown throws, rejected promises, and unrecognized event failures should preserve the original cause where possible.

## Implementation phases

### Phase 1: package skeleton and compatibility harness

- Initialize package metadata and TypeScript config.
- Add `@earendil-works/pi-coding-agent`, `effect`, and the test runner.
- Create a minimal fake/stub session where public SDK types allow it.
- Add first compatibility tests for session acquire/release and prompt wrapping.

Exit criteria:

- tests run in CI/local without real model credentials where possible
- compatibility tests document the PI SDK version under test

### Phase 2: scoped sessions and prompts

- Implement `PiSessionService.acquire` with `Effect.acquireRelease`.
- Implement interruption-aware `PiPrompt.run`.
- Normalize create/prompt/abort errors.
- Ensure subscriptions and session disposal are cleaned up on success, failure, and interruption.

Exit criteria:

- interruption test proves `session.abort()` is called
- release test proves `dispose()` is called once

### Phase 3: event streams and observability

- Implement `PiEventStream.fromSession`.
- Preserve PI event ordering.
- Add optional logger/tracer hooks without forcing any app logger.
- Capture useful timing: prompt start/end, first event latency, abort, failure.

Exit criteria:

- tests cover event forwarding, unsubscribe cleanup, and stream interruption

### Phase 4: Effect tool adapter

- Implement `PiTool.make` or equivalent.
- Convert Effect successes into PI tool results.
- Convert typed failures into structured error tool results.
- Preserve PI tool call id, parameters, and result details where possible.

Exit criteria:

- tests cover success, typed failure, defect/throw, and parameter validation behavior

### Phase 5: model/auth/resource-loader helpers

- Add wrappers only for repeated real needs.
- Prefer thin helpers around public `pi-coding-agent` APIs.
- Keep app-specific auth policies outside this package.

Exit criteria:

- Creo or another app can use the helpers without leaking app concepts into `pi-effect`

## Versioning and update policy

- Pin or explicitly range supported `@earendil-works/pi-coding-agent` versions.
- Maintain a compatibility matrix in README once the first version works.
- For every PI upgrade, run the compatibility suite first.
- If PI behavior changes, update tests before changing wrapper code.
- Keep `PiUnknownError` as a permanent safety valve.

## Creo integration guidance

Creo should consume this package through its existing PI adapter boundary, not throughout the app.

Recommended dependency direction:

```text
Creo workflow orchestration
  -> Creo NodeExecutionPort
    -> Creo PI node runner
      -> pi-effect
        -> @earendil-works/pi-coding-agent
```

`pi-effect` should stay generic. Creo should continue to own workflow documents, Context Store behavior, run records, inspection projections, app-private auth policy, and UI copy.

## Next developer task

Deepen the remaining adapter-scope compatibility suite before adding broad wrappers. Prioritize prompt preflight rejection behavior, file-backed settings persistence failures with temporary directories, stable model lookup failures, and an opt-in real-model integration script. Keep model/auth/resource-loader wrappers deferred until a downstream app has repeated real usage.
