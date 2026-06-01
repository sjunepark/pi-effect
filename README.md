# pi-effect

Effect-native adapter around the public [`@earendil-works/pi-coding-agent`](https://www.npmjs.com/package/@earendil-works/pi-coding-agent) SDK.

The package is intentionally small in the first implementation slice. It wraps PI sessions, prompts, event subscriptions, and custom tools with Effect-friendly lifecycles and typed error boundaries while keeping PI internals out of the public contract.

## Current status

Supported PI SDK version under test: `@earendil-works/pi-coding-agent@0.78.0`.

Implemented:

- scoped session acquisition with `Effect.acquireRelease`
- prompt execution with PI preflight rejection mapped to `PiPromptRejectedError` and Effect interruption wired to `session.abort()`
- session event streams with scoped unsubscribe cleanup
- Effect handler adapter for PI `defineTool(...)`
- settings `flush()` / `drainErrors()` helper that fails on recorded persistence errors
- conservative typed wrapper errors with original causes preserved
- fake session fixtures for unit tests
- compatibility tests for the pinned adapter-relevant PI SDK surface
- a Creo import-surface sentinel covering the PI SDK exports Creo currently uses directly

Not implemented yet:

- model/auth/resource-loader helpers
- broader PI SDK wrappers outside the current adapter contract
- deeper PI error classification beyond conservative wrapper errors
- real-model integration tests

## Usage

```ts
import { Effect } from "effect";
import { PiPrompt, PiSessionService } from "pi-effect";

const program = Effect.scoped(
  Effect.gen(function* () {
    const session = yield* PiSessionService.acquire({ noTools: "all" });
    yield* PiPrompt.run(session, "List the files in this project");
  }),
);

await Effect.runPromise(program);
```

`PiPrompt.run` is Effect-native: fiber interruption remains Effect interruption, and the wrapper uses `Effect.onInterrupt` to call `session.abort()` for PI cleanup.

### Event streams

```ts
import { Stream } from "effect";
import { PiEventStream } from "pi-effect";

const events = PiEventStream.fromSession(session).pipe(Stream.take(10));
```

### Tools

```ts
import { Effect } from "effect";
import { Type } from "typebox";
import { PiTool } from "pi-effect";

const echoTool = PiTool.make(
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

Effect failures from tool handlers are rejected as `PiToolExecutionError`; defects are rejected as `PiToolDefectError`; abort-signal interruption is rejected as `PiToolInterruptedError` with the original Effect `FiberFailure` preserved as `cause`. PI's agent loop converts rejected tool executions into error tool-result messages.

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
- public session events consumed through `AgentSession.subscribe(...)`

The suite also has a shallow Creo import-surface sentinel for direct SDK use that is not fully wrapped by `pi-effect` yet: `AuthStorage`, `AuthStorageBackend`, `ModelRegistry`, `ResourceLoader`, `SessionManager`, `SettingsManager`, `createExtensionRuntime`, built-in tool-definition factories, file operation interfaces, `ToolDefinition`, `AgentToolResult`, `AgentSessionEvent`, `SessionEntry`, and `AuthCredential`.

Known outside the supported surface: the package currently advertises `@earendil-works/pi-coding-agent/hooks`, but that subpath is not importable in `0.78.0`; the compatibility suite documents that as an upstream packaging signal, not a `pi-effect` contract.

The compatibility suite should remain focused on public `@earendil-works/pi-coding-agent` behavior. Avoid depending on PI private internals unless a test pins the public behavior that motivated the wrapper contract.
