import { describe, expect, it } from "vitest";
import { createAgentSession, SessionManager, SettingsManager } from "@earendil-works/pi-coding-agent";
import { Effect, Stream } from "effect";
import { Type } from "typebox";
import { PiEventStream, PiTool } from "../../src/index.js";

const createInMemorySession = () =>
  createAgentSession({
    sessionManager: SessionManager.inMemory(),
    settingsManager: SettingsManager.inMemory(),
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

  it("forwards deterministic real session events through PiEventStream in order", async () => {
    const { session } = await createInMemorySession();
    const nextThinkingLevel = session.thinkingLevel === "low" ? "medium" : "low";

    try {
      const collected = Effect.runPromise(
        PiEventStream.fromSession(session).pipe(Stream.take(2), Stream.runCollect),
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

  it("registers PiTool.make results as custom PI tool definitions", async () => {
    const tool = PiTool.make(
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
