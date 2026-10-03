import { appendFile, mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { AgentMessage } from "@earendil-works/pi-agent-core";

interface StoredChat {
  version: 1;
  id: string;
  createdAt: string;
  updatedAt: string;
  messages: AgentMessage[];
}

export interface RuntimeEvent {
  at: string;
  sessionId: string;
  type: string;
  data?: Record<string, unknown>;
}

export class ChatStore {
  readonly directory: string;
  readonly currentFile: string;
  readonly eventFile: string;
  readonly lockDirectory: string;
  private chat?: StoredChat;

  constructor(readonly root = process.cwd()) {
    this.directory = path.join(root, ".prac", "chat");
    this.currentFile = path.join(this.directory, "current.json");
    this.eventFile = path.join(root, ".prac", "events.jsonl");
    this.lockDirectory = path.join(this.directory, ".write-lock");
  }

  async load(): Promise<StoredChat> {
    if (this.chat) return this.chat;
    let raw: string;
    try {
      raw = await readFile(this.currentFile, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw new Error(`Could not read chat state at ${this.currentFile}: ${(error as Error).message}`);
      }
      const now = new Date().toISOString();
      this.chat = { version: 1, id: randomUUID(), createdAt: now, updatedAt: now, messages: [] };
      await this.persist();
      return this.chat;
    }
    let parsed: StoredChat;
    try {
      parsed = JSON.parse(raw) as StoredChat;
    } catch (error) {
      throw new Error(`Chat state is invalid JSON and was preserved at ${this.currentFile}: ${(error as Error).message}`);
    }
    if (parsed.version !== 1 || !parsed.id || !Array.isArray(parsed.messages)) {
      throw new Error(`Unsupported chat state was preserved at ${this.currentFile}.`);
    }
    this.chat = parsed;
    return this.chat;
  }

  async replaceMessages(messages: AgentMessage[]): Promise<void> {
    const chat = await this.load();
    chat.messages = messages;
    chat.updatedAt = new Date().toISOString();
    await this.persist();
  }

  async reset(): Promise<StoredChat> {
    const current = await this.load();
    await mkdir(path.join(this.directory, "archive"), { recursive: true });
    if (current.messages.length) {
      await writeFile(
        path.join(this.directory, "archive", `${current.createdAt.replace(/[:.]/g, "-")}-${current.id}.json`),
        `${JSON.stringify(current, null, 2)}\n`,
        "utf8",
      );
    }
    const now = new Date().toISOString();
    this.chat = { version: 1, id: randomUUID(), createdAt: now, updatedAt: now, messages: [] };
    await this.persist();
    return this.chat;
  }

  async event(type: string, data?: Record<string, unknown>): Promise<void> {
    const chat = await this.load();
    await mkdir(path.dirname(this.eventFile), { recursive: true });
    const event: RuntimeEvent = { at: new Date().toISOString(), sessionId: chat.id, type, data };
    await appendFile(this.eventFile, `${JSON.stringify(event)}\n`, "utf8");
  }

  private async persist(): Promise<void> {
    if (!this.chat) return;
    await mkdir(this.directory, { recursive: true });
    await this.withWriteLock(async () => {
      const temporary = `${this.currentFile}.${process.pid}.${randomUUID()}.tmp`;
      try {
        await writeFile(temporary, `${JSON.stringify(this.chat, null, 2)}\n`, "utf8");
        await rename(temporary, this.currentFile);
      } finally {
        await rm(temporary, { force: true });
      }
    });
  }

  private async withWriteLock<T>(operation: () => Promise<T>): Promise<T> {
    const deadline = Date.now() + 3_000;
    while (true) {
      try {
        await mkdir(this.lockDirectory);
        break;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
        const age = await stat(this.lockDirectory).then((value) => Date.now() - value.mtimeMs).catch(() => 0);
        if (age > 15_000) {
          await rm(this.lockDirectory, { recursive: true, force: true });
          continue;
        }
        if (Date.now() >= deadline) throw new Error("Timed out waiting for the chat state write lock.");
        await new Promise((resolve) => setTimeout(resolve, 30));
      }
    }
    try {
      return await operation();
    } finally {
      await rm(this.lockDirectory, { recursive: true, force: true });
    }
  }
}
