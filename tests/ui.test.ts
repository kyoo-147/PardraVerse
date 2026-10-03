import { describe, expect, it } from "vitest";
import { contentText, createShellModel, formatTurnTime } from "../src/ui/view-model.js";

describe("PardraVerse TUI view model", () => {
  it("builds truthful local-only shell state", () => {
    const model = createShellModel("./workspace", { aiAvailable: false });
    expect(model.mode).toBe("local-only");
    expect(model.modeLabel).toBe("LOCAL ONLY");
    expect(model.modelLabel).toBe("AI unavailable");
    expect(model.workspaceItems).toContain("  local state");
  });

  it("prioritizes contest lock over provider availability", () => {
    const model = createShellModel(".", { aiAvailable: true, contestMode: true });
    expect(model.mode).toBe("contest");
    expect(model.modeLabel).toBe("CONTEST LOCK");
  });

  it("extracts text blocks without speaker headings", () => {
    expect(contentText([{ type: "text", text: "hello" }, { type: "image", text: "ignored" }])).toBe("hello");
    expect(contentText("plain")).toBe("plain");
    expect(contentText(undefined)).toBe("");
  });

  it("renders the shell regions without speaker headings", async () => {
    const { makeHeader, makeSidebar, makeContext } = await import("../src/ui/shell.js");
    const model = createShellModel("./workspace", { aiAvailable: false });
    const output = [...makeHeader(model).render(120), ...makeSidebar(model).render(28), ...makeContext(model).render(36)].join("\n");
    expect(output).toContain("WORKSPACES");
    expect(output).toContain("SESSION CONTEXT");
    expect(output).not.toMatch(/\bYOU\b|\bPARDRA AGENT\b/i);
  });

  it("formats timestamps safely", () => {
    expect(formatTurnTime()).toBe("--:--");
    expect(formatTurnTime(Number.NaN)).toBe("--:--");
    expect(formatTurnTime(Date.UTC(2020, 0, 1, 3, 4))).toMatch(/^\d{2}:\d{2}$/);
  });
});
