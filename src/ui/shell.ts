import pc from "picocolors";
import { Container, Text, type Component } from "@earendil-works/pi-tui";
import type { ShellModel } from "./view-model.js";

const rule = pc.dim("────────────────────────────────────────────────────────────────");

export class Pane extends Container {
  constructor(title: string, children: Component[] = []) {
    super();
    this.addChild(new Text(pc.bold(pc.magenta(`  ${title}`)), 0, 0));
    this.addChild(new Text(pc.dim("  ─────────────────────────────"), 0, 0));
    for (const child of children) this.addChild(child);
  }
}

export function makeHeader(model: ShellModel): Component {
  return new Text([
    pc.bold(pc.magenta("  PARDRA·VERSE")) + pc.dim("  local-first practice coach"),
    pc.dim(`  │  workspace ${model.root}  │  session ${model.sessionLabel}  │  mode `) + pc.magenta(model.modeLabel) + pc.dim(`  │  ${model.modelLabel}`),
    pc.dim(`  ${rule}`),
  ].join("\n"), 0, 0);
}

export function makeSidebar(model: ShellModel): Component {
  const lines = [
    pc.bold("  WORKSPACES") + pc.magenta("  +"),
    ...model.workspaceItems.map((item, index) => index === 0 ? pc.magenta(`  ● ${item}`) : pc.dim(`    ${item}`)),
    "",
    pc.bold("  SESSIONS") + pc.magenta("  +"),
    ...model.sessionItems.map((item, index) => index === 0 ? pc.magenta(`  ● ${item}`) : pc.dim(`    ${item}`)),
    "",
    pc.bold("  AGENTS") + pc.magenta("  +"),
    ...model.agentItems.map((item, index) => index === 0 ? pc.magenta(`  ● ${item}`) : pc.dim(`    ${item}`)),
  ];
  return new Text(lines.join("\n"), 0, 0);
}

export function makeContext(model: ShellModel, unavailableReason?: string): Component {
  const lines = [
    pc.bold("  SESSION CONTEXT"),
    pc.dim("  ─────────────────────────────"),
    pc.magenta("  Objective"),
    pc.dim("  Describe a practice goal to begin."),
    "",
    pc.magenta("  Current task"),
    pc.dim("  No active task"),
    "",
    pc.bold("  WORKSPACE FILES"),
    pc.dim("  ─────────────────────────────"),
    pc.dim(`  ${model.root}`),
    pc.dim("  · local state available through commands"),
    "",
    pc.bold("  RUN STATUS"),
    pc.dim("  ─────────────────────────────"),
    pc.yellow("  ● idle · no run recorded"),
    "",
    pc.bold("  NOTES"),
    pc.dim("  ─────────────────────────────"),
    pc.dim("  Notes appear here when a session creates them."),
  ];
  if (unavailableReason) lines.splice(4, 0, pc.yellow(`  ${unavailableReason}`));
  return new Text(lines.join("\n"), 1, 0);
}

export function makeTabs(): Component {
  return new Text(pc.magenta("  session 1   ") + pc.dim("×   session 2   ×   +"), 1, 0);
}

export function makeStatus(status: string): Text {
  return new Text(pc.dim(`  ${status || "ready"}  ·  Ctrl+C stop  ·  /help commands`), 1, 0);
}
