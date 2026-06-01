import { Cause, Effect, Runtime } from "effect";
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import {
  defineToolEffect,
  ToolEffectDefectError,
  ToolEffectExecutionError,
  ToolEffectInterruptedError,
} from "../../src/index.js";

describe("defineToolEffect", () => {
  it("converts Effect successes into PI tool results", async () => {
    const tool = defineToolEffect(
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
    const tool = defineToolEffect(
      {
        name: "fail",
        label: "Fail",
        description: "Fails",
        parameters: Type.Object({}),
      },
      () => Effect.fail("boom"),
    );

    await expect(tool.execute("call-1", {}, undefined, undefined, {} as never)).rejects.toBeInstanceOf(
      ToolEffectExecutionError,
    );
  });

  it("converts synchronous handler throws into typed rejected PI tool defects", async () => {
    const cause = new Error("handler crashed");
    const tool = defineToolEffect(
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
      _tag: "ToolEffectDefectError",
      cause,
    } satisfies Partial<ToolEffectDefectError>);
  });

  it("converts Effect defects into typed rejected PI tool defects", async () => {
    const cause = new Error("effect died");
    const tool = defineToolEffect(
      {
        name: "die",
        label: "Die",
        description: "Dies",
        parameters: Type.Object({}),
      },
      () => Effect.die(cause),
    );

    await expect(tool.execute("call-1", {}, undefined, undefined, {} as never)).rejects.toMatchObject({
      _tag: "ToolEffectDefectError",
      cause,
    } satisfies Partial<ToolEffectDefectError>);
  });

  it("preserves Effect interruption details inside typed tool interruption errors", async () => {
    const tool = defineToolEffect(
      {
        name: "interrupt",
        label: "Interrupt",
        description: "Runs until interrupted",
        parameters: Type.Object({}),
      },
      () => Effect.never,
    );
    const controller = new AbortController();
    const execution = tool.execute("call-1", {}, controller.signal, undefined, {} as never);

    controller.abort();

    await expect(execution).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(ToolEffectInterruptedError);
      expect(error).toMatchObject({ _tag: "ToolEffectInterruptedError" } satisfies Partial<ToolEffectInterruptedError>);
      const cause = (error as ToolEffectInterruptedError).cause;
      expect(Runtime.isFiberFailure(cause)).toBe(true);
      expect(Runtime.isFiberFailure(cause) && Cause.isInterruptedOnly(cause[Runtime.FiberFailureCauseId])).toBe(true);
      return true;
    });
  });
});
