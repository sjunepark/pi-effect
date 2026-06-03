import { Effect, Either } from "effect";
import { describe, expect, it } from "vitest";
import {
  AuthStorage,
  AuthStorageApiKeyNotFoundError,
  AuthStorageEffect,
  AuthStorageEffectError,
  type AuthStorageBackend,
  type AuthStorageLoginCallbacks,
} from "../../src/index.js";

const loginCallbacks = {} as AuthStorageLoginCallbacks;

class RejectWritesBackend implements AuthStorageBackend {
  private current = "{}";

  withLock<T>(fn: (current: string | undefined) => { result: T; next?: string }): T {
    const { result, next } = fn(this.current);
    if (next !== undefined) throw new Error("auth write rejected");
    return result;
  }

  async withLockAsync<T>(fn: (current: string | undefined) => Promise<{ result: T; next?: string }>): Promise<T> {
    const { result, next } = await fn(this.current);
    if (next !== undefined) throw new Error("auth write rejected");
    return result;
  }
}

describe("PI AuthStorage compatibility", () => {
  it("looks up stored API keys through the Effect wrapper", async () => {
    const authStorage = AuthStorage.inMemory({ openai: { type: "api_key", key: "sk-compat" } });

    await expect(
      Effect.runPromise(AuthStorageEffect.getApiKey(authStorage, "openai", { includeFallback: false })),
    ).resolves.toBe("sk-compat");
  });

  it("keeps missing API keys as undefined unless requireApiKey is used", async () => {
    const authStorage = AuthStorage.inMemory();

    await expect(Effect.runPromise(AuthStorageEffect.getApiKey(authStorage, "missing"))).resolves.toBeUndefined();

    const result = await Effect.runPromise(AuthStorageEffect.requireApiKey(authStorage, "missing").pipe(Effect.either));

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left).toBeInstanceOf(AuthStorageApiKeyNotFoundError);
    }
  });

  it("surfaces PI recorded AuthStorage persistence errors after writes", async () => {
    const authStorage = AuthStorage.fromStorage(new RejectWritesBackend());

    const result = await Effect.runPromise(
      AuthStorageEffect.set(authStorage, "openai", { type: "api_key", key: "sk-write" }).pipe(Effect.either),
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left).toBeInstanceOf(AuthStorageEffectError);
      expect(result.left.cause).toEqual([expect.any(Error)]);
    }
  });

  it("maps rejected PI OAuth login work through AuthStorageEffect.login", async () => {
    const authStorage = AuthStorage.inMemory();

    const result = await Effect.runPromise(
      AuthStorageEffect.login(authStorage, "pi-effect-unknown-oauth-provider", loginCallbacks).pipe(Effect.either),
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left).toBeInstanceOf(AuthStorageEffectError);
      expect(result.left.cause).toBeInstanceOf(Error);
    }
  });
});
