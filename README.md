# pi-effect

Effect-native adapter around the public [`@earendil-works/pi-coding-agent`](https://www.npmjs.com/package/@earendil-works/pi-coding-agent) SDK.

`pi-effect` is intentionally PI SDK-shaped: it re-exports the PI SDK names downstream apps already know, then adds thin Effect companions such as `createAgentSessionEffect`, `AgentSessionEffect`, `defineToolEffect`, `SettingsManagerEffect`, and `ModelRegistryEffect`. The wrappers preserve PI objects and result shapes instead of introducing a parallel session/tool/model abstraction.

## Current status

Supported PI SDK version under test: `@earendil-works/pi-coding-agent@0.78.0`.

Implemented:

- scoped session creation with `createAgentSessionEffect(...)`, preserving PI's `CreateAgentSessionResult`
- prompt execution through `AgentSessionEffect.prompt(...)`, with PI preflight rejection mapped to `AgentSessionPromptRejectedError` and Effect interruption wired to `session.abort()`
- session event streams through `AgentSessionEffect.events(...)` / `AgentSessionEventStream.fromSession(...)`
- Effect handler adapter for PI `defineTool(...)` via `defineToolEffect(...)`
- settings `flush()` helper through `SettingsManagerEffect.flush(...)`, failing on recorded persistence errors
- model lookup helper through `ModelRegistryEffect.find(...)`, with typed missing-model errors
- conservative typed wrapper errors with original causes preserved
- fake session fixtures for unit tests
- compatibility tests for the pinned adapter-relevant PI SDK surface
- facade exports for the public PI SDK APIs Creo currently imports directly
- a Creo import-surface sentinel covering the upstream PI SDK exports Creo currently uses directly

Not implemented yet:

- auth/resource-loader helpers
- broader Effect-native PI SDK wrappers outside the current adapter contract
- deeper PI error classification beyond conservative wrapper errors
- real-model integration tests

## Usage

```ts
import { Effect } from "effect";
import { AgentSessionEffect } from "pi-effect";

const program = Effect.scoped(
  Effect.gen(function* () {
    const { session } = yield* AgentSessionEffect.create({ noTools: "all" });
    yield* AgentSessionEffect.prompt(session, "List the files in this project");
  }),
);

await Effect.runPromise(program);
```

`AgentSessionEffect.prompt` is Effect-native: fiber interruption remains Effect interruption, and the wrapper uses `Effect.onInterrupt` to call `session.abort()` for PI cleanup.

### Event streams

```ts
import { Stream } from "effect";
import { AgentSessionEffect } from "pi-effect";

const events = AgentSessionEffect.events(session).pipe(Stream.take(10));
```

### Tools

```ts
import { Effect } from "effect";
import { Type } from "typebox";
import { defineToolEffect } from "pi-effect";

const echoTool = defineToolEffect(
  {
    name: "echo",
    label: "Echo",
    description: "Echoes input",
    parameters: Type.Object({ input: Type.String() }),
  },
  ({ params }) =>
    Effect.succeed({
      content: [{ type: "text", text: params.input }],
      details: { echoed: params.input },
    }),
);
```

Effect failures from tool handlers are rejected as `ToolEffectExecutionError`; defects are rejected as `ToolEffectDefectError`; abort-signal interruption is rejected as `ToolEffectInterruptedError` with the original Effect `FiberFailure` preserved as `cause`. PI's agent loop converts rejected tool executions into error tool-result messages.

## Development

```bash
bun install
bun run typecheck
bun run test
bun run build
```

## Compatibility strategy

`pi-effect` does not try to exhaustively test or wrap the full PI SDK. The default suite is deep for the adapter contract and shallow for broader SDK packaging signals. Wrapper expansion rules live in [`WRAPPING_RULES.md`](./WRAPPING_RULES.md).

Currently supported adapter surface:

- `createAgentSession(...)` and the `AgentSession` members used here: `sessionId`, `prompt`, `abort`, `subscribe`, `dispose`, and custom tool lookup
- `defineTool(...)` / `ToolDefinition` for Effect-backed custom tools
- `SettingsManager.flush()` / `drainErrors()` for settings durability boundaries
- `ModelRegistry.find(...)` for typed model lookup
- public session events consumed through `AgentSession.subscribe(...)`

The suite also has a shallow Creo import-surface sentinel for upstream SDK availability, plus a `pi-effect` facade compatibility test for the direct Creo imports: `AuthStorage`, `AuthStorageBackend`, `ModelRegistry`, `ResourceLoader`, `SessionManager`, `SettingsManager`, `createAgentSession`, `createExtensionRuntime`, built-in tool-definition factories, file operation interfaces, `defineTool`, `ToolDefinition`, `AgentToolResult`, `AgentSessionEvent`, `SessionEntry`, and `AuthCredential`.

Known outside the supported surface: the package currently advertises `@earendil-works/pi-coding-agent/hooks`, but that subpath is not importable in `0.78.0`; the compatibility suite documents that as an upstream packaging signal, not a `pi-effect` contract.

The compatibility suite should remain focused on public `@earendil-works/pi-coding-agent` behavior. Avoid depending on PI private internals unless a test pins the public behavior that motivated the wrapper contract.
