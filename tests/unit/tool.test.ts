import { describe, expect, it } from "vitest";
import { Effect } from "effect";
import { Type } from "typebox";
import { PiTool, PiToolDefectError, PiToolExecutionError } from "../../src/index.js";

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

  it("converts synchronous handler throws into typed rejected PI tool defects", async () => {
    const cause = new Error("handler crashed");
    const tool = PiTool.make(
      {
        name: "throw",
        label: "Throw",
        description: "Throws",
        parameters: Type.Object({}),
      },
      () => {
        throw cause;
      },
    );

    await expect(tool.execute("call-1", {}, undefined, undefined, {} as never)).rejects.toMatchObject({
      _tag: "PiToolDefectError",
      cause,
    } satisfies Partial<PiToolDefectError>);
  });

  it("converts Effect defects into typed rejected PI tool defects", async () => {
    const cause = new Error("effect died");
    const tool = PiTool.make(
      {
        name: "die",
        label: "Die",
        description: "Dies",
        parameters: Type.Object({}),
      },
      () => Effect.die(cause),
    );

    await expect(tool.execute("call-1", {}, undefined, undefined, {} as never)).rejects.toMatchObject({
      _tag: "PiToolDefectError",
      cause,
    } satisfies Partial<PiToolDefectError>);
  });
});
