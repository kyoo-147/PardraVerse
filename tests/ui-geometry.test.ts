import { describe, expect, it } from "vitest";
import {
  theme,
  TerminalThemeManager,
} from "../src/ui/theme.js";
import {
  computeShellLayout,
  renderBoxFrame,
} from "../src/ui/layout.js";
import {
  makeHeader,
  makeSidebar,
  makeTabs,
  makeContext,
  makeFooter,
} from "../src/ui/shell.js";
import { createShellModel } from "../src/ui/view-model.js";
import { emptyState } from "../src/store.js";
import { visibleWidth } from "@earendil-works/pi-tui";

describe("PardraVerse Cream Terminal Theme & Tokens", () => {
  it("matches cream terminal design token specifications", () => {
    expect(theme.colors.background.app).toBe("#FDF7E9");
    expect(theme.colors.background.editor).toBe("#FDF6E3");
    expect(theme.colors.background.sidebar).toBe("#EEE8D5");
    expect(theme.colors.text.primary).toBe("#4C5575");
    expect(theme.colors.text.terminal).toBe("#657B83");
    expect(theme.colors.text.strong).toBe("#271850");
    expect(theme.colors.border.DEFAULT).toBe("#DCD7C6");
    expect(theme.colors.border.subtle).toBe("#E6DEC8");
    expect(theme.colors.accent.DEFAULT).toBe("#8E43EF");
    expect(theme.colors.accent.strong).toBe("#7C25EE");
    expect(theme.colors.accent.tint).toBe("#EFE4EE");
    expect(theme.colors.status.active).toBe("#E8D95E");
    expect(theme.colors.status.success).toBe("#55A86B");
  });

  it("manages OSC 10/11 terminal theme sequences with safe, idempotent restoration", () => {
    const outputs: string[] = [];
    const mockTerminal = {
      write(data: string) {
        outputs.push(data);
      },
    };

    const manager = new TerminalThemeManager(mockTerminal);
    manager.applyTheme();
    expect(outputs.length).toBeGreaterThan(0);
    const applied = outputs.join("");
    // OSC 11 sets background, OSC 10 sets foreground
    expect(applied).toContain("]11;");
    expect(applied).toContain("]10;");

    outputs.length = 0;
    manager.restoreTheme();
    const restored = outputs.join("");
    // OSC 111 resets background, OSC 110 resets foreground
    expect(restored).toContain("]111");
    expect(restored).toContain("]110");

    // Idempotent restoration: calling restore again should not spam or throw
    outputs.length = 0;
    manager.restoreTheme();
    expect(outputs.length).toBe(0);
  });
});

describe("Pure Layout Engine Geometry", () => {
  it("computes 120x40 standard desktop geometry correctly", () => {
    const layout = computeShellLayout(120, 40);
    expect(layout.isWide).toBe(true);
    expect(layout.isCompact).toBe(false);
    expect(layout.sidebarWidth).toBe(30);
    expect(layout.contextWidth).toBe(34);
    expect(layout.centerWidth).toBe(120 - 30 - 34); // 56 cols: readable transcript width
    expect(layout.headerHeight).toBe(4);
    expect(layout.tabsHeight).toBe(3);
    expect(layout.composerHeight).toBe(3);
    expect(layout.statusHeight).toBe(1);
    expect(layout.footerHeight).toBe(4);
    expect(layout.centerHeight).toBe(40 - 4 - 3 - 3 - 1 - 4); // 25 rows of transcript
  });

  it("handles medium breakpoint geometry (96 to 109 cols)", () => {
    const layout = computeShellLayout(100, 30);
    expect(layout.isWide).toBe(false);
    expect(layout.isCompact).toBe(false);
    expect(layout.sidebarWidth).toBe(24);
    expect(layout.contextWidth).toBe(0);
    expect(layout.centerWidth).toBe(100 - 24); // 76 cols
    expect(layout.headerHeight).toBe(4);
    expect(layout.footerHeight).toBe(4);
    expect(layout.centerHeight).toBe(30 - 4 - 3 - 3 - 1 - 4); // 15 rows
  });

  it("handles wide desktop geometry (> 120 cols)", () => {
    const layout140 = computeShellLayout(140, 40);
    expect(layout140.isWide).toBe(true);
    expect(layout140.isCompact).toBe(false);
    expect(layout140.sidebarWidth).toBe(30);
    expect(layout140.contextWidth).toBe(34);
    expect(layout140.centerWidth).toBe(76);

    const layout160 = computeShellLayout(160, 45);
    expect(layout160.isWide).toBe(true);
    expect(layout160.sidebarWidth).toBe(30);
    expect(layout160.contextWidth).toBe(34);
    expect(layout160.centerWidth).toBe(96);
  });

  it("handles intentional compact mode below breakpoint (< 96 cols)", () => {
    const layout = computeShellLayout(80, 24);
    expect(layout.isCompact).toBe(true);
    expect(layout.isWide).toBe(false);
    expect(layout.sidebarWidth).toBe(0);
    expect(layout.contextWidth).toBe(0);
    expect(layout.centerWidth).toBe(80);
    expect(layout.headerHeight).toBe(3);
    expect(layout.footerHeight).toBe(3);
  });

  it("renders thin boxed frames with consistent width and box characters", () => {
    const lines = ["Line 1", "Line 2"];
    const framed = renderBoxFrame({
      width: 30,
      title: "TEST",
      rightBadge: "14m",
      lines,
    });

    expect(framed.length).toBe(lines.length + 2); // top + 2 content + bottom = 4
    for (const row of framed) {
      expect(visibleWidth(row)).toBe(30);
    }
    expect(framed[0]).toContain("┌");
    expect(framed[0]).toContain("TEST");
    expect(framed[0]).toContain("14m");
    expect(framed[0]).toContain("┐");
    expect(framed[framed.length - 1]).toContain("└");
    expect(framed[framed.length - 1]).toContain("┘");
  });
});

describe("Boxed Components Rendering", () => {
  it("renders boxed header with metadata columns", async () => {
    const model = await createShellModel(process.cwd(), {
      state: emptyState(),
      aiAvailable: true,
      modelLabel: "test-model",
    });
    const header = makeHeader(model);
    const lines = header.render(120);
    expect(lines.length).toBeGreaterThanOrEqual(3);
    expect(lines[0]).toContain("┌");
    expect(lines[0]).toContain("┐");
    const joined = lines.join("\n");
    expect(joined).toContain("PARDRAVERSE");
    expect(joined).toContain("local-first practice coach");
    expect(joined).toContain("PRACTICE COACH");
    expect(joined).toContain("workspace");
    expect(joined).toContain("session");
  });

  it("aligns header metadata column separators vertically between row 1 and row 2", async () => {
    const model = await createShellModel(process.cwd(), {
      state: emptyState(),
      aiAvailable: true,
      modelLabel: "test-model",
    });
    const header = makeHeader(model);
    const lines = header.render(120);
    expect(lines).toHaveLength(4);

    const { stripTerminalSequences } = await import("@earendil-works/pi-tui");
    const row1 = stripTerminalSequences(lines[1]!);
    const row2 = stripTerminalSequences(lines[2]!);

    // Extract divider indices inside content (skip index 0 border │ and last border │)
    const findDividers = (row: string) => {
      const indices: number[] = [];
      for (let i = 1; i < row.length - 1; i++) {
        if (row[i] === "│") indices.push(i);
      }
      return indices;
    };

    const row1Dividers = findDividers(row1);
    const row2Dividers = findDividers(row2);

    // There should be 3 internal column dividers separating the 4 metadata columns
    // (col1 | col2 | col3 | col4)
    // Both rows must have dividers at the exact same positions
    const rightSideDividers1 = row1Dividers.slice(-3);
    const rightSideDividers2 = row2Dividers.slice(-3);
    expect(rightSideDividers1).toHaveLength(3);
    expect(rightSideDividers2).toHaveLength(3);
    expect(rightSideDividers1).toEqual(rightSideDividers2);
  });

  it("renders boxed navigator with truthful problems and sessions only", async () => {
    const model = await createShellModel(process.cwd(), {
      state: emptyState(),
      aiAvailable: true,
    });
    const sidebar = makeSidebar(model);
    const lines = sidebar.render(26);
    const joined = lines.join("\n");
    expect(joined).toContain("PROBLEMS");
    expect(joined).toContain("SESSIONS");
    expect(joined).not.toContain("WORKSPACES");
    expect(joined).not.toContain("AGENTS");
    expect(joined).toContain("├"); // section divider
    for (const row of lines) {
      expect(visibleWidth(row)).toBe(26);
    }
  });

  it("styles active problem with active yellow dot and inactive items with muted circular dots", async () => {
    const state = emptyState();
    state.problems.push(
      { id: "p1", title: "Active problem", topic: "arrays", difficulty: "easy", language: "javascript", statement: "", constraints: [], tests: [], createdAt: "2026-01-01" },
      { id: "p2", title: "Inactive problem", topic: "graphs", difficulty: "hard", language: "python", statement: "", constraints: [], tests: [], createdAt: "2026-01-01" }
    );
    state.activeSession = { problemId: "p1", goal: "practice", startedAt: "2026-01-01T00:00:00.000Z" };
    const model = await createShellModel(process.cwd(), { state, aiAvailable: false });
    const sidebar = makeSidebar(model);
    const rendered = sidebar.render(30).join("\n");

    const { stripTerminalSequences } = await import("@earendil-works/pi-tui");
    const plain = stripTerminalSequences(rendered);
    // Both active and inactive problems use circular dot ● (active yellow, inactive muted)
    expect(plain).toMatch(/● Active problem/);
    expect(plain).toMatch(/● Inactive problem/);
  });

  it("always displays the active problem when it falls beyond the first five problems", async () => {
    const state = emptyState();
    for (let i = 1; i <= 7; i++) {
      state.problems.push({
        id: `prob-${i}`,
        title: i === 6 ? "Warm-up: array scan" : `Problem ${i}`,
        topic: "arrays",
        difficulty: "easy",
        language: "javascript",
        statement: "",
        constraints: [],
        tests: [],
        createdAt: "2026-01-01",
      });
    }
    // Set 6th problem as active (index 5, outside first 5)
    state.activeSession = { problemId: "prob-6", goal: "practice", startedAt: "2026-01-01T00:00:00.000Z" };
    const model = await createShellModel(process.cwd(), { state, aiAvailable: false });
    const sidebar = makeSidebar(model);
    const rendered = sidebar.render(30).join("\n");

    const { stripTerminalSequences } = await import("@earendil-works/pi-tui");
    const plain = stripTerminalSequences(rendered);

    // Active 6th problem MUST be visible in the navigator
    expect(plain).toContain("Warm-up: array scan");
    expect(plain).toMatch(/● Warm-up: array scan/);

    // First 4 problems must be preserved in order
    expect(plain).toContain("Problem 1");
    expect(plain).toContain("Problem 2");
    expect(plain).toContain("Problem 3");
    expect(plain).toContain("Problem 4");

    // 5th inactive problem is replaced by the 6th active problem, and 7th is omitted
    expect(plain).not.toContain("Problem 5");
    expect(plain).not.toContain("Problem 7");
  });

  it("preserves original problem ordering when active problem is within the first five", async () => {
    const state = emptyState();
    for (let i = 1; i <= 7; i++) {
      state.problems.push({
        id: `prob-${i}`,
        title: `Problem ${i}`,
        topic: "arrays",
        difficulty: "easy",
        language: "javascript",
        statement: "",
        constraints: [],
        tests: [],
        createdAt: "2026-01-01",
      });
    }
    // Set 2nd problem as active (index 1, within first 5)
    state.activeSession = { problemId: "prob-2", goal: "practice", startedAt: "2026-01-01T00:00:00.000Z" };
    const model = await createShellModel(process.cwd(), { state, aiAvailable: false });
    const sidebar = makeSidebar(model);
    const rendered = sidebar.render(30).join("\n");

    const { stripTerminalSequences } = await import("@earendil-works/pi-tui");
    const plain = stripTerminalSequences(rendered);

    expect(plain).toContain("Problem 1");
    expect(plain).toContain("Problem 2");
    expect(plain).toContain("Problem 3");
    expect(plain).toContain("Problem 4");
    expect(plain).toContain("Problem 5");
    expect(plain).not.toContain("Problem 6");
    expect(plain).not.toContain("Problem 7");
  });

  it("renders correctly when there are fewer than five problems or no active problem", async () => {
    const state = emptyState();
    for (let i = 1; i <= 6; i++) {
      state.problems.push({
        id: `prob-${i}`,
        title: `Problem ${i}`,
        topic: "arrays",
        difficulty: "easy",
        language: "javascript",
        statement: "",
        constraints: [],
        tests: [],
        createdAt: "2026-01-01",
      });
    }
    // No active session/problem
    const model = await createShellModel(process.cwd(), { state, aiAvailable: false });
    const sidebar = makeSidebar(model);
    const rendered = sidebar.render(30).join("\n");

    const { stripTerminalSequences } = await import("@earendil-works/pi-tui");
    const plain = stripTerminalSequences(rendered);

    expect(plain).toContain("Problem 1");
    expect(plain).toContain("Problem 5");
    expect(plain).not.toContain("Problem 6");
  });

  it("renders boxed session tabs without fake controls", async () => {
    const model = await createShellModel(process.cwd(), {
      state: emptyState(),
      aiAvailable: true,
    });
    const tabs = makeTabs(model);
    const lines = tabs.render(62);
    const joined = lines.join("\n");
    expect(lines).toHaveLength(3);
    expect(joined).not.toContain("×");
    expect(joined).not.toContain("+");
  });

  it("renders boxed context with state-backed data and truthful empty states", async () => {
    const model = await createShellModel(process.cwd(), {
      state: emptyState(),
      aiAvailable: true,
    });
    const context = makeContext(model);
    const lines = context.render(32);
    const joined = lines.join("\n");
    expect(joined).toContain("SESSION CONTEXT");
    expect(joined).toContain("WORKSPACE FILES");
    expect(joined).toContain("Empty · no active goal");
    expect(joined).toContain("Empty · no active problem");
    expect(joined).toContain("Empty · no attempts");
    expect(joined).toContain("Empty · no notes or sources");
    expect(joined).not.toContain("watching for file changes");
    expect(joined).not.toContain("focus on core patterns");
    for (const row of lines) {
      expect(visibleWidth(row)).toBe(32);
    }
  });

  it("formats context fields with consistent label-then-value visual hierarchy", async () => {
    const state = emptyState();
    state.problems.push({
      id: "p1",
      title: "Prefix sums",
      topic: "arrays",
      difficulty: "medium",
      language: "javascript",
      statement: "",
      constraints: [],
      tests: [],
      createdAt: "2026-01-01",
    });
    state.activeSession = { problemId: "p1", goal: "Practice arrays", startedAt: "2026-01-01T00:00:00.000Z" };
    const model = await createShellModel(process.cwd(), { state, aiAvailable: true });
    const context = makeContext(model);
    const lines = context.render(34);

    const { stripTerminalSequences } = await import("@earendil-works/pi-tui");
    const plainLines = lines.map((l) => stripTerminalSequences(l));

    // Verify Difficulty is on its own label line, followed by the indented difficulty value line
    const diffLabelIndex = plainLines.findIndex((l) => l.includes("Difficulty"));
    expect(diffLabelIndex).toBeGreaterThan(-1);
    expect(plainLines[diffLabelIndex]).not.toContain("MEDIUM");
    expect(plainLines[diffLabelIndex + 1]).toContain("MEDIUM");
    expect(plainLines[diffLabelIndex + 1]).toContain("javascript");
  });

  it("renders compact footer with only real controls and no fake stats", async () => {
    const model = await createShellModel(process.cwd(), {
      state: emptyState(),
      aiAvailable: true,
    });
    const footer = makeFooter(model);
    const lines = footer.render(120);
    const joined = lines.join("\n");
    expect(joined).toContain("PARDRAVERSE");
    expect(joined).toContain("/help");
    expect(joined).toContain("/new [title]");
    expect(joined).toContain("/sessions");
    expect(joined).not.toContain("Ctrl+L");
    expect(joined).not.toContain("/agents");
    expect(joined).not.toContain("TPS:");
    expect(joined).not.toContain("CPU");
    expect(joined).not.toContain("RAM");
  });
});
