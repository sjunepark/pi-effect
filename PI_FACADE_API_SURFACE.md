# PI Facade API Surface

This file tracks the additional `@earendil-works/pi-coding-agent@0.78.0` APIs that `pi-effect` must expose so downstream apps can stop importing the PI SDK directly.

Goal: migrate downstream apps one API area at a time. Raw PI SDK facades should become importable from `pi-effect/raw`, while Effect-native wrappers remain on the root `pi-effect` entry; compatibility tests should prove both surfaces map to the pinned PI SDK behavior.

## Current status

- `pi-effect/raw` is the facade-only import path for the direct downstream imports listed below.
- The root `pi-effect` entry intentionally omits raw PI SDK facade exports; it is for Effect wrappers, wrapper errors, structural wrapper types, and testing helpers.
- Compatibility coverage: `tests/compatibility/downstream-raw-surface.compat.test.ts` exercises downstream-style imports from `src/raw.ts`, `tests/compatibility/downstream-pi-effect-surface.compat.test.ts` verifies raw facade names stay out of the root Effect entry, and `tests/compatibility/raw-subpath.compat.test.ts` checks that `src/raw.ts` does not import Effect wrapper modules.
- Remaining work is downstream migration: change downstream imports from `@earendil-works/pi-coding-agent` to `pi-effect/raw` one area at a time, then keep this checklist current.

## Current direct downstream imports

### Session creation and lifecycle

- `createAgentSession`
- `type AgentSessionEvent`
- `type SessionEntry`

Downstream usage exercises the full session creation options shape, including:

- `cwd`
- `agentDir`
- `authStorage`
- `modelRegistry`
- `resourceLoader`
- `settingsManager`
- `sessionManager`
- `customTools`
- `tools`
- `noTools`
- `model`
- `thinkingLevel`

Downstream usage also exercises the result shape from `createAgentSession`, especially `session`.

## Managers and storage

### Auth

- `AuthStorage`
- `type AuthStorage`
- `type AuthStorageBackend`
- `type AuthCredential`

Downstream usage relies on:

- `AuthStorage.fromStorage(...)`
- runtime API key overrides via `setRuntimeApiKey(...)`
- credential reads/writes: `get`, `set`, `remove`, `has`
- auth status: `hasAuth`, `getAuthStatus`
- API key lookup: `getApiKey(providerId, { includeFallback })`
- OAuth login: `login(...)`
- error draining: `drainErrors()`

### Models

- `ModelRegistry`

Downstream usage relies on:

- `ModelRegistry.create(authStorage, modelsJsonPath)`
- `modelRegistry.find(provider, modelId)`

### Sessions

- `SessionManager`

Downstream usage currently relies on:

- `SessionManager.inMemory()`

### Settings

- `SettingsManager`
- `type SettingsManager`

Downstream usage currently relies on:

- `SettingsManager.inMemory(settings?)`

## Resource loading and extension runtime

- `createExtensionRuntime`
- `type ResourceLoader`

Downstream usage provides a minimal `ResourceLoader` implementation and uses `createExtensionRuntime()` for an empty extension runtime.

## Tool definitions

### Generic tool API

- `defineTool`
- `type ToolDefinition`
- `type AgentToolResult`

Downstream usage exercises `defineTool(...)` directly for custom tools and to wrap PI builtin tool definitions with app-specific labels, descriptions, snippets, and policy checks.

### Builtin tool-definition factories

- `createBashToolDefinition`
- `createReadToolDefinition`
- `createLsToolDefinition`
- `createFindToolDefinition`
- `createGrepToolDefinition`
- `createEditToolDefinition`
- `createWriteToolDefinition`

### Tool operation types

- `type ReadOperations`
- `type LsOperations`
- `type FindOperations`
- `type GrepOperations`
- `type EditOperations`
- `type WriteOperations`

Likely useful while wrapping bash:

- `type BashOperations`
- `type BashSpawnContext`
- `type BashSpawnHook`

## pi-effect additions

The stable facade is available; add Effect-native helpers where repeated downstream usage proves they reduce boilerplate. Effect helpers should keep PI SDK names and shapes visible rather than introducing a parallel pi-effect vocabulary.

### 1. Raw facade exports — complete

Downstream-needed public PI SDK values and types are exposed from the facade-only `pi-effect/raw` subpath so the dependency boundary is clear. The root `pi-effect` entry does not re-export those raw facades; downstream apps that need direct PI SDK names should import them from `pi-effect/raw`. The model lookup helper lives in `src/model/ModelRegistryEffect.ts`.

### 2. Effect-native convenience wrappers

After direct facade compatibility is covered, add wrappers where repeated downstream boilerplate or real boundary semantics justify them. Current supported helpers:

- model lookup with typed not-found errors
- auth API-key lookup, required-key lookup, login, credential writes, reload, and error draining with typed auth/storage boundary errors

Remaining candidates require explicit justification before implementation:

- static/minimal resource loader creation
- in-memory session/settings manager creation
- built-in tool definition creation with operation injection

### 3. Compatibility tests — complete

Compatibility tests import raw facade APIs from `pi-effect/raw` and Effect wrappers from `pi-effect`, mirroring the intended downstream boundary:

- auth backend + `AuthStorage.fromStorage(...)`
- `AuthStorageEffect.getApiKey(...)`, `requireApiKey(...)`, `login(...)`, and write-error handling
- `ModelRegistry.create(...).find(...)`
- minimal `ResourceLoader` + `createAgentSession(...)`
- `SessionManager.inMemory()` and `SettingsManager.inMemory(...)`
- `defineTool(...)` and `AgentToolResult` shape
- builtin tool factories with custom operation objects

## Migration checklist

For each section:

- [x] Expose from the `pi-effect/raw` facade-only subpath, with raw facades intentionally absent from root `pi-effect`.
- [x] Add or update compatibility tests against the pinned PI SDK.
- [x] Update README usage/status.
- [x] Update this file with migration notes or mark complete.
- [ ] Change downstream imports for that section from `@earendil-works/pi-coding-agent` to `pi-effect/raw`.
