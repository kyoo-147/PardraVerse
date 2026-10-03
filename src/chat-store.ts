import { appendFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { AgentMessage } from "@earendil-works/pi-agent-core";
import { SessionStore } from "./session-store.js";

export interface StoredChat { version: 1; id: string; title?: string; problem?: string; goal?: string; createdAt: string; updatedAt: string; messages: AgentMessage[]; }
export interface RuntimeEvent { at: string; sessionId: string; type: string; data?: Record<string, unknown>; }

/** Compatibility adapter for the original single-current-chat API. */
export class ChatStore {
  readonly directory: string;
  readonly currentFile: string;
  readonly eventFile: string;
  readonly lockDirectory: string;
  readonly sessions: SessionStore;

  constructor(readonly root = process.cwd()) {
    this.directory = path.join(root, ".prac", "chat");
    this.currentFile = path.join(this.directory, "current.json");
    this.eventFile = path.join(root, ".prac", "events.jsonl");
    this.lockDirectory = path.join(this.directory, ".write-lock");
    this.sessions = new SessionStore(root);
  }

  async load(): Promise<StoredChat> {
    try {
      const parsed = JSON.parse(await readFile(this.currentFile, "utf8")) as StoredChat;
      if (!parsed.id || !Array.isArray(parsed.messages)) throw new Error("unsupported chat state");
      return parsed;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw new Error(`Chat state is invalid and was preserved at ${this.currentFile}: ${(error as Error).message}`);
    }
    const session = await this.sessions.active();
    return { version: 1, id: session.id, title: session.title, problem: session.problem, goal: session.goal, createdAt: session.createdAt, updatedAt: session.updatedAt, messages: session.messages };
  }
  async replaceMessages(messages: AgentMessage[]): Promise<void> { await this.sessions.updateMessages(messages); }
  async reset(): Promise<StoredChat> {
    const current = await this.sessions.active();
    if (current.messages.length) await this.sessions.archive(current.id);
    return this.load();
  }
  async event(type: string, data?: Record<string, unknown>): Promise<void> {
    const chat = await this.load(); await mkdir(path.dirname(this.eventFile), { recursive: true });
    const event: RuntimeEvent = { at: new Date().toISOString(), sessionId: chat.id, type, data };
    await appendFile(this.eventFile, `${JSON.stringify(event)}\n`, "utf8");
  }
}
