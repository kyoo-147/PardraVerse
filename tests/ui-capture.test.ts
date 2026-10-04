import { describe, expect, it } from "vitest";
import { makeHeader, makeSidebar, makeTabs, makeContext, makeFooter } from "../src/ui/shell.js";
import { computeShellLayout, padToWidth, renderBoxFrame } from "../src/ui/layout.js";
import { createShellModel } from "../src/ui/view-model.js";
import { emptyState } from "../src/store.js";
import { c } from "../src/ui/theme.js";
import { visibleWidth, stripTerminalSequences } from "@earendil-works/pi-tui";

describe("PardraVerse TUI Shell Geometry and Truthful Content", () => {
  it("validates 120x40 shell layout geometry and box framing with state-backed data", async () => {
    const layout = computeShellLayout(120, 40);
    expect(layout.width).toBe(120);
    expect(layout.height).toBe(40);
    expect(layout.isWide).toBe(true);
    expect(layout.isCompact).toBe(false);
    expect(layout.sidebarWidth).toBe(30);
    expect(layout.contextWidth).toBe(34);
    expect(layout.centerWidth).toBe(56);

    const state = emptyState();
    state.topics.push({ id: "arrays", name: "Arrays", description: "", createdAt: "2026-01-01" });
    state.problems.push({
      id: "prefix",
      title: "Warm-up: prefix sums (array scan)",
      topic: "arrays",
      difficulty: "medium",
      language: "javascript",
      statement: "Given an array of integers, return a new array where each element is the sum of all previous elements.",
      constraints: [],
      tests: [],
      createdAt: "2026-01-01",
    });
    state.activeSession = {
      problemId: "prefix",
      goal: "Practice prefix sums and array scan",
      startedAt: "2026-01-01T00:00:00.000Z",
    };
    state.attempts.push({
      id: "attempt-1",
      problemId: "prefix",
      at: "2026-01-01T00:14:00.000Z",
      passed: 1,
      total: 1,
      durationMs: 5,
      verdict: "accepted",
    });
    state.sources.push({
      id: "src-1",
      title: "Prefix sum array scan notes",
      url: "https://example.com/prefix",
      goal: "practice",
      addedAt: "2026-01-01T00:00:00.000Z",
    });

    const model = await createShellModel(process.cwd(), {
      state,
      aiAvailable: true,
      modelLabel: "local-practice-coach",
    });

    // 1. Header (4 lines at 120 width)
    const headerLines = makeHeader(model).render(120);
    expect(headerLines).toHaveLength(4);
    for (const line of headerLines) {
      expect(visibleWidth(line)).toBe(120);
    }

    // 2. Footer (4 lines at 120 width)
    const footerLines = makeFooter(model).render(120);
    expect(footerLines).toHaveLength(4);
    for (const line of footerLines) {
      expect(visibleWidth(line)).toBe(120);
    }

    // 3. Middle section (40 - 4 - 4 = 32 lines)
    const middleHeight = 32;

    // Left Navigator: width 30
    const sidebarLines = makeSidebar(model).render(30);
    while (sidebarLines.length < middleHeight) {
      sidebarLines.splice(sidebarLines.length - 1, 0, padToWidth(c.border("│") + " ".repeat(28) + c.border("│"), 30, c.sidebarBg));
    }
    expect(sidebarLines).toHaveLength(middleHeight);

    // Right Context: width 34
    const contextLines = makeContext(model).render(34);
    while (contextLines.length < middleHeight) {
      contextLines.splice(contextLines.length - 1, 0, padToWidth(c.border("│") + " ".repeat(32) + c.border("│"), 34, c.appBg));
    }
    expect(contextLines).toHaveLength(middleHeight);

    // Center Column: width 56 (Tabs: 3, Transcript: 25, Composer: 3, Status: 1)
    const tabLines = makeTabs(model).render(56);
    expect(tabLines).toHaveLength(3);

    const composerBox = renderBoxFrame({
      width: 56,
      borderColor: (s) => c.borderFocus(s),
      bgFn: c.editorBg,
      lines: [` ${c.activeDot("💡")} ${c.primary("Type a message or command...")} ${c.muted("(Ctrl+C to stop)")}`],
    });
    expect(composerBox).toHaveLength(3);

    const transcriptHeight = middleHeight - 3 - 3 - 1;
    const transcriptLines: string[] = [];
    while (transcriptLines.length < transcriptHeight) {
      transcriptLines.push(padToWidth("", 56, c.editorBg));
    }

    const statusLine = padToWidth(`  ${c.muted("message or command · /help")}`, 56, c.editorBg);
    const centerLines = [...tabLines, ...transcriptLines, ...composerBox, statusLine];
    expect(centerLines).toHaveLength(middleHeight);

    // Combine 3 columns horizontally: 30 + 56 + 34 = 120
    const middleLines: string[] = [];
    for (let i = 0; i < middleHeight; i++) {
      const row = (sidebarLines[i] ?? "") + (centerLines[i] ?? "") + (contextLines[i] ?? "");
      expect(visibleWidth(row)).toBe(120);
      middleLines.push(row);
    }

    // Full 120x40 frame
    const fullFrame = [...headerLines, ...middleLines, ...footerLines];
    expect(fullFrame).toHaveLength(40);
    for (const row of fullFrame) {
      expect(visibleWidth(row)).toBe(120);
    }

    const plainFrame = fullFrame.map((line) => stripTerminalSequences(line)).join("\n");

    // Verify truthful header metadata
    expect(plainFrame).toContain("PARDRAVERSE");
    expect(plainFrame).toContain("local-first practice coach");
    expect(plainFrame).toContain("PRACTICE COACH");

    // Verify left column: real problems and sessions only
    expect(plainFrame).toContain("PROBLEMS");
    expect(plainFrame).toContain("Warm-up: prefix sums");
    expect(plainFrame).toContain("SESSIONS");
    expect(plainFrame).not.toContain("WORKSPACES");
    expect(plainFrame).not.toContain("AGENTS");

    // Verify right column: state-backed context, timer, attempts, sources
    expect(plainFrame).toContain("SESSION CONTEXT");
    expect(plainFrame).toContain("Practice prefix sums");
    expect(plainFrame).toContain("Warm-up: prefix sums");
    expect(plainFrame).toContain("MEDIUM");
    expect(plainFrame).toContain("WORKSPACE FILES");
    expect(plainFrame).toContain("RUN STATUS");
    expect(plainFrame).toContain("ACCEPTED");
    expect(plainFrame).toContain("1/1 accepted");
    expect(plainFrame).toContain("NOTES");
    expect(plainFrame).toContain("Prefix sum array");

    // Verify no fabricated elements
    expect(plainFrame).not.toContain("watching for file changes");
    expect(plainFrame).not.toContain("focus on core patterns");
    expect(plainFrame).not.toContain("/agents");
    expect(plainFrame).not.toContain("Ctrl+L");
    expect(plainFrame).not.toContain("TPS:");
    expect(plainFrame).not.toContain("CPU");
    expect(plainFrame).not.toContain("RAM");
  });

  it("validates truthful empty states when state has no problems, attempts, or notes", async () => {
    const model = await createShellModel(process.cwd(), {
      state: emptyState(),
      aiAvailable: false,
    });

    const sidebar = makeSidebar(model).render(26).join("\n");
    expect(sidebar).toContain("PROBLEMS");
    expect(sidebar).toContain("Empty · no problems");
    expect(sidebar).toContain("SESSIONS");
    expect(sidebar).not.toContain("WORKSPACES");
    expect(sidebar).not.toContain("AGENTS");

    const context = makeContext(model).render(32).join("\n");
    expect(context).toContain("SESSION CONTEXT");
    expect(context).toContain("Empty · no active goal");
    expect(context).toContain("Empty · no active problem");
    expect(context).toContain("Not started");
    expect(context).toContain("Empty · no attempts");
    expect(context).toContain("Empty · no notes or sources");
    expect(context).not.toContain("watching for file changes");
    expect(context).not.toContain("focus on core patterns");

    const tabs = makeTabs(model).render(60).join("\n");
    expect(tabs).not.toContain("×");
    expect(tabs).not.toContain("+");

    const footer = makeFooter(model).render(100).join("\n");
    expect(footer).toContain("PARDRAVERSE");
    expect(footer).toContain("/help");
    expect(footer).toContain("/new [title]");
    expect(footer).toContain("/sessions");
    expect(footer).not.toContain("/agents");
    expect(footer).not.toContain("Ctrl+L");
    expect(footer).not.toContain("TPS:");
  });

  it("validates responsive compact mode geometry below breakpoint (< 96 columns)", async () => {
    const layout = computeShellLayout(80, 24);
    expect(layout.isCompact).toBe(true);
    expect(layout.isWide).toBe(false);
    expect(layout.sidebarWidth).toBe(0);
    expect(layout.contextWidth).toBe(0);
    expect(layout.centerWidth).toBe(80);

    const model = await createShellModel(process.cwd(), {
      state: emptyState(),
      aiAvailable: true,
    });

    const header = makeHeader(model).render(80);
    for (const line of header) {
      expect(visibleWidth(line)).toBe(80);
    }

    const footer = makeFooter(model).render(80);
    for (const line of footer) {
      expect(visibleWidth(line)).toBe(80);
    }
  });
});
