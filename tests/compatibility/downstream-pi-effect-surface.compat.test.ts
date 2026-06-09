import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  AgentSessionEffect,
  AgentSessionEventStream,
  AgentSessionEventStreamError,
  AgentSessionPromptError,
  AgentSessionPromptRejectedError,
  AuthStorageApiKeyNotFoundError,
  AuthStorageEffect,
  AuthStorageEffectError,
  createAgentSessionEffect,
  createAgentSessionEffectFrom,
  CreateAgentSessionError,
  defineToolEffect,
  FakeAgentSession,
  fakeAgentSessionFactory,
  ModelRegistryEffect,
  ModelRegistryModelNotFoundError,
  SettingsManagerEffect,
  SettingsManagerPersistenceError,
  ToolEffectDefectError,
  ToolEffectExecutionError,
  ToolEffectInterruptedError,
  UnknownPiSdkError,
} from "../../src/index.js";
import type {
  AgentSessionFactoryResult,
  AgentSessionLike,
  AgentSessionRequestStreamOptions,
  AgentSessionRequestStreamOptionsContext,
  AuthStorageLike,
  CreateAgentSessionEffectOptions,
  DefineToolEffectConfig,
  DefineToolEffectHandler,
  FakeAgentSessionOptions,
  ModelRegistryLike,
  SettingsManagerLike,
} from "../../src/index.js";

// @ts-expect-error The root entry intentionally hides raw PI SDK facade types. Use ../../src/raw.js.
import type { AgentSession } from "../../src/index.js";
// @ts-expect-error The root entry intentionally hides raw PI SDK facade types. Use ../../src/raw.js.
import type { AgentSessionEvent } from "../../src/index.js";
// @ts-expect-error The root entry intentionally hides raw PI SDK facade types. Use ../../src/raw.js.
import type { AgentSessionEventListener } from "../../src/index.js";
// @ts-expect-error The root entry intentionally hides raw PI SDK facade types. Use ../../src/raw.js.
import type { AgentToolResult } from "../../src/index.js";
// @ts-expect-error The root entry intentionally hides raw PI SDK facade types. Use ../../src/raw.js.
import type { AuthCredential } from "../../src/index.js";
// @ts-expect-error The root entry intentionally hides raw PI SDK facade types. Use ../../src/raw.js.
import type { AuthStorageBackend } from "../../src/index.js";
// @ts-expect-error The root entry intentionally hides raw PI SDK facade types. Use ../../src/raw.js.
import type { BashOperations } from "../../src/index.js";
// @ts-expect-error The root entry intentionally hides raw PI SDK facade types. Use ../../src/raw.js.
import type { BashSpawnContext } from "../../src/index.js";
// @ts-expect-error The root entry intentionally hides raw PI SDK facade types. Use ../../src/raw.js.
import type { BashSpawnHook } from "../../src/index.js";
// @ts-expect-error The root entry intentionally hides raw PI SDK facade types. Use ../../src/raw.js.
import type { CreateAgentSessionOptions } from "../../src/index.js";
// @ts-expect-error The root entry intentionally hides raw PI SDK facade types. Use ../../src/raw.js.
import type { CreateAgentSessionResult } from "../../src/index.js";
// @ts-expect-error The root entry intentionally hides raw PI SDK facade types. Use ../../src/raw.js.
import type { EditOperations } from "../../src/index.js";
// @ts-expect-error The root entry intentionally hides raw PI SDK facade types. Use ../../src/raw.js.
import type { FindOperations } from "../../src/index.js";
// @ts-expect-error The root entry intentionally hides raw PI SDK facade types. Use ../../src/raw.js.
import type { GrepOperations } from "../../src/index.js";
// @ts-expect-error The root entry intentionally hides raw PI SDK facade types. Use ../../src/raw.js.
import type { LsOperations } from "../../src/index.js";
// @ts-expect-error The root entry intentionally hides raw PI SDK facade types. Use ../../src/raw.js.
import type { PromptOptions } from "../../src/index.js";
// @ts-expect-error The root entry intentionally hides raw PI SDK facade types. Use ../../src/raw.js.
import type { ReadOperations } from "../../src/index.js";
// @ts-expect-error The root entry intentionally hides raw PI SDK facade types. Use ../../src/raw.js.
import type { ResourceLoader } from "../../src/index.js";
// @ts-expect-error The root entry intentionally hides raw PI SDK facade types. Use ../../src/raw.js.
import type { SessionEntry } from "../../src/index.js";
// @ts-expect-error The root entry intentionally hides raw PI SDK facade types. Use ../../src/raw.js.
import type { ToolDefinition } from "../../src/index.js";
// @ts-expect-error The root entry intentionally hides raw PI SDK facade types. Use ../../src/raw.js.
import type { WriteOperations } from "../../src/index.js";

const rootEffectRuntimeExports = {
  AgentSessionEffect,
  AgentSessionEventStream,
  AgentSessionEventStreamError,
  AgentSessionPromptError,
  AgentSessionPromptRejectedError,
  AuthStorageApiKeyNotFoundError,
  AuthStorageEffect,
  AuthStorageEffectError,
  createAgentSessionEffect,
  createAgentSessionEffectFrom,
  CreateAgentSessionError,
  defineToolEffect,
  FakeAgentSession,
  fakeAgentSessionFactory,
  ModelRegistryEffect,
  ModelRegistryModelNotFoundError,
  SettingsManagerEffect,
  SettingsManagerPersistenceError,
  ToolEffectDefectError,
  ToolEffectExecutionError,
  ToolEffectInterruptedError,
  UnknownPiSdkError,
};

const rawFacadeRuntimeExports = [
  "AgentSession",
  "AuthStorage",
  "ModelRegistry",
  "SessionManager",
  "SettingsManager",
  "VERSION",
  "createAgentSession",
  "createBashToolDefinition",
  "createEditToolDefinition",
  "createExtensionRuntime",
  "createFindToolDefinition",
  "createGrepToolDefinition",
  "createLsToolDefinition",
  "createReadToolDefinition",
  "createWriteToolDefinition",
  "defineTool",
] as const;

describe("pi-effect root Effect surface", () => {
  it("exposes Effect wrappers, wrapper errors, and testing helpers", () => {
    for (const [exportName, exportedValue] of Object.entries(rootEffectRuntimeExports)) {
      expect(exportedValue, exportName).toBeDefined();
    }

    const session = new FakeAgentSession();
    const factory = fakeAgentSessionFactory(session);

    expect(AgentSessionEffect.create).toBe(createAgentSessionEffect);
    expect(AgentSessionEffect.createFrom).toBe(createAgentSessionEffectFrom);
    expect(AgentSessionEventStream.fromSession).toBe(AgentSessionEffect.events);
    expect(factory).toBeTypeOf("function");
  });

  it("does not expose raw PI SDK facade runtime names from the root entry", async () => {
    const root = await import("../../src/index.js");

    for (const exportName of rawFacadeRuntimeExports) {
      expect(root, exportName).not.toHaveProperty(exportName);
    }
  });

  it("does not re-export the raw subpath from the root source", () => {
    const source = readFileSync(new URL("../../src/index.ts", import.meta.url), "utf8");

    expect(source).not.toMatch(/export\s+\*\s+from\s+["']\.\/raw\.js["']/);
  });
});

void (undefined as unknown as AgentSessionFactoryResult | AgentSessionLike | AuthStorageLike);
void (undefined as unknown as AgentSessionRequestStreamOptions | AgentSessionRequestStreamOptionsContext);
void (undefined as unknown as CreateAgentSessionEffectOptions);
void (undefined as unknown as DefineToolEffectConfig<never, never> | DefineToolEffectHandler<never, never>);
void (undefined as unknown as FakeAgentSessionOptions | ModelRegistryLike | SettingsManagerLike);
void (undefined as unknown as AgentSession | AgentSessionEvent | AgentSessionEventListener | AgentToolResult);
void (undefined as unknown as AuthCredential | AuthStorageBackend | BashOperations | BashSpawnContext | BashSpawnHook);
void (undefined as unknown as CreateAgentSessionOptions | CreateAgentSessionResult | PromptOptions | ResourceLoader);
void (undefined as unknown as EditOperations | FindOperations | GrepOperations | LsOperations | ReadOperations | WriteOperations);
void (undefined as unknown as SessionEntry | ToolDefinition);
