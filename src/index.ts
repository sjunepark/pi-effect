export {
  AgentSession,
  AuthStorage,
  ModelRegistry,
  SessionManager,
  SettingsManager,
  VERSION,
  createAgentSession,
  createBashToolDefinition,
  createEditToolDefinition,
  createExtensionRuntime,
  createFindToolDefinition,
  createGrepToolDefinition,
  createLsToolDefinition,
  createReadToolDefinition,
  createWriteToolDefinition,
  defineTool,
} from "@earendil-works/pi-coding-agent";
export type {
  AgentSessionEvent,
  AgentSessionEventListener,
  AgentToolResult,
  AuthCredential,
  AuthStorageBackend,
  BashOperations,
  BashSpawnContext,
  BashSpawnHook,
  CreateAgentSessionOptions,
  CreateAgentSessionResult,
  EditOperations,
  FindOperations,
  GrepOperations,
  LsOperations,
  PromptOptions,
  ReadOperations,
  ResourceLoader,
  SessionEntry,
  ToolDefinition,
  WriteOperations,
} from "@earendil-works/pi-coding-agent";

export { AgentSessionEffect } from "./session/AgentSessionEffect.js";
export type {
  AgentSessionFactoryResult,
  AgentSessionLike,
  CreateAgentSessionEffectFactory,
} from "./session/AgentSessionEffect.js";
export {
  AgentSessionEventStreamError,
  AgentSessionPromptError,
  AgentSessionPromptRejectedError,
  AuthStorageApiKeyNotFoundError,
  AuthStorageEffectError,
  CreateAgentSessionError,
  ModelRegistryModelNotFoundError,
  UnknownPiSdkError,
  SettingsManagerPersistenceError,
} from "./session/AgentSessionEffectError.js";
export type { PiSdkEffectError, PiSdkEffectErrorOptions } from "./session/AgentSessionEffectError.js";
export { createAgentSessionEffect, createAgentSessionEffectFrom } from "./session/createAgentSessionEffect.js";
export type { AgentSessionPromptFailure } from "./session/AgentSessionPromptEffect.js";
export { AgentSessionEventStream } from "./session/AgentSessionEventStream.js";
export type { AgentSessionEventStreamOptions } from "./session/AgentSessionEventStream.js";
export { AuthStorageEffect } from "./auth/AuthStorageEffect.js";
export type {
  AuthStorageApiKeyLookupError,
  AuthStorageGetApiKeyOptions,
  AuthStorageLike,
  AuthStorageLoginCallbacks,
  AuthStorageLoginError,
  AuthStorageLoginProviderId,
  AuthStorageRequiredApiKeyError,
  AuthStorageWriteError,
} from "./auth/AuthStorageEffect.js";
export { defineToolEffect } from "./tools/defineToolEffect.js";
export type {
  DefineToolEffectConfig,
  DefineToolEffectHandler,
  DefineToolEffectHandlerContext,
} from "./tools/defineToolEffect.js";
export { ToolEffectDefectError, ToolEffectExecutionError, ToolEffectInterruptedError } from "./tools/ToolEffectError.js";
export type { ToolEffectError, ToolEffectErrorOptions } from "./tools/ToolEffectError.js";
export { SettingsManagerEffect } from "./settings/SettingsManagerEffect.js";
export type {
  SettingsManagerFlushError,
  SettingsManagerLike,
  SettingsManagerRecordedError,
} from "./settings/SettingsManagerEffect.js";
export { ModelRegistryEffect } from "./model/ModelRegistryEffect.js";
export type { ModelRegistryLike, ModelRegistryLookupError, ModelRegistryModel } from "./model/ModelRegistryEffect.js";
export { FakeAgentSession, fakeAgentSessionFactory } from "./testing/FakeAgentSession.js";
export type { FakeAgentSessionOptions } from "./testing/FakeAgentSession.js";
