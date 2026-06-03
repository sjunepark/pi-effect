import type { AuthCredential, AuthStorage } from "@earendil-works/pi-coding-agent";
import { Effect } from "effect";
import {
  AuthStorageApiKeyNotFoundError,
  AuthStorageEffectError,
} from "../session/AgentSessionEffectError.js";

export type AuthStorageGetApiKeyOptions = Parameters<AuthStorage["getApiKey"]>[1];
export type AuthStorageLoginProviderId = Parameters<AuthStorage["login"]>[0];
export type AuthStorageLoginCallbacks = Parameters<AuthStorage["login"]>[1];

/** Structural subset of PI SDK `AuthStorage` used by Effect helpers and tests. */
export interface AuthStorageLike {
  getApiKey(providerId: string, options?: AuthStorageGetApiKeyOptions): Promise<string | undefined>;
  login(providerId: AuthStorageLoginProviderId, callbacks: AuthStorageLoginCallbacks): Promise<void>;
  set(provider: string, credential: AuthCredential): void;
  remove(provider: string): void;
  reload(): void;
  drainErrors(): Error[];
}

export type AuthStorageApiKeyLookupError = AuthStorageEffectError;
export type AuthStorageRequiredApiKeyError = AuthStorageEffectError | AuthStorageApiKeyNotFoundError;
export type AuthStorageLoginError = AuthStorageEffectError;
export type AuthStorageWriteError = AuthStorageEffectError;

const formatAuthStorageErrors = (errors: readonly Error[]): string => errors.map((error) => error.message).join("; ");

const failOnRecordedErrors = (
  authStorage: AuthStorageLike | AuthStorage,
  operation: string,
): Effect.Effect<void, AuthStorageEffectError> =>
  Effect.try({
    try: () => authStorage.drainErrors(),
    catch: (cause) => new AuthStorageEffectError({ cause }),
  }).pipe(
    Effect.flatMap((errors) =>
      errors.length === 0
        ? Effect.void
        : Effect.fail(
            new AuthStorageEffectError({
              message: `PI auth storage failed to ${operation}: ${formatAuthStorageErrors(errors)}`,
              cause: errors,
            }),
          ),
    ),
  );

/**
 * Effect wrapper around PI SDK `AuthStorage.getApiKey(...)`.
 *
 * The return value preserves PI's `string | undefined` shape for absent
 * credentials. The wrapper adds an Effect error channel for thrown lookup,
 * OAuth-refresh, storage-lock, and recorded `drainErrors()` failures.
 */
export const getApiKey = (
  authStorage: AuthStorageLike | AuthStorage,
  providerId: string,
  options?: AuthStorageGetApiKeyOptions,
): Effect.Effect<string | undefined, AuthStorageApiKeyLookupError> =>
  Effect.tryPromise({
    try: () => authStorage.getApiKey(providerId, options),
    catch: (cause) => new AuthStorageEffectError({ cause }),
  }).pipe(
    Effect.flatMap((apiKey) =>
      failOnRecordedErrors(authStorage, `look up API key for ${providerId}`).pipe(Effect.as(apiKey)),
    ),
  );

/**
 * Effect wrapper around PI SDK `AuthStorage.getApiKey(...)` that fails when no
 * API key is available while preserving PI lookup failures as auth errors.
 */
export const requireApiKey = (
  authStorage: AuthStorageLike | AuthStorage,
  providerId: string,
  options?: AuthStorageGetApiKeyOptions,
): Effect.Effect<string, AuthStorageRequiredApiKeyError> =>
  getApiKey(authStorage, providerId, options).pipe(
    Effect.flatMap((apiKey) =>
      apiKey === undefined
        ? Effect.fail(
            new AuthStorageApiKeyNotFoundError({
              message: `PI API key not found: ${providerId}`,
              cause: { providerId },
            }),
          )
        : Effect.succeed(apiKey),
    ),
  );

/**
 * Effect wrapper around PI SDK `AuthStorage.login(...)`.
 *
 * OAuth callbacks and provider behavior remain PI-shaped. The wrapper only
 * turns rejected login work and recorded persistence errors into a typed Effect
 * failure while preserving original causes.
 */
export const login = (
  authStorage: AuthStorageLike | AuthStorage,
  providerId: AuthStorageLoginProviderId,
  callbacks: AuthStorageLoginCallbacks,
): Effect.Effect<void, AuthStorageLoginError> =>
  Effect.tryPromise({
    try: () => authStorage.login(providerId, callbacks),
    catch: (cause) => new AuthStorageEffectError({ cause }),
  }).pipe(Effect.flatMap(() => failOnRecordedErrors(authStorage, `login to ${providerId}`)));

/**
 * Effect wrapper around PI SDK `AuthStorage.set(...)` that treats recorded
 * persistence errors as part of the write boundary.
 */
export const set = (
  authStorage: AuthStorageLike | AuthStorage,
  provider: string,
  credential: AuthCredential,
): Effect.Effect<void, AuthStorageWriteError> =>
  Effect.try({
    try: () => authStorage.set(provider, credential),
    catch: (cause) => new AuthStorageEffectError({ cause }),
  }).pipe(Effect.flatMap(() => failOnRecordedErrors(authStorage, `persist credentials for ${provider}`)));

/**
 * Effect wrapper around PI SDK `AuthStorage.remove(...)` that treats recorded
 * persistence errors as part of the write boundary.
 */
export const remove = (
  authStorage: AuthStorageLike | AuthStorage,
  provider: string,
): Effect.Effect<void, AuthStorageWriteError> =>
  Effect.try({
    try: () => authStorage.remove(provider),
    catch: (cause) => new AuthStorageEffectError({ cause }),
  }).pipe(Effect.flatMap(() => failOnRecordedErrors(authStorage, `remove credentials for ${provider}`)));

/** Effect wrapper around PI SDK `AuthStorage.reload()` plus `drainErrors()`. */
export const reload = (authStorage: AuthStorageLike | AuthStorage): Effect.Effect<void, AuthStorageWriteError> =>
  Effect.try({
    try: () => authStorage.reload(),
    catch: (cause) => new AuthStorageEffectError({ cause }),
  }).pipe(Effect.flatMap(() => failOnRecordedErrors(authStorage, "reload credentials")));

/** Effect wrapper around PI SDK `AuthStorage.drainErrors()` without failing on recorded errors. */
export const drainErrors = (authStorage: AuthStorageLike | AuthStorage): Effect.Effect<Error[]> =>
  Effect.sync(() => authStorage.drainErrors());

/** Effect helpers grouped by the original PI SDK `AuthStorage` concept. */
export const AuthStorageEffect = {
  getApiKey,
  requireApiKey,
  login,
  set,
  remove,
  reload,
  drainErrors,
} as const;
