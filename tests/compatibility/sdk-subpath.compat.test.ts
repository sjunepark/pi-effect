import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
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
} from "../../src/sdk.js";

const downstreamRuntimeExports = {
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

describe("pi-effect/sdk facade-only subpath", () => {
  it("exposes the downstream PI SDK facade runtime surface", () => {
    for (const [exportName, exportedValue] of Object.entries(downstreamRuntimeExports)) {
      expect(exportedValue, exportName).toBeDefined();
    }
    expect(VERSION).toBe("0.78.0");
  });

  it("is published as a package subpath", () => {
    const packageJson = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")) as {
      exports?: Record<string, { readonly types?: string; readonly import?: string }>;
    };

    expect(packageJson.exports?.["./sdk"]).toEqual({
      types: "./dist/sdk.d.ts",
      import: "./dist/sdk.js",
    });
  });

  it("does not import or re-export pi-effect Effect wrapper modules", () => {
    const source = readFileSync(new URL("../../src/sdk.ts", import.meta.url), "utf8");

    expect(source).not.toMatch(/from\s+["']\.\//);
    expect(source).not.toMatch(/from\s+["']effect["']/);
    expect(source).toMatch(/from\s+["']@earendil-works\/pi-coding-agent["']/);
  });
});
