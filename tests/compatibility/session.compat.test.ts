import { describe, expect, it, vi } from "vitest";
import {
  AuthStorage,
  createAgentSession,
  createExtensionRuntime,
  ModelRegistry,
  SessionManager,
  SettingsManager,
  type AgentSessionEvent,
  type ProviderConfig,
  type ResourceLoader,
} from "@earendil-works/pi-coding-agent";
import { Effect, Either, Stream } from "effect";
import { Type } from "typebox";
import { AgentSessionEffect, AgentSessionPromptRejectedError, createAgentSessionEffect, defineToolEffect } from "../../src/index.js";

type CreateAgentSessionOptions = NonNullable<Parameters<typeof createAgentSession>[0]>;
type ProviderStreamSimple = NonNullable<ProviderConfig["streamSimple"]>;
type AssistantMessage = Awaited<ReturnType<ReturnType<ProviderStreamSimple>["result"]>>;

const createFinalMessage = (model: Parameters<ProviderStreamSimple>[0], text: string): AssistantMessage => ({
  role: "assistant",
  content: [{ type: "text", text }],
  api: model.api,
  provider: model.provider,
  model: model.id,
  usage: {
    input: 0,
    output: 0,
    cacheRead: 0,
    cacheWrite: 0,
    totalTokens: 0,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
  },
  stopReason: "stop",
  timestamp: Date.now(),
});

const createFinishedStream = (message: AssistantMessage): ReturnType<ProviderStreamSimple> =>
  ({
    async *[Symbol.asyncIterator]() {
      yield { type: "done", reason: "stop", message };
    },
    result: async () => message,
  }) as unknown as ReturnType<ProviderStreamSimple>;

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

const collectSessionEventsAfterSubscription = (
  session: Parameters<typeof AgentSessionEffect.events>[0],
  count: number,
) => {
  const originalSubscribe = session.subscribe.bind(session);
  let restoreSubscribeSpy: (() => void) | undefined;
  const subscribed = new Promise<void>((resolve) => {
    const subscribeSpy = vi.spyOn(session, "subscribe").mockImplementation((listener) => {
      const unsubscribe = originalSubscribe(listener);
      resolve();
      return unsubscribe;
    });
    restoreSubscribeSpy = () => subscribeSpy.mockRestore();
  });

  return {
    collected: Effect.runPromise(
      AgentSessionEffect.events(session).pipe(Stream.take(count), Stream.runCollect),
    ).then((events) => Array.from(events)),
    waitUntilSubscribed: async () => {
      await subscribed;
      restoreSubscribeSpy?.();
    },
  };
};

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

  it("forwards deterministic real session metadata events through AgentSessionEffect.events in order", async () => {
    const { session } = await createInMemorySession();

    try {
      const { collected, waitUntilSubscribed } = collectSessionEventsAfterSubscription(session, 2);

      await waitUntilSubscribed();
      session.setSessionName("compat-session-one");
      session.setSessionName("compat-session-two");

      expect(await collected).toEqual([
        { type: "session_info_changed", name: "compat-session-one" },
        { type: "session_info_changed", name: "compat-session-two" },
      ]);
    } finally {
      session.dispose();
    }
  });

  it("keeps PI thinking-level selection idempotent for unchanged effective levels", async () => {
    const { session } = await createInMemorySession();
    const receivedEvents: AgentSessionEvent[] = [];
    const unsubscribe = session.subscribe((event) => receivedEvents.push(event));

    try {
      session.setThinkingLevel(session.thinkingLevel);

      expect(receivedEvents.filter((event) => event.type === "thinking_level_changed")).toEqual([]);
    } finally {
      unsubscribe();
      session.dispose();
    }
  });

  it("adds session-local request stream options while leaving custom API registration global", async () => {
    const api = `pi-effect-stream-options-${Date.now()}`;
    const provider = `pi-effect-provider-${Date.now()}`;
    const observedOptions: Array<Parameters<ProviderStreamSimple>[2]> = [];
    const model = {
      id: "metadata-model",
      name: "Metadata Model",
      api,
      provider,
      baseUrl: "https://example.invalid/v1",
      reasoning: false,
      input: ["text"],
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      contextWindow: 4096,
      maxTokens: 1024,
    } satisfies NonNullable<CreateAgentSessionOptions["model"]>;
    const streamSimple: ProviderStreamSimple = (requestModel, _context, options) => {
      observedOptions.push(options);
      return createFinishedStream(createFinalMessage(requestModel, "ok"));
    };
    const firstModelRegistry = ModelRegistry.inMemory(AuthStorage.inMemory());
    firstModelRegistry.registerProvider(provider, {
      api,
      apiKey: "first-key",
      headers: { "x-provider": "registered" },
      streamSimple,
    });
    const secondAuthStorage = AuthStorage.inMemory();
    secondAuthStorage.set(provider, { type: "api_key", key: "second-key" });
    const firstRequestSignal = new AbortController().signal;
    const firstHookSignal = new AbortController().signal;
    const secondRequestSignal = new AbortController().signal;
    const unsetSignal = { signal: undefined } as unknown as NonNullable<Parameters<ProviderStreamSimple>[2]>;

    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const { session: firstSession } = yield* createAgentSessionEffect({
            model,
            modelRegistry: firstModelRegistry,
            resourceLoader: createCompatResourceLoader(),
            sessionManager: SessionManager.inMemory(),
            settingsManager: SettingsManager.inMemory(),
            noTools: "all",
            requestStreamOptions: ({ options }) => ({
              signal: firstHookSignal,
              headers: { "x-request": String(options?.metadata?.requestId), "x-session": "first" },
              metadata: { tenant: "first" },
            }),
          });
          const { session: secondSession } = yield* createAgentSessionEffect({
            model,
            authStorage: secondAuthStorage,
            sessionManager: SessionManager.inMemory(),
            settingsManager: SettingsManager.inMemory(),
            resourceLoader: createCompatResourceLoader(),
            noTools: "all",
            requestStreamOptions: ({ options }) => ({
              ...unsetSignal,
              headers: { "x-request": String(options?.metadata?.requestId), "x-session": "second" },
              metadata: { tenant: "second" },
            }),
          });

          yield* Effect.promise(() =>
            Promise.resolve(
              firstSession.agent.streamFn(model, { messages: [] }, {
                signal: firstRequestSignal,
                headers: { "x-base": "base" },
                metadata: { requestId: "one" },
              }),
            ),
          );
          yield* Effect.promise(() =>
            Promise.resolve(
              secondSession.agent.streamFn(model, { messages: [] }, {
                signal: secondRequestSignal,
                headers: { "x-base": "base" },
                metadata: { requestId: "two" },
              }),
            ),
          );
        }),
      ),
    );

    expect(observedOptions).toHaveLength(2);
    expect(observedOptions[0]).toMatchObject({
      apiKey: "first-key",
      headers: {
        "x-base": "base",
        "x-provider": "registered",
        "x-request": "one",
        "x-session": "first",
      },
      metadata: { requestId: "one", tenant: "first" },
    });
    expect(observedOptions[0]?.signal).toBe(firstRequestSignal);
    expect(observedOptions[0]?.signal).not.toBe(firstHookSignal);
    expect(observedOptions[1]).toMatchObject({
      apiKey: "second-key",
      headers: { "x-base": "base", "x-request": "two", "x-session": "second" },
      metadata: { requestId: "two", tenant: "second" },
    });
    expect(observedOptions[1]?.signal).toBe(secondRequestSignal);
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
