# Creo PI API Surface

This file tracks the additional `@earendil-works/pi-coding-agent@0.78.0` APIs that `pi-effect` must expose so Creo can stop importing the PI SDK directly.

Goal: migrate Creo one API area at a time. Each section should become importable from `pi-effect` with compatibility tests proving it maps to the pinned PI SDK behavior.

## Current status

- `pi-effect` now exposes facade exports for the direct Creo imports listed below.
- Compatibility coverage: `tests/compatibility/creo-pi-effect-surface.compat.test.ts` imports those APIs from `pi-effect` only and exercises representative manager, session, custom-tool, and builtin-tool behavior against the pinned PI SDK.
- Remaining work is downstream migration: change Creo imports from `@earendil-works/pi-coding-agent` to `pi-effect` one area at a time, then keep this checklist current.

## Current direct Creo imports

### Session creation and lifecycle

- `createAgentSession`
- `type AgentSessionEvent`
- `type SessionEntry`

Creo uses the full session creation options shape, including:

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

Creo also uses the result shape from `createAgentSession`, especially `session`.

## Managers and storage

### Auth

- `AuthStorage`
- `type AuthStorage`
- `type AuthStorageBackend`
- `type AuthCredential`

Creo relies on:

- `AuthStorage.fromStorage(...)`
- runtime API key overrides via `setRuntimeApiKey(...)`
- credential reads/writes: `get`, `set`, `remove`, `has`
- auth status: `hasAuth`, `getAuthStatus`
- API key lookup: `getApiKey(providerId, { includeFallback })`
- OAuth login: `login(...)`
- error draining: `drainErrors()`

### Models

- `ModelRegistry`

Creo relies on:

- `ModelRegistry.create(authStorage, modelsJsonPath)`
- `modelRegistry.find(provider, modelId)`

### Sessions

- `SessionManager`

Creo currently relies on:

- `SessionManager.inMemory()`

### Settings

- `SettingsManager`
- `type SettingsManager`

Creo currently relies on:

- `SettingsManager.inMemory(settings?)`

## Resource loading and extension runtime

- `createExtensionRuntime`
- `type ResourceLoader`

Creo provides a minimal `ResourceLoader` implementation and uses `createExtensionRuntime()` for an empty extension runtime.

## Tool definitions

### Generic tool API

- `defineTool`
- `type ToolDefinition`
- `type AgentToolResult`

Creo uses `defineTool(...)` directly for custom tools and to wrap PI builtin tool definitions with Creo-specific labels, descriptions, snippets, and policy checks.

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

The stable facade is available; add Effect-native helpers later where repeated Creo usage proves they reduce boilerplate.

### 1. SDK facade exports — complete

Creo-needed public PI SDK values and types are exposed from the `pi-effect` root so the dependency boundary is clear. The model lookup helper lives in `src/model/PiModelRegistry.ts`.

### 2. Effect-native convenience wrappers

After direct facade compatibility is covered, add wrappers where they reduce Creo-owned boilerplate:

- auth storage creation from a custom backend
- model lookup with typed not-found errors
- static/minimal resource loader creation
- in-memory session/settings manager creation
- built-in tool definition creation with operation injection

### 3. Compatibility tests — complete

Compatibility tests import only from `pi-effect` and mirror Creo usage:

- auth backend + `AuthStorage.fromStorage(...)`
- `ModelRegistry.create(...).find(...)`
- minimal `ResourceLoader` + `createAgentSession(...)`
- `SessionManager.inMemory()` and `SettingsManager.inMemory(...)`
- `defineTool(...)` and `AgentToolResult` shape
- builtin tool factories with custom operation objects

## Migration checklist

For each section:

- [x] Expose from `pi-effect` root or documented submodule.
- [x] Add or update compatibility tests against the pinned PI SDK.
- [x] Update README usage/status.
- [x] Update this file with migration notes or mark complete.
- [ ] Change Creo imports for that section from `@earendil-works/pi-coding-agent` to `pi-effect`.
