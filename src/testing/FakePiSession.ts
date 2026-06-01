import type { AgentSessionEvent, AgentSessionEventListener, PromptOptions } from "@earendil-works/pi-coding-agent";
import type { PiSessionLike } from "../session/PiSession.js";

export interface FakePiSessionOptions {
  readonly sessionId?: string;
  readonly prompt?: (text: string, options?: PromptOptions) => Promise<void>;
  readonly abort?: () => Promise<void>;
}

export class FakePiSession implements PiSessionLike {
  readonly sessionId: string;
  readonly prompts: Array<{ readonly text: string; readonly options: PromptOptions | undefined }> = [];
  abortCount = 0;
  disposeCount = 0;
  unsubscribeCount = 0;

  private readonly listeners = new Set<AgentSessionEventListener>();
  private readonly promptImpl: (text: string, options?: PromptOptions) => Promise<void>;
  private readonly abortImpl: () => Promise<void>;

  get listenerCount(): number {
    return this.listeners.size;
  }

  constructor(options: FakePiSessionOptions = {}) {
    this.sessionId = options.sessionId ?? "fake-session";
    this.promptImpl = options.prompt ?? (async () => {});
    this.abortImpl = options.abort ?? (async () => {});
  }

  async prompt(text: string, options?: PromptOptions): Promise<void> {
    this.prompts.push({ text, options });
    await this.promptImpl(text, options);
  }

  async abort(): Promise<void> {
    this.abortCount += 1;
    await this.abortImpl();
  }

  subscribe(listener: AgentSessionEventListener): () => void {
    this.listeners.add(listener);
    let active = true;
    return () => {
      if (!active) return;
      active = false;
      this.unsubscribeCount += 1;
      this.listeners.delete(listener);
    };
  }

  emit(event: AgentSessionEvent): void {
    for (const listener of [...this.listeners]) listener(event);
  }

  dispose(): void {
    this.disposeCount += 1;
  }
}

export const fakePiSessionFactory = (session = new FakePiSession()) => async () => ({ session });
