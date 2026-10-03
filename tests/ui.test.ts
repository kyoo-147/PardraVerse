import { describe, expect, it } from "vitest";
import { emptyState } from "../src/store.js";
import { contentText, createShellModel, formatTurnTime } from "../src/ui/view-model.js";

describe("PardraVerse TUI view model", () => {
  it("shows explicit empty states without invented rows", async () => {
    const model = await createShellModel("./workspace", { state: emptyState(), aiAvailable: false });
    expect(model.mode).toBe("local-only");
    expect(model.sessionItems).toEqual([{ id: "empty", label: "Empty · no sessions", detail: "start a practice session" }]);
    expect(model.agentItems).toEqual(["Unavailable · AI provider"]);
    expect(model.lastAttempt).toBeUndefined();
  });

  it("renders actual active session and attempt metadata", async () => {
    const state = emptyState();
    state.topics.push({ id: "arrays", name: "Arrays", description: "", createdAt: "2026-01-01" });
    state.problems.push({ id: "prefix", title: "Prefix sums", topic: "arrays", difficulty: "medium", language: "javascript", statement: "", constraints: [], tests: [], createdAt: "2026-01-01" });
    state.activeSession = { problemId: "prefix", goal: "practice scans", startedAt: "2026-01-01T00:00:00.000Z" };
    state.attempts.push({ id: "attempt-1", problemId: "prefix", at: "2026-01-01T00:01:00.000Z", passed: 1, total: 1, durationMs: 4, verdict: "accepted" });
    const model = await createShellModel(".", { state, aiAvailable: true, modelLabel: "test-model" });
    expect(model.sessionLabel).toBe("practice scans");
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
    const model = await createShellModel(".", { state: emptyState(), aiAvailable: false });
    const output = [...makeHeader(model).render(120), ...makeSidebar(model).render(28), ...makeContext(model).render(36), ...makeTabs(model).render(80)].join("\n");
    expect(output).toContain("WORKSPACES");
    expect(output).toContain("SESSION CONTEXT");
    expect(output).toContain("Empty · no sessions");
    expect(output).not.toMatch(/\bsession 1\b|\bsession 2\b|\bPARDRA AGENT\b/i);
  });
});
