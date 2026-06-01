import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  AuthStorage,
  ModelRegistry,
  SessionManager,
  SettingsManager,
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
  type AgentSessionEvent,
  type AgentToolResult,
  type AuthCredential,
  type AuthStorageBackend,
  type EditOperations,
  type FindOperations,
  type GrepOperations,
  type LsOperations,
  type ReadOperations,
  type ResourceLoader,
  type SessionEntry,
  type ToolDefinition,
  type WriteOperations,
} from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

const creoRuntimeExports = [
  "AuthStorage",
  "ModelRegistry",
  "SessionManager",
  "SettingsManager",
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

describe("Creo PI SDK import-surface compatibility", () => {
  it("keeps every Creo-used root runtime export importable from the pinned SDK", async () => {
    const sdk = await import("@earendil-works/pi-coding-agent");

    for (const exportName of creoRuntimeExports) {
      expect(sdk[exportName]).toBeDefined();
    }
  });

  it("supports Creo-style protected AuthStorage backends and ModelRegistry lookup", async () => {
    let storedPayload: string | undefined;
    const applyLockResult = <T>(lockResult: { readonly result: T; readonly next?: string }) => {
      if ("next" in lockResult) storedPayload = lockResult.next;
      return lockResult.result;
    };
    const backend: AuthStorageBackend = {
      withLock: (fn) => applyLockResult(fn(storedPayload)),
      withLockAsync: async (fn) => applyLockResult(await fn(storedPayload)),
    };

    const authStorage = AuthStorage.fromStorage(backend);
    const credential: AuthCredential = { type: "api_key", key: "sk-creo-test" };
    authStorage.set("openai", credential);

    expect(authStorage.has("openai")).toBe(true);
    await expect(authStorage.getApiKey("openai", { includeFallback: false })).resolves.toBe("sk-creo-test");
    expect(authStorage.drainErrors()).toEqual([]);

    const agentDir = mkdtempSync(join(tmpdir(), "pi-effect-creo-"));
    try {
      const modelRegistry = ModelRegistry.create(authStorage, join(agentDir, "models.json"));
      expect(modelRegistry.find("openai", "gpt-5")).toBeDefined();
    } finally {
      rmSync(agentDir, { recursive: true, force: true });
    }
  });

  it("accepts Creo's minimal ResourceLoader and createAgentSession options", async () => {
    const resourceLoader: ResourceLoader = {
      getExtensions: () => ({ extensions: [], errors: [], runtime: createExtensionRuntime() }),
      getSkills: () => ({ skills: [], diagnostics: [] }),
      getPrompts: () => ({ prompts: [], diagnostics: [] }),
      getThemes: () => ({ themes: [], diagnostics: [] }),
      getAgentsFiles: () => ({ agentsFiles: [] }),
      getSystemPrompt: () => "You are a compatibility test agent.",
      getAppendSystemPrompt: () => [],
      extendResources: () => undefined,
      reload: async () => undefined,
    };
    const customTool = defineTool({
      name: "creo_echo",
      label: "Creo Echo",
      description: "Echoes text for Creo compatibility tests",
      parameters: Type.Object({ text: Type.String() }),
      execute: async (_toolCallId, params): Promise<AgentToolResult<{ readonly text: string }>> => ({
        content: [{ type: "text", text: params.text }],
        details: { text: params.text },
      }),
    });

    const agentDir = mkdtempSync(join(tmpdir(), "pi-effect-creo-session-"));
    const result = await createAgentSession({
      cwd: process.cwd(),
      agentDir,
      resourceLoader,
      sessionManager: SessionManager.inMemory(),
      settingsManager: SettingsManager.inMemory(),
      customTools: [customTool],
      tools: ["creo_echo"],
      noTools: "builtin",
    });

    try {
      type CreoSession = Awaited<ReturnType<typeof createAgentSession>>["session"];
      const session: CreoSession = result.session;
      const entries: SessionEntry[] = SessionManager.inMemory().getEntries();
      const eventSink = (_event: AgentSessionEvent) => undefined;

      expect(session.getToolDefinition("creo_echo")).toBeDefined();
      expect(entries).toEqual([]);
      expect(eventSink).toBeTypeOf("function");
    } finally {
      result.session.dispose();
      rmSync(agentDir, { recursive: true, force: true });
    }
  });

  it("keeps Creo's builtin tool-definition factory and operation contracts type-compatible", async () => {
    const readOperations: ReadOperations = {
      access: async () => undefined,
      readFile: async () => Buffer.from("creo read fixture"),
    };
    const lsOperations: LsOperations = {
      exists: async () => true,
      stat: async () => ({ isDirectory: () => true }),
      readdir: async () => ["file.txt"],
    };
    const findOperations: FindOperations = {
      exists: async () => true,
      glob: async () => ["file.txt"],
    };
    const grepOperations: GrepOperations = {
      isDirectory: async () => true,
      readFile: async () => "needle\n",
    };
    const editOperations: EditOperations = {
      access: async () => undefined,
      readFile: async () => Buffer.from("old"),
      writeFile: async () => undefined,
    };
    const writeOperations: WriteOperations = {
      mkdir: async () => undefined,
      writeFile: async () => undefined,
    };

    const definitions: ToolDefinition[] = [
      defineTool(createReadToolDefinition(process.cwd(), { operations: readOperations })),
      defineTool(createLsToolDefinition(process.cwd(), { operations: lsOperations })),
      defineTool(createFindToolDefinition(process.cwd(), { operations: findOperations })),
      defineTool(createGrepToolDefinition(process.cwd(), { operations: grepOperations })),
      defineTool(createEditToolDefinition(process.cwd(), { operations: editOperations })),
      defineTool(createWriteToolDefinition(process.cwd(), { operations: writeOperations })),
      defineTool(
        createBashToolDefinition(process.cwd(), {
          spawnHook: (context) => ({ ...context, env: { ...context.env, CREO_COMPAT: "1" } }),
        }),
      ),
    ];

    expect(definitions.map((definition) => definition.name)).toEqual([
      "read",
      "ls",
      "find",
      "grep",
      "edit",
      "write",
      "bash",
    ]);

    await expect(
      definitions[0]?.execute("call-1", { path: "README.md" }, undefined, undefined, {} as never),
    ).resolves.toMatchObject({
      content: [{ type: "text", text: "creo read fixture" }],
    });
  });
});
