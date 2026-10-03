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

      if (width < 80) {
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

      // Row 1: Left Brand Title, Right Column Headers
      const brandTitle = ` ${c.accentStrong("🐺  " + c.bold("PARDRAVERSE"))}`;
      const colHeaders = [
        `${c.muted("workspace")}`,
        `${c.muted("session")}`,
        `${c.muted("mode")}`,
        `${c.muted("layout")} ${c.primary(layoutLabel)}`,
      ].join(` ${c.border("│")} `);

      const titleVis = visibleWidth(brandTitle);
      const colHeadersVis = visibleWidth(colHeaders);
      let row1 = "";
      if (titleVis + colHeadersVis + 2 <= available) {
        row1 = brandTitle + " ".repeat(available - titleVis - colHeadersVis) + colHeaders;
      } else {
        row1 = clip(`${brandTitle} · ${workspaceName} · ${modeText}`, available);
      }

      // Row 2: Left Tagline, Right Column Values
      const tagline = ` ${c.muted("local-first practice coach")}  ${c.border("│")}  ${c.terminal("think first. code by hand.")}`;
      const colValues = [
        `${c.primary(workspaceName)}`,
        `${c.primary(sessionName)}`,
        `${modeText}`,
        `${c.muted(versionLabel)}`,
      ].join(` ${c.border("│")} `);

      const tagVis = visibleWidth(tagline);
      const colValuesVis = visibleWidth(colValues);
      let row2 = "";
      if (tagVis + colValuesVis + 2 <= available) {
        row2 = tagline + " ".repeat(available - tagVis - colValuesVis) + colValues;
      } else {
        const compactTag = ` ${c.muted("local-first practice coach")}`;
        const compactVals = `${c.primary(workspaceName)} ${c.border("│")} ${modeText}`;
        const cTagVis = visibleWidth(compactTag);
        const cValsVis = visibleWidth(compactVals);
        if (cTagVis + cValsVis + 2 <= available) {
          row2 = compactTag + " ".repeat(available - cTagVis - cValsVis) + compactVals;
        } else {
          row2 = clip(` ${c.muted("local-first practice coach")}`, available);
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
 * Boxed Left Navigator Sidebar showing real Problems and real Sessions only
 */
export function makeSidebar(model: ShellModel): Component {
  return {
    invalidate() {},
    render(width: number): string[] {
      const innerWidth = Math.max(1, width - 2);
      const lines: string[] = [];

      // Section 1: PROBLEMS +
      if (model.problemItems.length > 0) {
        for (const problem of model.problemItems.slice(0, 5)) {
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
              padToWidth(` ${c.muted("·")} ${c.primary(label)}`, innerWidth, c.sidebarBg),
              padToWidth(`   ${c.muted(meta)}`, innerWidth, c.sidebarBg)
            );
          }
        }
      } else {
        lines.push(
          padToWidth(`   ${c.muted("Empty · no problems")}`, innerWidth, c.sidebarBg),
          padToWidth(`   ${c.muted("Run prac list or add a problem")}`, innerWidth, c.sidebarBg)
        );
      }

      // Section 2: SESSIONS +
      lines.push(renderDivider(width, "SESSIONS", "+", { borderColor: c.border, bgFn: c.sidebarBg }));
      const hasRealSessions = model.sessionItems.length > 0 && model.sessionItems[0]?.id !== "empty";
      if (hasRealSessions) {
        for (const session of model.sessionItems.slice(0, 5)) {
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
              padToWidth(` ${c.muted("·")} ${c.primary(label)}`, innerWidth, c.sidebarBg),
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
        rightBadge: "+",
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
        const closeFn = tab.active ? c.accent : c.muted;
        const labelText = `${textFn(tab.label)}  ${closeFn("×")}`;
        const innerLen = visibleWidth(labelText) + 2;

        topRowParts.push(borderFn("╭" + "─".repeat(innerLen) + "╮"));
        midRowParts.push(borderFn("│ ") + labelText + borderFn(" │"));
        botRowParts.push(borderFn("╰" + "─".repeat(innerLen) + "╯"));
      }

      // Add "+" new tab button
      const plusBorder = c.border;
      topRowParts.push(plusBorder("╭───╮"));
      midRowParts.push(plusBorder("│ ") + c.muted("+") + plusBorder(" │"));
      botRowParts.push(plusBorder("╰───╯"));

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
        padToWidth(` ${model.activeGoal ? c.primary(clip(model.activeGoal, innerWidth - 3)) : c.muted("Empty · no active goal")}`, innerWidth, c.appBg),
        padToWidth(` ${c.accent("Current task")}`, innerWidth, c.appBg)
      );

      if (model.activeProblem) {
        lines.push(
          padToWidth(` ${c.primary(clip(model.activeProblem.title, innerWidth - 3))}`, innerWidth, c.appBg),
          padToWidth(` ${c.accent("Difficulty")} ${c.activeDot(c.bold(model.activeProblem.difficulty.toUpperCase()))} · ${c.muted(model.activeProblem.language)}`, innerWidth, c.appBg)
        );
      } else {
        lines.push(padToWidth(` ${c.muted("Empty · no active problem")}`, innerWidth, c.appBg));
      }

      lines.push(
        padToWidth(` ${c.accent("Started")}`, innerWidth, c.appBg),
        padToWidth(
          ` ${model.activeSessionStartedAt ? c.primary(formatStartedTime(model.activeSessionStartedAt)) : c.muted("Empty · no active session")}`,
          innerWidth,
          c.appBg
        ),
        padToWidth(` ${c.accent("Session ID")}`, innerWidth, c.appBg),
        padToWidth(` ${c.muted(clip(model.sessionLabel, innerWidth - 3))}`, innerWidth, c.appBg)
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
      lines.push(renderDivider(width, "NOTES", undefined, { borderColor: c.border, bgFn: c.appBg }));
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

function formatStartedTime(isoString: string): string {
  const parsed = new Date(isoString).getTime();
  if (!Number.isFinite(parsed)) return isoString;
  const elapsedMs = Date.now() - parsed;
  if (elapsedMs < 60_000) return "just now";
  const mins = Math.floor(elapsedMs / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/**
 * Status message bar
 */
export function makeStatus(status: string): Text {
  return new Text(c.muted(`  ${status || "ready"}`), 1, 0);
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
      const commandsPart = `${c.muted("/help commands")}  ${c.border("·")}  ${c.muted("/new session")}  ${c.border("·")}  ${c.muted("/sessions")}  ${c.border("·")}  ${c.muted("/open <id>")}  ${c.border("·")}  ${c.muted("/quit exit")}  ${c.border("·")}  ${c.muted("Ctrl+C stop")}`;

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
