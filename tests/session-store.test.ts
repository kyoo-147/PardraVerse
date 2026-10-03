import { mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { SessionStore } from "../src/session-store.js";

const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))));
async function root() { const value = await mkdtemp(path.join(os.tmpdir(), "prac-sessions-")); roots.push(value); return value; }

describe("SessionStore", () => {
  it("creates, switches, and restores named sessions", async () => {
    const dir = await root(); const store = new SessionStore(dir);
    const first = await store.create({ title: "Arrays", goal: "practice" });
    await store.updateMessages([{ role: "user", content: "hello", timestamp: 1 }]);
    const second = await store.create({ title: "Graphs" });
    expect((await store.active()).id).toBe(second.id);
    await store.open(first.id);
    expect((await new SessionStore(dir).active()).messages).toHaveLength(1);
    expect((await store.list()).map((item) => item.title)).toContain("Arrays");
  });
  it("migrates current and legacy archive", async () => {
    const dir = await root(); const chat = path.join(dir, ".prac", "chat"); await mkdir(path.join(chat, "archive"), { recursive: true });
    const old = { version: 1, id: "old", createdAt: "2024-01-01T00:00:00.000Z", updatedAt: "2024-01-01T00:00:00.000Z", messages: [] };
    await writeFile(path.join(chat, "current.json"), JSON.stringify({ ...old, id: "current", messages: [{ role: "user", content: "now" }] }));
    await writeFile(path.join(chat, "archive", "old.json"), JSON.stringify(old));
    const store = new SessionStore(dir); expect((await store.active()).id).toBe("current");
    expect((await store.list({ includeArchived: true })).length).toBe(2);
  });
  it("preserves corrupt current state", async () => {
    const dir = await root(); const chat = path.join(dir, ".prac", "chat"); await mkdir(chat, { recursive: true });
    await writeFile(path.join(chat, "current.json"), "{broken");
    await expect(new SessionStore(dir).active()).rejects.toThrow("preserved");
    expect(await readFile(path.join(chat, "current.json"), "utf8")).toBe("{broken");
  });
  it("archives and deletes sessions", async () => {
    const dir = await root(); const store = new SessionStore(dir); const first = await store.create({ title: "one" }); const second = await store.create({ title: "two" });
    await store.archive(first.id); expect((await store.list()).map((item) => item.id)).toContain(second.id);
    await store.delete(first.id); expect((await store.list({ includeArchived: true })).map((item) => item.id)).not.toContain(first.id);
  });
});
