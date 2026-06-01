import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { Type } from "typebox";
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
} from "../../src/index.js";

const createMinimalResourceLoader = (): ResourceLoader => ({
  getExtensions: () => ({ extensions: [], errors: [], runtime: createExtensionRuntime() }),
  getSkills: () => ({ skills: [], diagnostics: [] }),
  getPrompts: () => ({ prompts: [], diagnostics: [] }),
  getThemes: () => ({ themes: [], diagnostics: [] }),
  getAgentsFiles: () => ({ agentsFiles: [] }),
  getSystemPrompt: () => "You are a pi-effect facade compatibility test agent.",
  getAppendSystemPrompt: () => [],
  extendResources: () => undefined,
  reload: async () => undefined,
});

describe("Creo pi-effect API surface compatibility", () => {
  it("exposes manager and storage facade APIs from pi-effect", async () => {
    let storedAuth: string | undefined;
    const backend: AuthStorageBackend = {
      withLock: (fn) => {
        const result = fn(storedAuth);
        storedAuth = result.next ?? storedAuth;
        return result.result;
      },
      withLockAsync: async (fn) => {
        const result = await fn(storedAuth);
        storedAuth = result.next ?? storedAuth;
        return result.result;
      },
    };
    const credential: AuthCredential = { type: "api_key", key: "test-key" };
    const authStorage = AuthStorage.fromStorage(backend);

    authStorage.set("openai", credential);
    expect(authStorage.get("openai")).toEqual(credential);

    const modelRegistry = ModelRegistry.inMemory(AuthStorage.inMemory());
    expect(modelRegistry.find("openai", "gpt-5")).toBeDefined();

    const entries: SessionEntry[] = SessionManager.inMemory().getEntries();
    const settingsManager = SettingsManager.inMemory({ compaction: { enabled: false } });

    expect(entries).toEqual([]);
    expect(settingsManager.getCompactionEnabled()).toBe(false);
  });

  it("creates sessions and custom tools through pi-effect facade exports", async () => {
    const resourceLoader = createMinimalResourceLoader();
    const tool = defineTool({
      name: "pi_effect_facade_echo",
      label: "pi-effect Facade Echo",
      description: "Echoes text for facade compatibility tests",
      parameters: Type.Object({ text: Type.String() }),
      execute: async (_toolCallId, params): Promise<AgentToolResult<{ readonly text: string }>> => ({
        content: [{ type: "text", text: params.text }],
        details: { text: params.text },
      }),
    });

    const agentDir = mkdtempSync(join(tmpdir(), "pi-effect-facade-session-"));
    const result = await createAgentSession({
      cwd: process.cwd(),
      agentDir,
      resourceLoader,
      sessionManager: SessionManager.inMemory(),
      settingsManager: SettingsManager.inMemory(),
      customTools: [tool],
      tools: ["pi_effect_facade_echo"],
      noTools: "builtin",
    });

    try {
      const eventSink = (_event: AgentSessionEvent) => undefined;
      const registered = result.session.getToolDefinition("pi_effect_facade_echo");

      expect(eventSink).toBeTypeOf("function");
      expect(registered).toBeDefined();
      await expect(
        registered?.execute("call-1", { text: "ok" }, undefined, undefined, {} as never),
      ).resolves.toEqual({
        content: [{ type: "text", text: "ok" }],
        details: { text: "ok" },
      });
    } finally {
      result.session.dispose();
      rmSync(agentDir, { recursive: true, force: true });
    }
  });

  it("keeps builtin tool-definition factories importable from pi-effect", async () => {
    const readOperations: ReadOperations = {
      access: async () => undefined,
      readFile: async () => Buffer.from("facade read fixture"),
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
      defineTool(createBashToolDefinition(process.cwd())),
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
      content: [{ type: "text", text: "facade read fixture" }],
    });
  });
});
