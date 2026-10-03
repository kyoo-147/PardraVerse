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
    expect(layout.sidebarWidth).toBe(26);
    expect(layout.contextWidth).toBe(32);
    expect(layout.centerWidth).toBe(120 - 26 - 32); // 62 cols: generous readable width
    expect(layout.headerHeight).toBe(3);
    expect(layout.tabsHeight).toBe(3);
    expect(layout.composerHeight).toBe(3);
    expect(layout.footerHeight).toBe(3);
    expect(layout.centerHeight).toBe(40 - 3 - 3 - 3 - 3); // 28 rows of transcript
  });

  it("handles intentional compact mode below breakpoint (< 96 cols)", () => {
    const layout = computeShellLayout(80, 24);
    expect(layout.isCompact).toBe(true);
    expect(layout.isWide).toBe(false);
    expect(layout.sidebarWidth).toBe(0);
    expect(layout.contextWidth).toBe(0);
    expect(layout.centerWidth).toBe(80);
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

  it("renders boxed session tabs with close buttons", async () => {
    const model = await createShellModel(process.cwd(), {
      state: emptyState(),
      aiAvailable: true,
    });
    const tabs = makeTabs(model);
    const lines = tabs.render(62);
    const joined = lines.join("\n");
    expect(joined).toContain("×");
    expect(joined).toContain("+");
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

  it("renders compact footer with only real controls and no fake stats", async () => {
    const model = await createShellModel(process.cwd(), {
      state: emptyState(),
      aiAvailable: true,
    });
    const footer = makeFooter(model);
    const lines = footer.render(120);
    const joined = lines.join("\n");
    expect(joined).toContain("PARDRAVERSE");
    expect(joined).toContain("/help commands");
    expect(joined).toContain("/new session");
    expect(joined).toContain("/sessions");
    expect(joined).not.toContain("Ctrl+L");
    expect(joined).not.toContain("/agents");
    expect(joined).not.toContain("TPS:");
    expect(joined).not.toContain("CPU");
    expect(joined).not.toContain("RAM");
  });
});
