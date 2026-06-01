import type {
  AgentSession,
  AgentSessionEvent,
  AgentSessionEventListener,
  PromptOptions,
} from "@earendil-works/pi-coding-agent";

export type PiSdkSession = AgentSession;
export type PiSessionEvent = AgentSessionEvent;
export type PiSessionEventListener = AgentSessionEventListener;
export type PiPromptOptions = PromptOptions;

/**
 * Minimal public PI session surface used by pi-effect.
 *
 * Keeping wrapper code against this structural contract lets tests use fakes
 * while production callers still receive the public SDK AgentSession object.
 */
export interface PiSessionLike {
  readonly sessionId?: string;
  prompt(text: string, options?: PromptOptions): Promise<void>;
  abort(): Promise<void>;
  subscribe(listener: AgentSessionEventListener): () => void;
  dispose(): void;
}
