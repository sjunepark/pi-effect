import { Effect, Either } from "effect";
import { describe, expect, it } from "vitest";
import {
  AuthStorage,
  AuthStorageApiKeyNotFoundError,
  AuthStorageEffect,
  AuthStorageEffectError,
  type AuthCredential,
  type AuthStorageBackend,
  type AuthStorageLoginCallbacks,
  type AuthStorageLoginProviderId,
} from "../../src/index.js";

const loginCallbacks = {} as AuthStorageLoginCallbacks;
const unknownOAuthProvider = "pi-effect-unknown-oauth-provider" as unknown as AuthStorageLoginProviderId;

class RejectWritesBackend implements AuthStorageBackend {
  private current: string;

  constructor(current = "{}") {
    this.current = current;
  }

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

class RejectReloadBackend implements AuthStorageBackend {
  private rejectReads = false;

  constructor(private readonly current: string) {}

  rejectReloads() {
    this.rejectReads = true;
  }

  withLock<T>(fn: (current: string | undefined) => { result: T; next?: string }): T {
    if (this.rejectReads) throw new Error("auth reload rejected");
    return fn(this.current).result;
  }

  async withLockAsync<T>(fn: (current: string | undefined) => Promise<{ result: T; next?: string }>): Promise<T> {
    if (this.rejectReads) throw new Error("auth reload rejected");
    return (await fn(this.current)).result;
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

  it("surfaces PI recorded AuthStorage persistence errors without treating writes as transactional", async () => {
    const credential: AuthCredential = { type: "api_key", key: "sk-write" };
    const setStorage = AuthStorage.fromStorage(new RejectWritesBackend());

    const setResult = await Effect.runPromise(
      AuthStorageEffect.set(setStorage, "openai", credential).pipe(Effect.either),
    );

    expect(Either.isLeft(setResult)).toBe(true);
    if (Either.isLeft(setResult)) {
      expect(setResult.left).toBeInstanceOf(AuthStorageEffectError);
      expect(setResult.left.cause).toEqual([expect.any(Error)]);
    }
    expect(setStorage.get("openai")).toEqual(credential);

    const removeStorage = AuthStorage.fromStorage(
      new RejectWritesBackend(JSON.stringify({ openai: credential }, null, 2)),
    );

    const removeResult = await Effect.runPromise(AuthStorageEffect.remove(removeStorage, "openai").pipe(Effect.either));

    expect(Either.isLeft(removeResult)).toBe(true);
    if (Either.isLeft(removeResult)) {
      expect(removeResult.left).toBeInstanceOf(AuthStorageEffectError);
      expect(removeResult.left.cause).toEqual([expect.any(Error)]);
    }
    expect(removeStorage.get("openai")).toBeUndefined();
  });

  it("surfaces PI recorded reload errors without adding repair policy", async () => {
    const credential: AuthCredential = { type: "api_key", key: "sk-reload" };
    const backend = new RejectReloadBackend(JSON.stringify({ openai: credential }, null, 2));
    const authStorage = AuthStorage.fromStorage(backend);
    backend.rejectReloads();

    const result = await Effect.runPromise(AuthStorageEffect.reload(authStorage).pipe(Effect.either));

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left).toBeInstanceOf(AuthStorageEffectError);
      expect(result.left.cause).toEqual([expect.any(Error)]);
    }
    expect(authStorage.get("openai")).toEqual(credential);
  });

  it("maps rejected PI OAuth login work through AuthStorageEffect.login", async () => {
    const authStorage = AuthStorage.inMemory();

    const result = await Effect.runPromise(
      AuthStorageEffect.login(authStorage, unknownOAuthProvider, loginCallbacks).pipe(Effect.either),
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left).toBeInstanceOf(AuthStorageEffectError);
      expect(result.left.cause).toBeInstanceOf(Error);
    }
  });
});
