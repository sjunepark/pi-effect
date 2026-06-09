import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
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
} from "../../src/raw.js";

const downstreamRuntimeExports = {
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
};

describe("pi-effect/raw facade-only subpath", () => {
  it("exposes the downstream PI SDK facade runtime surface", () => {
    for (const [exportName, exportedValue] of Object.entries(downstreamRuntimeExports)) {
      expect(exportedValue, exportName).toBeDefined();
    }
    expect(VERSION).toBe("0.78.0");
  });

  it("is published as a package subpath", () => {
    const packageJson = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")) as {
      name?: string;
      exports?: Record<string, { readonly types?: string; readonly import?: string }>;
    };

    expect(packageJson.name).toBe("pi-effect");
    expect(packageJson.exports?.["./raw"]).toEqual({
      types: "./dist/raw.d.ts",
      import: "./dist/raw.js",
    });
    expect(packageJson.exports).not.toHaveProperty("./sdk");
  });

  it("does not import or re-export pi-effect Effect wrapper modules", () => {
    const source = readFileSync(new URL("../../src/raw.ts", import.meta.url), "utf8");

    expect(source).not.toMatch(/from\s+["']\.\//);
    expect(source).not.toMatch(/from\s+["']effect["']/);
    expect(source).toMatch(/from\s+["']@earendil-works\/pi-coding-agent["']/);
  });
});
