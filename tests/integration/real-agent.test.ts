import { mkdtemp } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import path from "node:path";
import { Effect, Fiber, Stream } from "effect";
import { describe, expect, it } from "vitest";
import {
  AgentSessionEffect,
  AuthStorage,
  createAgentSessionEffect,
  createExtensionRuntime,
  ModelRegistry,
  ModelRegistryEffect,
  SessionManager,
  SettingsManager,
  type AgentSessionLike,
  type ResourceLoader,
} from "../../src/index.js";

const REAL_AGENT_ENABLED = process.env.PI_EFFECT_REAL_AGENT === "1";
const DEFAULT_PROVIDER = "openai";
const DEFAULT_MODEL = "gpt-4.1-mini";

const describeRealAgent = REAL_AGENT_ENABLED ? describe : describe.skip;

const expandHome = (input: string): string =>
  input === "~" || input.startsWith("~/") || input.startsWith(`~${path.sep}`)
    ? path.join(homedir(), input.slice(2))
    : input;

const createRealAgentDir = async (): Promise<string> => {
  const configured = process.env.PI_EFFECT_AGENT_DIR?.trim();
  if (configured) return expandHome(configured);
  return await mkdtemp(path.join(tmpdir(), "pi-effect-real-agent-"));
};

const createSmokeResourceLoader = (): ResourceLoader => ({
  getExtensions: () => ({ extensions: [], errors: [], runtime: createExtensionRuntime() }),
  getSkills: () => ({ skills: [], diagnostics: [] }),
  getPrompts: () => ({ prompts: [], diagnostics: [] }),
  getThemes: () => ({ themes: [], diagnostics: [] }),
  getAgentsFiles: () => ({ agentsFiles: [] }),
  getSystemPrompt: () =>
    "You are a real-model smoke test assistant. Reply briefly and do not use tools.",
  getAppendSystemPrompt: () => [],
  extendResources: () => undefined,
  reload: async () => undefined,
});

const createRealAgentOptions = async () => {
  const provider = process.env.PI_EFFECT_PROVIDER?.trim() || DEFAULT_PROVIDER;
  const modelId = process.env.PI_EFFECT_MODEL?.trim() || DEFAULT_MODEL;
  const agentDir = await createRealAgentDir();
  const cwd = await mkdtemp(path.join(tmpdir(), "pi-effect-real-cwd-"));
  const authStorage = AuthStorage.create(path.join(agentDir, "auth.json"));
  const modelRegistry = ModelRegistry.create(authStorage, path.join(agentDir, "models.json"));
  const model = await Effect.runPromise(ModelRegistryEffect.find(modelRegistry, provider, modelId));

  return {
    cwd,
    agentDir,
    model,
    thinkingLevel: "off" as const,
    authStorage,
    modelRegistry,
    resourceLoader: createSmokeResourceLoader(),
    sessionManager: SessionManager.inMemory(cwd),
    settingsManager: SettingsManager.inMemory({
      compaction: { enabled: false },
      retry: { enabled: false },
    }),
    noTools: "all" as const,
  };
};

const collectUntilAgentEnd = (session: AgentSessionLike) =>
  AgentSessionEffect.events(session).pipe(
    Stream.takeUntil((event) => event.type === "agent_end"),
    Stream.runCollect,
  );

describeRealAgent("real PI AgentSession smoke", () => {
  it(
    "runs one prompt through the Effect wrapper and forwards lifecycle events",
    async () => {
      const options = await createRealAgentOptions();
      const result = await Effect.runPromise(
        Effect.scoped(
          Effect.gen(function* () {
            const { session } = yield* createAgentSessionEffect(options);
            const eventsFiber = yield* collectUntilAgentEnd(session).pipe(Effect.fork);

            yield* Effect.sleep(10);
            yield* AgentSessionEffect.prompt(
              session,
              "Reply with exactly this string and no extra text: PI_EFFECT_REAL_AGENT_OK",
            );

            const events = Array.from(yield* Fiber.join(eventsFiber));
            return {
              eventTypes: events.map((event) => event.type),
              lastAssistantText: session.getLastAssistantText(),
            };
          }),
        ),
      );

      expect(result.eventTypes).toContain("agent_start");
      expect(result.eventTypes.at(-1)).toBe("agent_end");
      expect(result.eventTypes.indexOf("agent_start")).toBeLessThan(
        result.eventTypes.lastIndexOf("agent_end"),
      );
      expect(result.lastAssistantText?.trim().length ?? 0).toBeGreaterThan(0);
    },
    120_000,
  );
});
