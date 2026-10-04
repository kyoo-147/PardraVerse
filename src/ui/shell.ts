import { Container, Text, visibleWidth, truncateToWidth, type Component } from "@earendil-works/pi-tui";
import type { ShellModel } from "./view-model.js";
import { c } from "./theme.js";
import { renderBoxFrame, renderDivider, padToWidth } from "./layout.js";

function clip(value: string, width: number): string {
  if (visibleWidth(value) <= width) return value;
  return truncateToWidth(value, Math.max(1, width - 1)) + "…";
}

export class Pane extends Container {
  constructor(title: string, children: Component[] = []) {
    super();
    this.addChild(new Text(c.strong(`  ${title}`), 0, 0));
    this.addChild(new Text(c.border("  ─────────────────────────────"), 0, 0));
    for (const child of children) this.addChild(child);
  }
}

/**
 * Boxed Header Component matching pardra_ui.png with dynamic metadata
 */
export function makeHeader(model: ShellModel): Component {
  return {
    invalidate() {},
    render(width: number): string[] {
      const workspaceName = clip(model.root.replaceAll("\\", "/").split("/").filter(Boolean).at(-1) ?? model.root, 18);
      const sessionName = clip(model.sessionLabel, 14);
      const modeText = c.accentStrong(c.bold(model.modeLabel));
      const versionLabel = model.version || "dev";

      if (width < 96) {
        // Compact single-line header
        const line = ` ${c.accentStrong(c.bold("PARDRAVERSE"))} ${c.muted(workspaceName)} · ${modeText}`;
        return renderBoxFrame({
          width,
          borderColor: c.border,
          bgFn: c.appBg,
          lines: [line],
        });
      }

      const available = width - 4; // inside box borders
      const layoutLabel = width >= 110 ? "WIDE" : "COMPACT";

      // Dynamically budget column widths for the 4 metadata columns:
      // [workspace] │ [session] │ [mode] │ [layout/version]
      // Ensure row 1 and row 2 use identical column widths so vertical dividers align perfectly.
      let col0 = 12; // workspace
      let col1 = 10; // session
      const col2 = 14; // mode (fits "PRACTICE COACH")
      const col3 = 11; // layout / version (fits "layout WIDE")

      if (width >= 150) {
        col0 = 22;
        col1 = 16;
      } else if (width >= 135) {
        col0 = 18;
        col1 = 14;
      } else if (width >= 120) {
        col0 = 12;
        col1 = 10;
      } else {
        col0 = 11;
        col1 = 9;
      }

      const rightWidth = col0 + 3 + col1 + 3 + col2 + 3 + col3;

      // Row 1: Left Brand Title, Right Column Headers
      const brandTitle = ` ${c.accentStrong("🐺  " + c.bold("PARDRAVERSE"))}`;
      const headerCells = [
        padToWidth(c.muted("workspace"), col0),
        padToWidth(c.muted("session"), col1),
        padToWidth(c.muted("mode"), col2),
        padToWidth(`${c.muted("layout")} ${c.primary(layoutLabel)}`, col3),
      ];
      const colHeaders = headerCells.join(` ${c.border("│")} `);

      const titleVis = visibleWidth(brandTitle);
      let row1 = "";
      if (titleVis + rightWidth + 2 <= available) {
        row1 = brandTitle + " ".repeat(available - titleVis - rightWidth) + colHeaders;
      } else {
        row1 = clip(`${brandTitle} · ${workspaceName} · ${modeText}`, available);
      }

      // Row 2: Left Tagline, Right Column Values
      const fullTagline = ` ${c.muted("local-first practice coach")} ${c.border("│")} ${c.terminal("think first. code by hand.")}`;
      const shortTagline = ` ${c.muted("local-first practice coach")}`;
      const tagline = visibleWidth(fullTagline) + rightWidth + 2 <= available ? fullTagline : shortTagline;

      const valueCells = [
        padToWidth(c.primary(clip(workspaceName, col0)), col0),
        padToWidth(c.primary(clip(sessionName, col1)), col1),
        padToWidth(modeText, col2),
        padToWidth(c.muted(clip(versionLabel, col3)), col3),
      ];
      const colValues = valueCells.join(` ${c.border("│")} `);

      const tagVis = visibleWidth(tagline);
      let row2 = "";
      if (tagVis + rightWidth + 2 <= available) {
        row2 = tagline + " ".repeat(available - tagVis - rightWidth) + colValues;
      } else {
        const compactVals = `${c.primary(clip(workspaceName, 12))} ${c.border("│")} ${modeText}`;
        const cValsVis = visibleWidth(compactVals);
        if (tagVis + cValsVis + 2 <= available) {
          row2 = tagline + " ".repeat(available - tagVis - cValsVis) + compactVals;
        } else {
          row2 = clip(tagline, available);
        }
      }

      return renderBoxFrame({
        width,
        borderColor: c.border,
        bgFn: c.appBg,
        lines: [row1, row2],
      });
    },
  };
}

/**
 * Window items to at most `max` rows. When an active item exists beyond the cutoff,
 * include it by replacing the final slot while preserving original ordering for the
 * preceding slots. Does not fabricate, duplicate, or mutate state.
 */
export function windowProblemItems<T extends { active?: boolean }>(items: T[], max = 5): T[] {
  if (items.length <= max) return [...items];
  const activeIndex = items.findIndex((item) => item.active);
  if (activeIndex === -1 || activeIndex < max) {
    return items.slice(0, max);
  }
  return [...items.slice(0, max - 1), items[activeIndex]!];
}

/**
 * Boxed Left Navigator Sidebar showing real Problems and real Sessions only
 */
export function makeSidebar(model: ShellModel): Component {
  return {
    invalidate() {},
    render(width: number): string[] {
      const innerWidth = Math.max(1, width - 2);
      const lines: string[] = [];

      // Section 1: PROBLEMS
      if (model.problemItems.length > 0) {
        const visibleProblems = windowProblemItems(model.problemItems, 5);
        for (const problem of visibleProblems) {
          const isActive = problem.active ?? false;
          const label = clip(problem.title, innerWidth - 6);
          const meta = clip(`${problem.difficulty} · ${problem.language}${problem.topic ? ` · ${problem.topic}` : ""}`, innerWidth - 6);
          if (isActive) {
            lines.push(
              padToWidth(` ${c.activeDot("●")} ${c.accentStrong(c.bold(label))}`, innerWidth, c.selectedBg),
              padToWidth(`   ${c.muted(meta)}`, innerWidth, c.selectedBg)
            );
          } else {
            lines.push(
              padToWidth(` ${c.muted("●")} ${c.primary(label)}`, innerWidth, c.sidebarBg),
              padToWidth(`   ${c.muted(meta)}`, innerWidth, c.sidebarBg)
            );
          }
        }
      } else {
        lines.push(
          padToWidth(`   ${c.muted("Empty · no problems")}`, innerWidth, c.sidebarBg),
          padToWidth(`   ${c.muted("Use prac problem create")}`, innerWidth, c.sidebarBg)
        );
      }

      // Section 2: SESSIONS
      lines.push(renderDivider(width, "SESSIONS", undefined, { borderColor: c.border, bgFn: c.sidebarBg }));
      const hasRealSessions = model.sessionItems.length > 0 && model.sessionItems[0]?.id !== "empty";
      if (hasRealSessions) {
        const visibleSessions = windowProblemItems(model.sessionItems, 5);
        for (const session of visibleSessions) {
          const isActive = session.active ?? false;
          const label = clip(session.label, innerWidth - 6);
          const detail = clip(session.detail, innerWidth - 6);
          if (isActive) {
            lines.push(
              padToWidth(` ${c.activeDot("●")} ${c.accentStrong(c.bold(label))}`, innerWidth, c.selectedBg),
              padToWidth(`   ${c.muted(detail)}`, innerWidth, c.selectedBg)
            );
          } else {
            lines.push(
              padToWidth(` ${c.muted("●")} ${c.primary(label)}`, innerWidth, c.sidebarBg),
              padToWidth(`   ${c.muted(detail)}`, innerWidth, c.sidebarBg)
            );
          }
        }
      } else {
        lines.push(
          padToWidth(`   ${c.muted("Empty · no saved sessions")}`, innerWidth, c.sidebarBg),
          padToWidth(`   ${c.muted("start a conversation")}`, innerWidth, c.sidebarBg)
        );
      }

      return renderBoxFrame({
        width,
        title: "PROBLEMS",
        borderColor: c.border,
        bgFn: c.sidebarBg,
        lines,
      });
    },
  };
}

/**
 * Boxed Session Tabs matching pardra_ui.png
 */
export function makeTabs(model: ShellModel): Component {
  return {
    invalidate() {},
    render(width: number): string[] {
      const sessions = model.sessionItems.slice(0, 4);
      if (!sessions.length || sessions[0]?.id === "empty") {
        return renderBoxFrame({
          width,
          borderColor: c.border,
          bgFn: c.appBg,
          lines: [` ${c.muted("Empty · no sessions")} `],
        });
      }

      interface TabDef {
        label: string;
        active: boolean;
      }
      const tabs: TabDef[] = sessions.map((s, idx) => ({
        label: clip(s.label, 14),
        active: s.active ?? (idx === 0),
      }));

      const topRowParts: string[] = [];
      const midRowParts: string[] = [];
      const botRowParts: string[] = [];

      for (const tab of tabs) {
        const borderFn = tab.active ? c.borderFocus : c.border;
        const textFn = tab.active ? (s: string) => c.accentStrong(c.bold(s)) : c.muted;
        const labelText = textFn(tab.label);
        const innerLen = visibleWidth(labelText) + 2;

        topRowParts.push(borderFn("╭" + "─".repeat(innerLen) + "╮"));
        midRowParts.push(borderFn("│ ") + labelText + borderFn(" │"));
        botRowParts.push(borderFn("╰" + "─".repeat(innerLen) + "╯"));
      }

      const topCombined = topRowParts.join(" ");
      const midCombined = midRowParts.join(" ");
      const botCombined = botRowParts.join(" ");

      return [
        padToWidth(topCombined, width, c.appBg),
        padToWidth(midCombined, width, c.appBg),
        padToWidth(botCombined, width, c.appBg),
      ];
    },
  };
}

/**
 * Boxed Right Context Sidebar showing state-backed timer, problem, attempts, files, and notes
 */
export function makeContext(model: ShellModel, unavailableReason?: string): Component {
  return {
    invalidate() {},
    render(width: number): string[] {
      const innerWidth = Math.max(1, width - 2);
      const lines: string[] = [];

      // Section 1: SESSION CONTEXT
      if (unavailableReason) {
        lines.push(padToWidth(` ${c.warningDot("●")} ${c.warningDot(clip(unavailableReason, innerWidth - 4))}`, innerWidth, c.appBg));
      }
      lines.push(
        padToWidth(` ${c.accent("Objective")}`, innerWidth, c.appBg),
        padToWidth(`   ${model.activeGoal ? c.primary(clip(model.activeGoal, innerWidth - 4)) : c.muted("Empty · no active goal")}`, innerWidth, c.appBg),
        padToWidth(` ${c.accent("Current task")}`, innerWidth, c.appBg)
      );

      if (model.activeProblem) {
        lines.push(
          padToWidth(`   ${c.primary(clip(model.activeProblem.title, innerWidth - 4))}`, innerWidth, c.appBg),
          padToWidth(` ${c.accent("Difficulty")}`, innerWidth, c.appBg),
          padToWidth(`   ${c.activeDot(c.bold(model.activeProblem.difficulty.toUpperCase()))} · ${c.muted(model.activeProblem.language)}`, innerWidth, c.appBg)
        );
      } else {
        lines.push(
          padToWidth(`   ${c.muted("Empty · no active problem")}`, innerWidth, c.appBg),
          padToWidth(` ${c.accent("Difficulty")}`, innerWidth, c.appBg),
          padToWidth(`   ${c.muted("None")}`, innerWidth, c.appBg)
        );
      }

      lines.push(
        padToWidth(` ${c.accent("Session time")}`, innerWidth, c.appBg),
        padToWidth(
          `   ${model.activeSessionStartedAt ? c.primary(formatSessionElapsed(model.activeSessionStartedAt)) : c.muted("Not started")}`,
          innerWidth,
          c.appBg
        ),
        padToWidth(` ${c.accent("Session ID")}`, innerWidth, c.appBg),
        padToWidth(`   ${c.muted(clip(model.sessionLabel, innerWidth - 4))}`, innerWidth, c.appBg)
      );

      // Section 2: WORKSPACE FILES
      lines.push(renderDivider(width, "WORKSPACE FILES", undefined, { borderColor: c.border, bgFn: c.appBg }));
      lines.push(padToWidth(` ${c.muted(clip(model.root, innerWidth - 3))}`, innerWidth, c.appBg));
      const hasRealFiles = model.files.length > 0 && !model.files[0]?.startsWith("Unavailable") && !model.files[0]?.startsWith("Empty");
      if (hasRealFiles) {
        for (const file of model.files.slice(0, 5)) {
          lines.push(padToWidth(`   ${c.muted("· " + clip(file, innerWidth - 6))}`, innerWidth, c.appBg));
        }
      } else {
        lines.push(padToWidth(`   ${c.muted(model.files[0] ?? "Empty · no workspace files")}`, innerWidth, c.appBg));
      }

      // Section 3: ATTEMPTS & RUNS
      lines.push(renderDivider(width, "RUN STATUS", undefined, { borderColor: c.border, bgFn: c.appBg }));
      if (model.lastAttempt) {
        const verdictColor = model.lastAttempt.verdict === "accepted" ? c.successDot : c.warningDot;
        lines.push(
          padToWidth(` ${verdictColor("●")} ${c.bold(model.lastAttempt.verdict.toUpperCase())} (${model.acceptedCount}/${model.attemptsCount} accepted)`, innerWidth, c.appBg),
          padToWidth(`   ${c.muted(`Tests: ${model.lastAttempt.passed}/${model.lastAttempt.total} passed`)}`, innerWidth, c.appBg),
          padToWidth(`   ${c.muted(`Last: ${clip(model.lastAttempt.at, innerWidth - 10)}`)}`, innerWidth, c.appBg)
        );
      } else {
        lines.push(
          padToWidth(`   ${c.muted("Empty · no attempts")}`, innerWidth, c.appBg),
          padToWidth(`   ${c.muted("Run prac test to record")}`, innerWidth, c.appBg)
        );
      }

      // Section 4: NOTES & SOURCES
      lines.push(renderDivider(width, "NOTES / SOURCES", undefined, { borderColor: c.border, bgFn: c.appBg }));
      if (model.sources.length > 0) {
        for (const source of model.sources.slice(0, 3)) {
          lines.push(padToWidth(`   ${c.primary(clip("· " + (source.title ?? source.url ?? source.id), innerWidth - 5))}`, innerWidth, c.appBg));
        }
      } else {
        lines.push(padToWidth(`   ${c.muted("Empty · no notes or sources")}`, innerWidth, c.appBg));
      }

      return renderBoxFrame({
        width,
        title: "SESSION CONTEXT",
        borderColor: c.border,
        bgFn: c.appBg,
        lines,
      });
    },
  };
}

export function formatSessionElapsed(isoString: string, now = Date.now()): string {
  const parsed = new Date(isoString).getTime();
  if (!Number.isFinite(parsed)) return "Unavailable";
  const elapsedSeconds = Math.max(0, Math.floor((now - parsed) / 1_000));
  const hours = Math.floor(elapsedSeconds / 3_600);
  const minutes = Math.floor((elapsedSeconds % 3_600) / 60);
  const seconds = elapsedSeconds % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}

/**
 * Status message bar
 */
export function makeStatus(status: string): Text {
  return new Text(c.muted(`  ${status || "message or command · /help"}`), 1, 0);
}

/**
 * Compact Boxed Footer with real controls and truthful status
 */
export function makeFooter(model?: ShellModel): Component {
  return {
    invalidate() {},
    render(width: number): string[] {
      const versionText = model?.version ? `  ${c.muted(model.version)}  ${c.border("·")}` : "";
      const leftPart = `${c.strong(c.bold("PARDRAVERSE"))}${versionText}  ${c.secondary("local-first practice coach")}`;
      const commandsPart = `${c.muted("/help")}  ${c.border("·")}  ${c.muted("/new [title]")}  ${c.border("·")}  ${c.muted("/sessions")}  ${c.border("·")}  ${c.muted("/open <id>")}  ${c.border("·")}  ${c.muted("/quit")}  ${c.border("·")}  ${c.muted("Ctrl+C stop")}`;

      const modeText = model?.modeLabel ? `${c.muted("mode:")} ${c.accentStrong(model.modeLabel)}` : "";
      const modelText = model?.modelLabel ? `${c.muted("model:")} ${c.primary(clip(model.modelLabel, 16))}` : "";
      const statusPart = [modeText, modelText].filter(Boolean).join(`   ${c.border("│")}   `);

      if (width < 96) {
        const compactLine = statusPart ? ` ${leftPart}   ${statusPart}` : ` ${leftPart}`;
        return renderBoxFrame({
          width,
          borderColor: c.border,
          bgFn: c.appBg,
          lines: [compactLine],
        });
      }

      const available = width - 4;

      // Row 1: Left Brand & version, Right runtime mode & model
      const leftVis = visibleWidth(leftPart);
      const rightVis = visibleWidth(statusPart);
      let row1 = "";
      if (leftVis + rightVis + 2 <= available) {
        row1 = ` ${leftPart}` + " ".repeat(available - leftVis - rightVis) + statusPart;
      } else {
        row1 = clip(` ${leftPart}   ${statusPart}`, available);
      }

      // Row 2: Real command shortcuts
      const row2 = ` ${commandsPart}`;

      return renderBoxFrame({
        width,
        borderColor: c.border,
        bgFn: c.appBg,
        lines: [row1, row2],
      });
    },
  };
}
