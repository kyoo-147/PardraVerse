import os from "node:os";
import { Container, Text, visibleWidth, truncateToWidth, type Component } from "@earendil-works/pi-tui";
import type { ShellModel } from "./view-model.js";
import { c, theme } from "./theme.js";
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
 * Boxed Header Component matching pardra_ui.png
 */
export function makeHeader(model: ShellModel): Component {
  return {
    invalidate() {},
    render(width: number): string[] {
      const workspaceName = clip(model.root.replaceAll("\\", "/").split("/").filter(Boolean).at(-1) ?? model.root, 18);
      const sessionName = clip(model.sessionLabel, 14);
      const modeText = c.accentStrong(c.bold(model.modeLabel));

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
        `${c.muted("v0.3.0")}`,
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
 * Boxed Left Navigator Sidebar matching pardra_ui.png
 */
export function makeSidebar(model: ShellModel): Component {
  return {
    invalidate() {},
    render(width: number): string[] {
      const innerWidth = Math.max(1, width - 2);
      const lines: string[] = [];

      // Section 1: WORKSPACES +
      const wsName = clip(model.workspaceItems[0] ?? "workspace", innerWidth - 6);
      const wsPath = clip(model.root, innerWidth - 6);
      // Active workspace row has purple tint background
      lines.push(
        padToWidth(` ${c.activeDot("●")} ${c.accentStrong(c.bold(wsName))}`, innerWidth, c.selectedBg),
        padToWidth(`   ${c.muted(wsPath)}`, innerWidth, c.selectedBg)
      );

      // Section 2: SESSIONS +
      lines.push(renderDivider(width, "SESSIONS", "+", { borderColor: c.border, bgFn: c.sidebarBg }));
      for (const session of model.sessionItems.slice(0, 5)) {
        const isActive = session.active ?? false;
        const timeBadge = session.detail.includes("·") ? session.detail.split("·")[0]?.trim() ?? "" : "";
        const label = clip(session.label, innerWidth - 10);
        const dot = isActive ? c.activeDot("●") : c.muted("·");

        if (isActive) {
          lines.push(
            padToWidth(` ${dot} ${c.accentStrong(c.bold(label))} ${c.secondary(timeBadge)}`, innerWidth, c.selectedBg),
            padToWidth(`   ${c.muted(clip(session.detail, innerWidth - 4))}`, innerWidth, c.selectedBg)
          );
        } else {
          lines.push(
            padToWidth(` ${dot} ${c.primary(label)} ${c.muted(timeBadge)}`, innerWidth, c.sidebarBg),
            padToWidth(`   ${c.muted(clip(session.detail, innerWidth - 4))}`, innerWidth, c.sidebarBg)
          );
        }
      }

      // Section 3: AGENTS +
      lines.push(renderDivider(width, "AGENTS", "+", { borderColor: c.border, bgFn: c.sidebarBg }));
      const agentLabel = model.agentItems[0] ?? "pardra agent";
      const isConfigured = !agentLabel.includes("Unavailable");
      if (isConfigured) {
        lines.push(
          padToWidth(` ${c.activeDot("●")} ${c.accentStrong(c.bold("pardra agent"))}`, innerWidth, c.selectedBg),
          padToWidth(`   ${c.muted("practice coach")}`, innerWidth, c.selectedBg)
        );
      } else {
        lines.push(
          padToWidth(` ${c.warningDot("●")} ${c.muted(clip(agentLabel, innerWidth - 4))}`, innerWidth, c.sidebarBg),
          padToWidth(`   ${c.muted("local fallback")}`, innerWidth, c.sidebarBg)
        );
      }

      return renderBoxFrame({
        width,
        title: "WORKSPACES",
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
      if (!sessions.length) {
        return renderBoxFrame({
          width,
          borderColor: c.border,
          bgFn: c.appBg,
          lines: [` ${c.muted("Empty · no sessions")} `],
        });
      }

      // Build individual tab boxes
      // Active tab: purple border + bold purple text + close ×
      // Inactive tabs: subtle border + muted text + close ×
      // New tab button: [+]
      interface TabDef {
        label: string;
        active: boolean;
      }
      const tabs: TabDef[] = sessions.map((s, idx) => ({
        label: clip(s.label, 14),
        active: s.active ?? (idx === 0),
      }));

      // Render tab boxes horizontally in 3 lines: top border, middle, bottom border
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
 * Boxed Right Context Sidebar matching pardra_ui.png
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
        padToWidth(` ${c.primary(clip(model.activeGoal ?? "Practice algorithms and clean implementation", innerWidth - 3))}`, innerWidth, c.appBg),
        padToWidth(` ${c.accent("Current task")}`, innerWidth, c.appBg)
      );

      if (model.activeProblem) {
        lines.push(
          padToWidth(` ${c.primary(clip(model.activeProblem.title, innerWidth - 3))}`, innerWidth, c.appBg),
          padToWidth(` ${c.accent("Difficulty")}`, innerWidth, c.appBg),
          padToWidth(` ${c.activeDot(c.bold(model.activeProblem.difficulty.toUpperCase()))}`, innerWidth, c.appBg)
        );
      } else {
        lines.push(padToWidth(` ${c.muted("Empty · no active problem")}`, innerWidth, c.appBg));
      }

      lines.push(
        padToWidth(` ${c.accent("Session ID")}`, innerWidth, c.appBg),
        padToWidth(` ${c.muted(clip(model.sessionLabel, innerWidth - 3))}`, innerWidth, c.appBg)
      );

      // Section 2: WORKSPACE FILES
      lines.push(renderDivider(width, "WORKSPACE FILES", undefined, { borderColor: c.border, bgFn: c.appBg }));
      lines.push(padToWidth(` ${c.muted(clip(model.root, innerWidth - 3))}`, innerWidth, c.appBg));
      for (const file of model.files.slice(0, 5)) {
        const isSelected = file.endsWith(".rs") || file.endsWith(".ts") || file.endsWith(".js");
        if (isSelected && lines.length < 14) {
          lines.push(padToWidth(`   ${c.accentStrong("◆ " + clip(file, innerWidth - 6))}`, innerWidth, c.selectedBg));
        } else {
          lines.push(padToWidth(`   ${c.muted("· " + clip(file, innerWidth - 6))}`, innerWidth, c.appBg));
        }
      }

      // Section 3: RUN STATUS
      lines.push(renderDivider(width, "RUN STATUS", undefined, { borderColor: c.border, bgFn: c.appBg }));
      if (model.lastAttempt) {
        const verdictColor = model.lastAttempt.verdict === "accepted" ? c.successDot : c.warningDot;
        lines.push(
          padToWidth(` ${verdictColor("●")} ${c.primary(model.lastAttempt.verdict)}`, innerWidth, c.appBg),
          padToWidth(`   ${c.muted(`Last run: ${clip(model.lastAttempt.at, innerWidth - 14)}`)}`, innerWidth, c.appBg),
          padToWidth(`   ${c.muted(`Tests: ${model.lastAttempt.passed}/${model.lastAttempt.total}`)}`, innerWidth, c.appBg)
        );
      } else {
        lines.push(
          padToWidth(` ${c.activeDot("●")} ${c.primary("watching for file changes...")}`, innerWidth, c.appBg),
          padToWidth(`   ${c.muted("Tests: 0/0 (not run)")}`, innerWidth, c.appBg),
          padToWidth(`   ${c.muted("Status: idle")}`, innerWidth, c.appBg)
        );
      }

      // Section 4: NOTES
      lines.push(renderDivider(width, "NOTES", undefined, { borderColor: c.border, bgFn: c.appBg }));
      if (model.sourceCount > 0) {
        lines.push(padToWidth(` - ${c.primary(`${model.sourceCount} recorded source${model.sourceCount === 1 ? "" : "s"}`)}`, innerWidth, c.appBg));
      } else {
        lines.push(
          padToWidth(` - ${c.muted("focus on core patterns")}`, innerWidth, c.appBg),
          padToWidth(` - ${c.muted("test edge cases")}`, innerWidth, c.appBg),
          padToWidth(` - ${c.muted("write clean, readable code")}`, innerWidth, c.appBg)
        );
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

/**
 * Status message bar
 */
export function makeStatus(status: string): Text {
  return new Text(c.muted(`  ${status || "ready"}`), 1, 0);
}

/**
 * Compact Boxed Footer matching pardra_ui.png
 */
export function makeFooter(): Component {
  return {
    invalidate() {},
    render(width: number): string[] {
      const leftPart = `${c.strong(c.bold("PARDRAVERSE"))}  ${c.muted("v0.3.0")}  ${c.border("·")}  ${c.secondary("local-first practice coach")}`;
      const commandsPart = `${c.muted("Ctrl+L clear")}  ${c.border("·")}  ${c.muted("/help commands")}  ${c.border("·")}  ${c.muted("/sessions")}  ${c.border("·")}  ${c.muted("/agents")}  ${c.border("·")}  ${c.muted("/quit exit")}`;

      // Truthful system metrics
      const memMb = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
      const load = os.loadavg()[0] ?? 0;
      const cpuPct = Math.min(99, Math.round(load * 10));
      const statsPart = `${c.muted("TPS:")} ${c.primary("-- tok/s")}   ${c.border("│")}   ${c.muted("CPU")} ${c.primary(`${cpuPct}%`)}   ${c.border("│")}   ${c.muted("RAM")} ${c.primary(`${memMb}M`)}`;

      if (width < 96) {
        const compactLine = ` ${leftPart}   ${statsPart}`;
        return renderBoxFrame({
          width,
          borderColor: c.border,
          bgFn: c.appBg,
          lines: [compactLine],
        });
      }

      const available = width - 4;

      // Row 1: Left Brand & version, Right live stats
      const leftVis = visibleWidth(leftPart);
      const rightVis = visibleWidth(statsPart);
      let row1 = "";
      if (leftVis + rightVis + 2 <= available) {
        row1 = ` ${leftPart}` + " ".repeat(available - leftVis - rightVis) + statsPart;
      } else {
        row1 = clip(` ${leftPart}   ${statsPart}`, available);
      }

      // Row 2: Command shortcuts
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
