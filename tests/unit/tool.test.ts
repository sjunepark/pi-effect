import { describe, expect, it } from "vitest";
import { Effect } from "effect";
import { Type } from "typebox";
import { PiTool, PiToolExecutionError } from "../../src/index.js";

describe("PiTool", () => {
  it("converts Effect successes into PI tool results", async () => {
    const tool = PiTool.make(
      {
        name: "echo",
        label: "Echo",
        description: "Echoes input",
        parameters: Type.Object({ input: Type.String() }),
      },
      ({ params }) =>
        Effect.succeed({
          content: [{ type: "text", text: params.input }],
          details: { echoed: params.input },
        }),
    );

    await expect(tool.execute("call-1", { input: "hello" }, undefined, undefined, {} as never)).resolves.toEqual({
      content: [{ type: "text", text: "hello" }],
      details: { echoed: "hello" },
    });
  });

  it("converts Effect failures into typed rejected PI tool executions", async () => {
    const tool = PiTool.make(
      {
        name: "fail",
        label: "Fail",
        description: "Fails",
        parameters: Type.Object({}),
      },
      () => Effect.fail("boom"),
    );

    await expect(tool.execute("call-1", {}, undefined, undefined, {} as never)).rejects.toBeInstanceOf(
      PiToolExecutionError,
    );
  });
});
