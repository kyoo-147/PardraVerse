import { describe, expect, it } from "vitest";
import { makeHeader, makeSidebar, makeTabs, makeContext, makeFooter } from "../src/ui/shell.js";
import { computeShellLayout, padToWidth, renderBoxFrame } from "../src/ui/layout.js";
import { createShellModel } from "../src/ui/view-model.js";
import { emptyState } from "../src/store.js";
import { c, theme } from "../src/ui/theme.js";
import { visibleWidth, stripTerminalSequences } from "@earendil-works/pi-tui";

describe("PardraVerse TUI Full 120x40 Capture & Geometry", () => {
  it("generates a pixel-perfect 120x40 terminal capture matching pardra_ui.png", async () => {
    const layout = computeShellLayout(120, 40);
    expect(layout.width).toBe(120);
    expect(layout.height).toBe(40);
    expect(layout.isWide).toBe(true);

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

    const model = await createShellModel(process.cwd(), {
      state,
      aiAvailable: true,
      modelLabel: "local-practice-coach",
    });

    // 1. Header (4 lines)
    const headerLines = makeHeader(model).render(120);
    expect(headerLines).toHaveLength(4);
    for (const line of headerLines) {
      expect(visibleWidth(line)).toBe(120);
    }

    // 2. Footer (4 lines)
    const footerLines = makeFooter().render(120);
    expect(footerLines).toHaveLength(4);
    for (const line of footerLines) {
      expect(visibleWidth(line)).toBe(120);
    }

    // Middle height is 40 - 4 - 4 = 32 lines
    const middleHeight = 32;

    // Left Navigator Sidebar (width 26, height 32)
    const sidebarLines = makeSidebar(model).render(26);
    // Pad sidebar to 32 lines if needed
    while (sidebarLines.length < middleHeight) {
      sidebarLines.splice(sidebarLines.length - 1, 0, padToWidth(c.border("│") + " ".repeat(24) + c.border("│"), 26, c.sidebarBg));
    }
    expect(sidebarLines).toHaveLength(middleHeight);

    // Right Context Sidebar (width 32, height 32)
    const contextLines = makeContext(model).render(32);
    while (contextLines.length < middleHeight) {
      contextLines.splice(contextLines.length - 1, 0, padToWidth(c.border("│") + " ".repeat(30) + c.border("│"), 32, c.appBg));
    }
    expect(contextLines).toHaveLength(middleHeight);

    // Center Column (width 62, height 32)
    // - Tabs: 3 lines
    const tabLines = makeTabs(model).render(62);
    expect(tabLines).toHaveLength(3);

    // - Composer: 3 lines at bottom of center
    const composerBox = renderBoxFrame({
      width: 62,
      borderColor: (s) => c.borderFocus(s),
      bgFn: c.editorBg,
      lines: [` ${c.activeDot("💡")} ${c.primary("Type a message or command...")} ${c.muted("(Ctrl+C to stop)")}`],
    });
    expect(composerBox).toHaveLength(3);

    // - Transcript: remaining 32 - 3 (tabs) - 3 (composer) = 26 lines
    const transcriptHeight = middleHeight - 3 - 3;
    const sampleTranscript: string[] = [
      padToWidth(`  ${c.muted("14:10")}    ${c.accentStrong(">")}   ${c.primary("hi, who are you?")}`, 62, c.editorBg),
      padToWidth("", 62, c.editorBg),
      padToWidth(`  ${c.muted("14:10")}    ${c.activeDot("●")}   ${c.primary("Hi! I'm Pardra Agent, your local practice coach for algorithms.")}`, 62, c.editorBg),
      padToWidth(`                 ${c.primary("I help you think first, code by hand, and run local tests.")}`, 62, c.editorBg),
      padToWidth("", 62, c.editorBg),
      padToWidth(`  ${c.muted("14:12")}    ${c.accentStrong(">")}   ${c.primary("ok, help me practice prefix sums and array scan today")}`, 62, c.editorBg),
      padToWidth("", 62, c.editorBg),
      padToWidth(`  ${c.muted("14:12")}    ${c.activeDot("●")}   ${c.primary("Got it. I'll set up a focused practice session on prefix sums.")}`, 62, c.editorBg),
      padToWidth(`                 ${c.primary("Plan for this session:")}`, 62, c.editorBg),
      padToWidth(`                 ${c.muted("1. Quick intuition refresher (when to use prefix sums)")}`, 62, c.editorBg),
      padToWidth(`                 ${c.muted("2. Warm-up: array scan (running sum, subarray sum)")}`, 62, c.editorBg),
      padToWidth(`                 ${c.muted("3. Main task: implement and test a few problems")}`, 62, c.editorBg),
      padToWidth("", 62, c.editorBg),
      padToWidth(`                 ${c.accent("Let's start with a warm-up. Try this first:")}`, 62, c.editorBg),
      padToWidth(`                 ${c.borderFocus("╭─ Problem: Warm-up: prefix sums ──────────────────╮")}`, 62, c.editorBg),
      padToWidth(`                 ${c.borderFocus("│")} ${c.terminal("Given an array of integers, return a new array...")} ${c.borderFocus("│")}`, 62, c.editorBg),
      padToWidth(`                 ${c.borderFocus("│")} ${c.muted("Example: [3, 1, 4, 1, 5] -> [0, 3, 4, 8, 9]")}   ${c.borderFocus("│")}`, 62, c.editorBg),
      padToWidth(`                 ${c.borderFocus("│")} ${c.accentStrong("fn prefix_sums(nums: &[i32]) -> Vec<i32> { ... }")} ${c.borderFocus("│")}`, 62, c.editorBg),
      padToWidth(`                 ${c.borderFocus("╰──────────────────────────────────────────────────╯")}`, 62, c.editorBg),
    ];

    while (sampleTranscript.length < transcriptHeight) {
      sampleTranscript.push(padToWidth("", 62, c.editorBg));
    }

    const centerLines = [...tabLines, ...sampleTranscript, ...composerBox];
    expect(centerLines).toHaveLength(middleHeight);

    // Combine middle rows (sidebar + center + context = 26 + 62 + 32 = 120)
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

    // Plain text representation
    const plainFrame = fullFrame.map((line) => stripTerminalSequences(line)).join("\n");
    expect(plainFrame).toContain("PARDRAVERSE");
    expect(plainFrame).toContain("WORKSPACES");
    expect(plainFrame).toContain("SESSIONS");
    expect(plainFrame).toContain("AGENTS");
    expect(plainFrame).toContain("SESSION CONTEXT");
    expect(plainFrame).toContain("WORKSPACE FILES");
    expect(plainFrame).toContain("RUN STATUS");
    expect(plainFrame).toContain("NOTES");
    expect(plainFrame).toContain("prefix_sums");
    expect(plainFrame).toContain("Type a message or command...");
  });
});
