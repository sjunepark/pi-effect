import { describe, expect, it, vi } from "vitest";
import {
  AuthStorage,
  createAgentSession,
  createExtensionRuntime,
  ModelRegistry,
  SessionManager,
  SettingsManager,
  type ResourceLoader,
} from "@earendil-works/pi-coding-agent";
import { Effect, Either, Stream } from "effect";
import { Type } from "typebox";
import { AgentSessionEffect, AgentSessionPromptRejectedError, defineToolEffect } from "../../src/index.js";

type CreateAgentSessionOptions = NonNullable<Parameters<typeof createAgentSession>[0]>;

const createCompatResourceLoader = (): ResourceLoader => ({
  getExtensions: () => ({ extensions: [], errors: [], runtime: createExtensionRuntime() }),
  getSkills: () => ({ skills: [], diagnostics: [] }),
  getPrompts: () => ({ prompts: [], diagnostics: [] }),
  getThemes: () => ({ themes: [], diagnostics: [] }),
  getAgentsFiles: () => ({ agentsFiles: [] }),
  getSystemPrompt: () => "You are a compatibility test agent.",
  getAppendSystemPrompt: () => [],
  extendResources: () => undefined,
  reload: async () => undefined,
});

const unauthenticatedCompatModel = {
  id: "preflight-rejection-model",
  name: "Preflight Rejection Model",
  api: "openai-completions",
  provider: "pi-effect-compat-no-auth",
  baseUrl: "https://example.invalid/v1",
  reasoning: false,
  input: ["text"],
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  contextWindow: 4096,
  maxTokens: 1024,
} satisfies NonNullable<CreateAgentSessionOptions["model"]>;

const createInMemorySession = () =>
  createAgentSession({
    sessionManager: SessionManager.inMemory(),
    settingsManager: SettingsManager.inMemory(),
    resourceLoader: createCompatResourceLoader(),
    noTools: "all",
  });

describe("PI AgentSession compatibility", () => {
  it("provides the public AgentSession members used by pi-effect", async () => {
    const { session } = await createInMemorySession();

    try {
      expect(session.sessionId).toEqual(expect.any(String));
      expect(typeof session.prompt).toBe("function");
      expect(typeof session.abort).toBe("function");
      expect(typeof session.subscribe).toBe("function");
      expect(typeof session.dispose).toBe("function");
    } finally {
      session.dispose();
    }
  });

  it("maps real SDK prompt preflight rejection through AgentSessionEffect.prompt", async () => {
    const authStorage = AuthStorage.inMemory();
    const modelRegistry = ModelRegistry.inMemory(authStorage);
    const { session } = await createAgentSession({
      model: unauthenticatedCompatModel,
      authStorage,
      modelRegistry,
      sessionManager: SessionManager.inMemory(),
      settingsManager: SettingsManager.inMemory(),
      resourceLoader: createCompatResourceLoader(),
      noTools: "all",
    });
    const preflightResult = vi.fn();

    try {
      const result = await Effect.runPromise(
        AgentSessionEffect.prompt(session, "hello", { preflightResult }).pipe(Effect.either),
      );

      expect(Either.isLeft(result)).toBe(true);
      if (Either.isLeft(result)) {
        expect(result.left).toBeInstanceOf(AgentSessionPromptRejectedError);
        expect(result.left.cause).toBeInstanceOf(Error);
        expect((result.left.cause as Error).message).toContain("No API key found");
      }
      expect(preflightResult).toHaveBeenCalledWith(false);
    } finally {
      session.dispose();
    }
  });

  it("forwards deterministic real session events through AgentSessionEffect.events in order", async () => {
    const { session } = await createInMemorySession();
    const nextThinkingLevel = session.thinkingLevel === "low" ? "medium" : "low";

    try {
      const collected = Effect.runPromise(
        AgentSessionEffect.events(session).pipe(Stream.take(2), Stream.runCollect),
      );

      await new Promise((resolve) => setTimeout(resolve, 0));
      session.setSessionName("compat-session");
      session.setThinkingLevel(nextThinkingLevel);

      expect(Array.from(await collected)).toEqual([
        { type: "session_info_changed", name: "compat-session" },
        { type: "thinking_level_changed", level: nextThinkingLevel },
      ]);
    } finally {
      session.dispose();
    }
  });

  it("registers defineToolEffect results as custom PI tool definitions", async () => {
    const tool = defineToolEffect(
      {
        name: "effect_echo",
        label: "Effect Echo",
        description: "Echoes input through the Effect adapter",
        parameters: Type.Object({ input: Type.String() }),
      },
      ({ params }) =>
        Effect.succeed({
          content: [{ type: "text", text: params.input }],
          details: { echoed: params.input },
        }),
    );

    const { session } = await createAgentSession({
      sessionManager: SessionManager.inMemory(),
      settingsManager: SettingsManager.inMemory(),
      tools: ["effect_echo"],
      customTools: [tool],
    });

    try {
      const registered = session.getToolDefinition("effect_echo");

      expect(registered).toBeDefined();
      await expect(
        registered?.execute("call-1", { input: "ok" }, undefined, undefined, {} as never),
      ).resolves.toEqual({
        content: [{ type: "text", text: "ok" }],
        details: { echoed: "ok" },
      });
    } finally {
      session.dispose();
    }
  });
});
