import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  createAgentSession,
  defineTool,
  SessionManager,
  SettingsManager,
  VERSION,
} from "@earendil-works/pi-coding-agent";
import { Effect } from "effect";
import { Type } from "typebox";
import { AgentSessionEffect } from "../../src/index.js";

const adapterRuntimeExports = [
  "VERSION",
  "createAgentSession",
  "defineTool",
  "SessionManager",
  "SettingsManager",
] as const;

describe("pi-coding-agent 0.80 public SDK compatibility", () => {
  it("documents the pinned PI SDK version under test", () => {
    const packageJson = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")) as {
      dependencies: Record<string, string>;
    };

    expect(packageJson.dependencies["@earendil-works/pi-coding-agent"]).toBe("0.80.6");
    expect(VERSION).toBe("0.80.6");
  });

  it("keeps the adapter-relevant root SDK exports importable", async () => {
    const sdk = await import("@earendil-works/pi-coding-agent");

    for (const exportName of adapterRuntimeExports) {
      expect(sdk[exportName]).toBeDefined();
    }
  });

  it("keeps the removed hooks subpath outside the supported adapter surface", async () => {
    const piPackageJson = JSON.parse(
      readFileSync(
        new URL("../../node_modules/@earendil-works/pi-coding-agent/package.json", import.meta.url),
        "utf8",
      ),
    ) as { exports?: Record<string, unknown> };

    const hooksSubpath = "@earendil-works/pi-coding-agent/hooks";

    expect(piPackageJson.exports).not.toHaveProperty("./hooks");
    await expect(import(hooksSubpath)).rejects.toThrow(/(not defined|Missing .* specifier|Cannot find (module|package))/);
  });

  it("acquires and releases a public SDK session through the scoped wrapper", async () => {
    let disposeCount = 0;

    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const result = yield* AgentSessionEffect.createFrom(async () => {
            const created = await createAgentSession({
              sessionManager: SessionManager.inMemory(),
              settingsManager: SettingsManager.inMemory(),
              noTools: "all",
            });
            const dispose = created.session.dispose.bind(created.session);
            created.session.dispose = () => {
              disposeCount += 1;
              dispose();
            };
            return created;
          });

          expect(result.session.sessionId).toEqual(expect.any(String));
          expect(disposeCount).toBe(0);
        }),
      ),
    );

    expect(disposeCount).toBe(1);
  });

  it("keeps custom tool definitions compatible with PI defineTool", async () => {
    const tool = defineTool({
      name: "compat_echo",
      label: "Compat Echo",
      description: "Echoes input for compatibility tests",
      parameters: Type.Object({ input: Type.String() }),
      execute: async (_toolCallId, params) => ({
        content: [{ type: "text", text: params.input }],
        details: { echoed: params.input },
      }),
    });

    await expect(tool.execute("call-1", { input: "ok" }, undefined, undefined, {} as never)).resolves.toEqual({
      content: [{ type: "text", text: "ok" }],
      details: { echoed: "ok" },
    });
  });
});
