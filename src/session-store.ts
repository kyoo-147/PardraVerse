import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { AgentMessage } from "@earendil-works/pi-agent-core";
import type { ConversationSession, SessionStatus } from "./types.js";

interface SessionIndex { version: 1; activeId: string; sessions: Array<Omit<ConversationSession, "messages">>; }
export type SessionSummary = Omit<ConversationSession, "messages"> & { messageCount: number };
export interface CreateSessionOptions { title?: string; problem?: string; goal?: string; messages?: AgentMessage[]; }

export class SessionStore {
  readonly directory: string;
  readonly sessionsDirectory: string;
  readonly indexFile: string;
  readonly currentFile: string;
  readonly lockDirectory: string;

  constructor(readonly root = process.cwd()) {
    this.directory = path.join(root, ".prac", "chat");
    this.sessionsDirectory = path.join(this.directory, "sessions");
    this.indexFile = path.join(this.directory, "sessions.json");
    this.currentFile = path.join(this.directory, "current.json");
    this.lockDirectory = path.join(this.directory, ".write-lock");
  }

  async list(options?: { includeArchived?: boolean }): Promise<SessionSummary[]> {
    const index = await this.ensureIndex();
    const result: SessionSummary[] = [];
    for (const summary of index.sessions) {
      if (!options?.includeArchived && summary.status === "archived") continue;
      const session = await this.readSession(summary.id);
      result.push({ ...summary, messageCount: session.messages.length });
    }
    return result.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async create(options: CreateSessionOptions = {}): Promise<ConversationSession> {
    return this.withWriteLock(async () => {
      const index = await this.ensureIndex();
      const now = new Date().toISOString();
      const session: ConversationSession = { version: 1, id: randomUUID(), ...options, createdAt: now, updatedAt: now, status: "active", messages: options.messages ?? [] };
      index.sessions.push(this.summaryOf(session));
      index.activeId = session.id;
      await this.writeSession(session);
      await this.writeIndex(index);
      await this.writeCurrent(session);
      return session;
    });
  }

  async open(id: string): Promise<ConversationSession> {
    return this.withWriteLock(async () => {
      const index = await this.ensureIndex();
      const session = await this.readSessionFromIndex(index, id);
      if (session.status === "archived") throw new Error(`Session is archived: ${id}`);
      index.activeId = id;
      await this.writeIndex(index);
      await this.writeCurrent(session);
      return session;
    });
  }

  async active(): Promise<ConversationSession> {
    const index = await this.ensureIndex();
    return this.readSessionFromIndex(index, index.activeId);
  }

  async updateMessages(messages: AgentMessage[]): Promise<ConversationSession> {
    return this.withWriteLock(async () => {
      const index = await this.ensureIndex();
      const session = await this.readSessionFromIndex(index, index.activeId);
      session.messages = messages;
      session.updatedAt = new Date().toISOString();
      this.replaceSummary(index, session);
      await this.writeSession(session);
      await this.writeIndex(index);
      await this.writeCurrent(session);
      return session;
    });
  }

  async rename(id: string, title: string): Promise<SessionSummary> {
    return this.withWriteLock(async () => {
      const index = await this.ensureIndex();
      const session = await this.readSessionFromIndex(index, id);
      session.title = title.trim() || undefined;
      session.updatedAt = new Date().toISOString();
      this.replaceSummary(index, session);
      await this.writeSession(session); await this.writeIndex(index);
      if (index.activeId === id) await this.writeCurrent(session);
      return { ...this.summaryOf(session), messageCount: session.messages.length };
    });
  }

  async archive(id: string): Promise<SessionSummary> {
    return this.withWriteLock(async () => {
      const index = await this.ensureIndex();
      const session = await this.readSessionFromIndex(index, id);
      session.status = "archived"; session.updatedAt = new Date().toISOString();
      this.replaceSummary(index, session);
      if (index.activeId === id) {
        const next = index.sessions.find((item) => item.id !== id && item.status === "active");
        if (next) index.activeId = next.id;
        else {
          const created = this.newSession();
          await this.writeSession(created); index.sessions.push(this.summaryOf(created)); index.activeId = created.id;
        }
      }
      await this.writeSession(session); await this.writeIndex(index);
      await this.writeCurrent(await this.readSessionFromIndex(index, index.activeId));
      return { ...this.summaryOf(session), messageCount: session.messages.length };
    });
  }

  async delete(id: string): Promise<void> {
    return this.withWriteLock(async () => {
      const index = await this.ensureIndex();
      await this.readSessionFromIndex(index, id);
      if (index.sessions.length === 1) throw new Error("Cannot delete the only session.");
      index.sessions = index.sessions.filter((item) => item.id !== id);
      await rm(this.sessionFile(id), { force: true });
      if (index.activeId === id) index.activeId = index.sessions.find((item) => item.status === "active")?.id ?? index.sessions[0]!.id;
      await this.writeIndex(index); await this.writeCurrent(await this.readSessionFromIndex(index, index.activeId));
    });
  }

  private newSession(): ConversationSession { const now = new Date().toISOString(); return { version: 1, id: randomUUID(), createdAt: now, updatedAt: now, status: "active", messages: [] }; }
  private summaryOf(session: ConversationSession): Omit<ConversationSession, "messages"> { const { messages: _messages, ...summary } = session; return summary; }
  private replaceSummary(index: SessionIndex, session: ConversationSession): void { index.sessions = index.sessions.map((item) => item.id === session.id ? this.summaryOf(session) : item); }
  private sessionFile(id: string): string { return path.join(this.sessionsDirectory, `${id}.json`); }

  private async ensureIndex(): Promise<SessionIndex> {
    await mkdir(this.sessionsDirectory, { recursive: true });
    try { return JSON.parse(await readFile(this.indexFile, "utf8")) as SessionIndex; }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw new Error(`Session index is invalid and was preserved at ${this.indexFile}: ${(error as Error).message}`);
      return this.migrateLegacy();
    }
  }

  private async migrateLegacy(): Promise<SessionIndex> {
    let current: ConversationSession;
    try {
      const parsed = JSON.parse(await readFile(this.currentFile, "utf8")) as Partial<ConversationSession>;
      if (!parsed.id || !Array.isArray(parsed.messages)) throw new Error("unsupported chat state");
      current = { version: 1, id: parsed.id, createdAt: parsed.createdAt ?? new Date().toISOString(), updatedAt: parsed.updatedAt ?? new Date().toISOString(), status: "active", title: parsed.title, problem: parsed.problem, goal: parsed.goal, messages: parsed.messages };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") current = this.newSession();
      else throw new Error(`Chat state is invalid and was preserved at ${this.currentFile}: ${(error as Error).message}`);
    }
    await this.writeSession(current);
    const sessions: Array<Omit<ConversationSession, "messages">> = [this.summaryOf(current)];
    const archiveDirectory = path.join(this.directory, "archive");
    for (const file of await readdir(archiveDirectory).catch(() => [] as string[])) {
      if (!file.endsWith(".json")) continue;
      try {
        const parsed = JSON.parse(await readFile(path.join(archiveDirectory, file), "utf8")) as Partial<ConversationSession>;
        if (!parsed.id || !Array.isArray(parsed.messages) || sessions.some((item) => item.id === parsed.id)) continue;
        const archived: ConversationSession = { version: 1, id: parsed.id, createdAt: parsed.createdAt ?? new Date().toISOString(), updatedAt: parsed.updatedAt ?? parsed.createdAt ?? new Date().toISOString(), status: "archived", title: parsed.title, problem: parsed.problem, goal: parsed.goal, messages: parsed.messages };
        await this.writeSession(archived); sessions.push(this.summaryOf(archived));
      } catch { /* Leave malformed legacy archives untouched; current remains recoverable. */ }
    }
    const index: SessionIndex = { version: 1, activeId: current.id, sessions };
    await this.writeIndex(index); await this.writeCurrent(current);
    return index;
  }

  private async readSessionFromIndex(index: SessionIndex, id: string): Promise<ConversationSession> {
    const summary = index.sessions.find((item) => item.id === id);
    if (!summary) throw new Error(`Unknown session: ${id}`);
    return this.readSession(id);
  }
  private async readSession(id: string): Promise<ConversationSession> {
    try { const parsed = JSON.parse(await readFile(this.sessionFile(id), "utf8")) as ConversationSession; if (!Array.isArray(parsed.messages)) throw new Error("messages must be an array"); return parsed; }
    catch (error) { throw new Error(`Session ${id} is corrupt and was preserved at ${this.sessionFile(id)}: ${(error as Error).message}`); }
  }
  private async writeSession(session: ConversationSession): Promise<void> { await mkdir(this.sessionsDirectory, { recursive: true }); await this.atomicWrite(this.sessionFile(session.id), session); }
  private async writeCurrent(session: ConversationSession): Promise<void> { await this.atomicWrite(this.currentFile, session); }
  private async writeIndex(index: SessionIndex): Promise<void> { await this.atomicWrite(this.indexFile, index); }
  private async atomicWrite(file: string, value: unknown): Promise<void> { const temporary = `${file}.${process.pid}.${randomUUID()}.tmp`; try { await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8"); await rename(temporary, file); } finally { await rm(temporary, { force: true }); } }
  private async withWriteLock<T>(operation: () => Promise<T>): Promise<T> {
    await mkdir(this.directory, { recursive: true }); const deadline = Date.now() + 5000;
    while (true) { try { await mkdir(this.lockDirectory); break; } catch (error) { if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error; const age = await stat(this.lockDirectory).then((s) => Date.now() - s.mtimeMs).catch(() => 0); if (age > 15000) { await rm(this.lockDirectory, { recursive: true, force: true }); continue; } if (Date.now() >= deadline) throw new Error("Timed out waiting for the session write lock."); await new Promise((resolve) => setTimeout(resolve, 30)); } }
    try { return await operation(); } finally { await rm(this.lockDirectory, { recursive: true, force: true }); }
  }
}
