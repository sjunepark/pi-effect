import type { ProviderConfig } from "@earendil-works/pi-coding-agent";

type ProviderStreamSimple = NonNullable<ProviderConfig["streamSimple"]>;
type StreamModel = Parameters<ProviderStreamSimple>[0];
type StreamContext = Parameters<ProviderStreamSimple>[1];
type StreamOptions = Parameters<ProviderStreamSimple>[2];
type DefinedStreamOptions = NonNullable<StreamOptions>;
type StreamResult = ReturnType<ProviderStreamSimple>;
type AgentStreamFunction = (
  model: StreamModel,
  context: StreamContext,
  options?: StreamOptions,
) => StreamResult | Promise<StreamResult>;

interface AgentSessionWithStreamFunction {
  readonly agent: {
    streamFn: AgentStreamFunction;
  };
}

export interface AgentSessionRequestStreamOptionsContext {
  readonly model: StreamModel;
  readonly context: StreamContext;
  readonly options: StreamOptions;
}

export type AgentSessionRequestStreamOptions = (
  context: AgentSessionRequestStreamOptionsContext,
) => StreamOptions | Promise<StreamOptions>;

const mergeStreamOptions = (base: StreamOptions, derived: StreamOptions): StreamOptions => {
  if (!derived) {
    return base;
  }

  const headers = base?.headers || derived.headers ? { ...base?.headers, ...derived.headers } : undefined;
  const metadata = base?.metadata || derived.metadata ? { ...base?.metadata, ...derived.metadata } : undefined;
  const merged: DefinedStreamOptions = { ...base, ...derived };

  if (headers) {
    merged.headers = headers;
  } else {
    delete merged.headers;
  }
  if (metadata) {
    merged.metadata = metadata;
  } else {
    delete merged.metadata;
  }

  return merged;
};

/**
 * Installs a per-request options hook on PI's public session agent stream function.
 *
 * The hook only augments the options passed into PI's existing stream function, so
 * PI still resolves `model.api` through its normal provider registry and still
 * applies its auth, attribution-header, retry, timeout, and provider dispatch logic.
 */
export const installRequestStreamOptionsHook = (
  session: AgentSessionWithStreamFunction,
  requestStreamOptions: AgentSessionRequestStreamOptions,
): void => {
  const streamFn = session.agent.streamFn.bind(session.agent);

  session.agent.streamFn = async (model, context, options) => {
    const derivedOptions = await requestStreamOptions({ model, context, options });
    return streamFn(model, context, mergeStreamOptions(options, derivedOptions));
  };
};
