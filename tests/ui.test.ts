import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { emptyState } from "../src/store.js";
import { SessionStore } from "../src/session-store.js";
import { contentText, createShellModel, formatTurnTime } from "../src/ui/view-model.js";

const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))));
async function root(): Promise<string> { const value = await mkdtemp(path.join(os.tmpdir(), "pardra-ui-")); roots.push(value); return value; }

describe("PardraVerse TUI view model", () => {
  it("shows explicit empty states without invented rows", async () => {
    const directory = await root();
    const model = await createShellModel(directory, { state: emptyState(), aiAvailable: false });
    expect(model.mode).toBe("local-only");
    expect(model.sessionItems).toHaveLength(1);
    expect(model.sessionItems[0]?.label).toMatch(/^[0-9a-f]{8}$/);
    expect(model.agentItems).toEqual(["Unavailable · AI provider"]);
    expect(model.lastAttempt).toBeUndefined();
  });

  it("renders actual active session and attempt metadata", async () => {
    const state = emptyState();
    state.topics.push({ id: "arrays", name: "Arrays", description: "", createdAt: "2026-01-01" });
    state.problems.push({ id: "prefix", title: "Prefix sums", topic: "arrays", difficulty: "medium", language: "javascript", statement: "", constraints: [], tests: [], createdAt: "2026-01-01" });
    state.activeSession = { problemId: "prefix", goal: "practice scans", startedAt: "2026-01-01T00:00:00.000Z" };
    state.attempts.push({ id: "attempt-1", problemId: "prefix", at: "2026-01-01T00:01:00.000Z", passed: 1, total: 1, durationMs: 4, verdict: "accepted" });
    const directory = await root();
    const sessions = new SessionStore(directory);
    await sessions.create({ title: "Prefix practice", goal: "practice scans" });
    const model = await createShellModel(directory, { state, aiAvailable: true, modelLabel: "test-model", sessions });
    expect(model.sessionLabel).toBe("Prefix practice");
    expect(model.activeProblem?.title).toBe("Prefix sums");
    expect(model.lastAttempt?.verdict).toBe("accepted");
    expect(model.agentItems).toEqual(["configured practice coach"]);
  });

  it("extracts text blocks without speaker headings", () => {
    expect(contentText([{ type: "text", text: "hello" }, { type: "image", text: "ignored" }])).toBe("hello");
    expect(contentText("plain")).toBe("plain");
    expect(contentText(undefined)).toBe("");
  });

  it("formats timestamps safely", () => {
    expect(formatTurnTime()).toBe("--:--");
    expect(formatTurnTime(Number.NaN)).toBe("--:--");
    expect(formatTurnTime(Date.UTC(2020, 0, 1, 3, 4))).toMatch(/^\d{2}:\d{2}$/);
  });

  it("renders shell regions without invented speaker labels", async () => {
    const { makeHeader, makeSidebar, makeContext, makeTabs } = await import("../src/ui/shell.js");
    const model = await createShellModel(await root(), { state: emptyState(), aiAvailable: false });
    const output = [...makeHeader(model).render(120), ...makeSidebar(model).render(28), ...makeContext(model).render(36), ...makeTabs(model).render(80)].join("\n");
    expect(output).toContain("WORKSPACES");
    expect(output).toContain("SESSION CONTEXT");
    expect(output).toContain("0 messages");
    expect(output).not.toMatch(/\bsession 1\b|\bsession 2\b|\bPARDRA AGENT\b/i);
  });
});
