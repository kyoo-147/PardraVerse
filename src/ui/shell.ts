import pc from "picocolors";
import { Container, Text, type Component } from "@earendil-works/pi-tui";
import type { ShellModel } from "./view-model.js";

const rule = pc.dim("────────────────────────────────────────────────────────────────");
export class Pane extends Container {
  constructor(title: string, children: Component[] = []) { super(); this.addChild(new Text(pc.bold(pc.magenta(`  ${title}`)), 0, 0)); this.addChild(new Text(pc.dim("  ─────────────────────────────"), 0, 0)); for (const child of children) this.addChild(child); }
}
export function makeHeader(model: ShellModel): Component {
  return new Text([pc.bold(pc.magenta(`  ${model.brand}`)) + pc.dim("  local-first practice coach"), pc.dim(`  │  workspace ${model.root}  │  session ${model.sessionLabel}  │  mode `) + pc.magenta(model.modeLabel) + pc.dim(`  │  ${model.modelLabel}`), pc.dim(`  ${rule}`)].join("\n"), 0, 0);
}
export function makeSidebar(model: ShellModel): Component {
  const lines = [pc.bold("  WORKSPACES"), ...model.workspaceItems.map((item, index) => index === 0 ? pc.magenta(`  ● ${item}`) : pc.dim(`    ${item}`)), "", pc.bold("  SESSIONS")];
  for (const session of model.sessionItems) lines.push(session.active ? pc.magenta(`  ● ${session.label}`) : pc.dim(`  · ${session.label}`), pc.dim(`    ${session.detail}`));
  lines.push("", pc.bold("  AGENTS"), ...model.agentItems.map((item) => pc.dim(`  · ${item}`)));
  return new Text(lines.join("\n"), 0, 0);
}
export function makeContext(model: ShellModel, unavailableReason?: string): Component {
  const lines = [pc.bold("  SESSION CONTEXT"), pc.dim("  ─────────────────────────────"), pc.magenta("  Objective"), pc.dim(`  ${model.activeGoal ?? "Empty · no active session"}`), "", pc.magenta("  Current task")];
  if (model.activeProblem) lines.push(pc.dim(`  ${model.activeProblem.title}`), pc.dim(`  ${model.activeProblem.difficulty} · ${model.activeProblem.language}`));
  else lines.push(pc.dim("  Empty · no active problem"));
  lines.push("", pc.bold("  WORKSPACE FILES"), pc.dim("  ─────────────────────────────"), ...model.files.slice(0, 14).map((file) => pc.dim(`  ${file}`)), "", pc.bold("  RUN STATUS"), pc.dim("  ─────────────────────────────"));
  if (model.lastAttempt) lines.push(pc.yellow(`  ● ${model.lastAttempt.verdict}`), pc.dim(`  ${model.lastAttempt.passed}/${model.lastAttempt.total} · ${model.lastAttempt.at}`));
  else lines.push(pc.dim("  Empty · no local attempts"));
  lines.push("", pc.bold("  NOTES"), pc.dim("  ─────────────────────────────"), pc.dim(model.sourceCount ? `  ${model.sourceCount} recorded source${model.sourceCount === 1 ? "" : "s"}` : "  Empty · no notes or sources"));
  if (unavailableReason) lines.splice(4, 0, pc.yellow(`  ${unavailableReason}`));
  return new Text(lines.join("\n"), 1, 0);
}
export function makeTabs(model: ShellModel): Component {
  const labels = model.sessionItems.slice(0, 6).map((session, index) => index === 0 ? pc.magenta(`  ${session.label}  `) : pc.dim(`  ${session.label}  `));
  return new Text(labels.length ? labels.join(pc.dim("│")) : pc.dim("  Empty · no sessions"), 1, 0);
}
export function makeStatus(status: string): Text { return new Text(pc.dim(`  ${status || "ready"}  ·  Ctrl+C stop  ·  /help commands`), 1, 0); }
