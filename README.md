# pi-effect

Effect-native adapter around the public [`@earendil-works/pi-coding-agent`](https://www.npmjs.com/package/@earendil-works/pi-coding-agent) SDK.

Licensed under the [MIT License](./LICENSE).

`pi-effect` is intentionally PI SDK-shaped: it re-exports the PI SDK names downstream apps already know, then adds thin Effect companions such as `createAgentSessionEffect`, `AgentSessionEffect`, `defineToolEffect`, `SettingsManagerEffect`, and `ModelRegistryEffect`. The wrappers preserve PI objects and result shapes instead of introducing a parallel session/tool/model abstraction.

## Boundary policy

`pi-effect` is a compatibility and Effect-semantics boundary, not a second PI SDK. It earns its place when it centralizes PI SDK upgrade risk, preserves a downstream dependency boundary, or adds Effect resource, interruption, stream, Promise-boundary, typed-error, or compatibility-test semantics around public PI APIs.

Keep downstream product policy out of this package. App-specific choices such as credential storage, resource discovery restrictions, workflow/node execution policy, UI diagnostics, and local filesystem permissions belong in the downstream app. `pi-effect` should make public PI APIs safer and more idiomatic to call from Effect programs while keeping PI's own objects, method names, events, and result shapes visible.

Prefer facade exports for direct PI SDK names that downstream apps need, and add Effect-native wrappers only when repeated downstream boilerplate or real boundary semantics justify them. If a proposed wrapper mostly renames PI concepts, hides useful PI details, lacks compatibility coverage, or starts changing for one downstream app's policy, keep it out of `pi-effect`.

## Current status

Supported PI SDK version under test: `@earendil-works/pi-coding-agent@0.78.0`.

Implemented:

- scoped session creation with `createAgentSessionEffect(...)`, preserving PI's `CreateAgentSessionResult`
- prompt execution through `AgentSessionEffect.prompt(...)`, with PI preflight rejection mapped to `AgentSessionPromptRejectedError` and Effect interruption wired to `session.abort()`
- session event streams through `AgentSessionEffect.events(...)` / `AgentSessionEventStream.fromSession(...)`
- Effect handler adapter for PI `defineTool(...)` via `defineToolEffect(...)`
- settings `flush()` helper through `SettingsManagerEffect.flush(...)`, failing on recorded persistence errors
- model lookup helper through `ModelRegistryEffect.find(...)`, with typed missing-model errors
- auth lookup, required-key, login, and write helpers through `AuthStorageEffect`, preserving PI shapes while failing on typed auth/storage boundary errors
- conservative typed wrapper errors with original causes preserved
- fake session fixtures for unit tests
- compatibility tests for the pinned adapter-relevant PI SDK surface
- opt-in real-agent smoke tests for live wrapper wiring
- facade exports for the public PI SDK APIs downstream apps may import directly
- a downstream import-surface sentinel covering the upstream PI SDK exports downstream apps may use directly

Not implemented yet:

- resource-loader helpers
- broader Effect-native PI SDK wrappers outside the current adapter contract
- deeper PI error classification beyond conservative wrapper errors

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

Prerequisites: Node `>=22.19.0`, Bun, and the [Gitleaks CLI](https://github.com/gitleaks/gitleaks) for local secret scans. On macOS, install Gitleaks with:

```bash
brew install gitleaks
```

Then run the local validation pass:

```bash
bun install
bun run validate
```

`bun run validate` typechecks, runs the default test suite, builds the package, and scans repository history plus the working tree with Gitleaks. Use `bun run secrets:staged` before commits to scan only staged changes.

Default tests never require credentials or live provider access.

### Opt-in real-agent smoke test

Run the credential-dependent smoke test only when you explicitly want a live model call:

```bash
PI_EFFECT_REAL_AGENT=1 \
PI_EFFECT_PROVIDER=openai \
PI_EFFECT_MODEL=gpt-4.1-mini \
OPENAI_API_KEY=... \
bun run test:real-agent
```

Supported environment variables:

- `PI_EFFECT_REAL_AGENT=1` enables the suite; without it, every real-agent test is skipped.
- `PI_EFFECT_PROVIDER` selects the PI provider name. Defaults to `openai`.
- `PI_EFFECT_MODEL` selects the model ID. Defaults to `gpt-4.1-mini`.
- Provider credentials use the normal PI SDK environment variables, such as `OPENAI_API_KEY` for `openai`.
- `PI_EFFECT_AGENT_DIR=/path/to/.pi/agent` reuses an existing PI agent directory for OAuth/subscription credentials and custom `models.json`.

Do not paste API keys into chat, commits, issues, or fixtures. The API-key path uses provider environment variables and temporary session state. The OAuth/subscription path reads local credentials from `PI_EFFECT_AGENT_DIR`. The smoke test makes real network requests and may incur provider cost, so prefer cheap, fast models.

## Compatibility strategy

`pi-effect` does not try to exhaustively test or wrap the full PI SDK. The default suite is deep for the adapter contract and shallow for broader SDK packaging signals. Wrapper expansion rules live in [`WRAPPING_RULES.md`](./WRAPPING_RULES.md).

Currently supported adapter surface:

- `createAgentSession(...)` and the `AgentSession` members used here: `sessionId`, `prompt`, `abort`, `subscribe`, `dispose`, and custom tool lookup
- `defineTool(...)` / `ToolDefinition` for Effect-backed custom tools
- `SettingsManager.flush()` / `drainErrors()` for settings durability boundaries
- `ModelRegistry.find(...)` for typed model lookup
- `AuthStorage.getApiKey(...)`, `login(...)`, `set(...)`, `remove(...)`, `reload()`, and `drainErrors()` for typed auth and credential-persistence boundaries. Write helpers surface PI-recorded persistence errors while preserving PI's non-transactional in-memory state semantics.
- public session events consumed through `AgentSession.subscribe(...)`

The suite also has a shallow downstream import-surface sentinel for upstream SDK availability, plus a `pi-effect` facade compatibility test for the direct downstream imports: `AuthStorage`, `AuthStorageBackend`, `ModelRegistry`, `ResourceLoader`, `SessionManager`, `SettingsManager`, `createAgentSession`, `createExtensionRuntime`, built-in tool-definition factories, file operation interfaces, `defineTool`, `ToolDefinition`, `AgentToolResult`, `AgentSessionEvent`, `SessionEntry`, and `AuthCredential`.

Known outside the supported surface: the package currently advertises `@earendil-works/pi-coding-agent/hooks`, but that subpath is not importable in `0.78.0`; the compatibility suite documents that as an upstream packaging signal, not a `pi-effect` contract.

The compatibility suite should remain focused on public `@earendil-works/pi-coding-agent` behavior. Avoid depending on PI private internals unless a test pins the public behavior that motivated the wrapper contract.
