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
import { PiSessionService } from "../../src/index.js";

describe("pi-coding-agent 0.78 public SDK compatibility", () => {
  it("documents the pinned PI SDK version under test", () => {
    const packageJson = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")) as {
      dependencies: Record<string, string>;
    };

    expect(packageJson.dependencies["@earendil-works/pi-coding-agent"]).toBe("0.78.0");
    expect(VERSION).toBe("0.78.0");
  });

  it("acquires and releases a public SDK session through the scoped wrapper", async () => {
    let disposeCount = 0;

    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const session = yield* PiSessionService.acquireFrom(async () => {
            const result = await createAgentSession({
              sessionManager: SessionManager.inMemory(),
              settingsManager: SettingsManager.inMemory(),
              noTools: "all",
            });
            const dispose = result.session.dispose.bind(result.session);
            result.session.dispose = () => {
              disposeCount += 1;
              dispose();
            };
            return result;
          });

          expect(session.sessionId).toEqual(expect.any(String));
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
