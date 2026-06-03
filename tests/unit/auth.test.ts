import { Effect, Either } from "effect";
import { describe, expect, it, vi } from "vitest";
import {
  AuthStorageApiKeyNotFoundError,
  AuthStorageEffect,
  AuthStorageEffectError,
  type AuthStorageLike,
  type AuthStorageLoginCallbacks,
  type AuthStorageLoginProviderId,
} from "../../src/index.js";

const loginCallbacks = {} as AuthStorageLoginCallbacks;

class FakeAuthStorage implements AuthStorageLike {
  readonly getApiKeyMock = vi.fn<AuthStorageLike["getApiKey"]>();
  readonly loginMock = vi.fn<AuthStorageLike["login"]>();
  readonly setMock = vi.fn<AuthStorageLike["set"]>();
  readonly removeMock = vi.fn<AuthStorageLike["remove"]>();
  readonly reloadMock = vi.fn<AuthStorageLike["reload"]>();
  errors: Error[] = [];

  async getApiKey(providerId: string, options?: Parameters<AuthStorageLike["getApiKey"]>[1]) {
    return this.getApiKeyMock(providerId, options);
  }

  async login(providerId: AuthStorageLoginProviderId, callbacks: AuthStorageLoginCallbacks) {
    return this.loginMock(providerId, callbacks);
  }

  set(provider: string, credential: Parameters<AuthStorageLike["set"]>[1]) {
    this.setMock(provider, credential);
  }

  remove(provider: string) {
    this.removeMock(provider);
  }

  reload() {
    this.reloadMock();
  }

  drainErrors() {
    const drained = [...this.errors];
    this.errors = [];
    return drained;
  }
}

describe("AuthStorageEffect", () => {
  it("preserves PI getApiKey's undefined-or-string result shape", async () => {
    const authStorage = new FakeAuthStorage();
    authStorage.getApiKeyMock.mockResolvedValueOnce("sk-test");

    await expect(
      Effect.runPromise(AuthStorageEffect.getApiKey(authStorage, "openai", { includeFallback: false })),
    ).resolves.toBe("sk-test");
    expect(authStorage.getApiKeyMock).toHaveBeenCalledWith("openai", { includeFallback: false });
  });

  it("fails requireApiKey when PI lookup finds no credential", async () => {
    const authStorage = new FakeAuthStorage();
    authStorage.getApiKeyMock.mockResolvedValueOnce(undefined);

    const result = await Effect.runPromise(AuthStorageEffect.requireApiKey(authStorage, "missing").pipe(Effect.either));

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left).toBeInstanceOf(AuthStorageApiKeyNotFoundError);
      expect(result.left.cause).toEqual({ providerId: "missing" });
    }
  });

  it("turns recorded PI auth storage errors into typed Effect failures", async () => {
    const cause = new Error("refresh lock failed");
    const authStorage = new FakeAuthStorage();
    authStorage.getApiKeyMock.mockResolvedValueOnce(undefined);
    authStorage.errors = [cause];

    const result = await Effect.runPromise(AuthStorageEffect.getApiKey(authStorage, "openai").pipe(Effect.either));

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left).toBeInstanceOf(AuthStorageEffectError);
      expect(result.left.cause).toEqual([cause]);
    }
  });

  it("treats recorded persistence errors as part of set/remove/reload boundaries", async () => {
    const cause = new Error("disk full");
    const authStorage = new FakeAuthStorage();
    authStorage.errors = [cause];

    const result = await Effect.runPromise(
      AuthStorageEffect.set(authStorage, "openai", { type: "api_key", key: "sk-test" }).pipe(Effect.either),
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left).toBeInstanceOf(AuthStorageEffectError);
      expect(result.left.cause).toEqual([cause]);
    }
  });

  it("maps rejected PI login work to AuthStorageEffectError", async () => {
    const cause = new Error("oauth failed");
    const authStorage = new FakeAuthStorage();
    authStorage.loginMock.mockRejectedValueOnce(cause);

    const result = await Effect.runPromise(
      AuthStorageEffect.login(authStorage, "openai-codex", loginCallbacks).pipe(Effect.either),
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left).toBeInstanceOf(AuthStorageEffectError);
      expect(result.left.cause).toBe(cause);
    }
  });
});
