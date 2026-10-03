import pc from "picocolors";
import { Container, Text, type Component } from "@earendil-works/pi-tui";
import type { ShellModel } from "./view-model.js";

const rule = pc.dim("────────────────────────────────────────────────────────────────");
function clip(value: string, width: number): string { return value.length <= width ? value : `${value.slice(0, Math.max(1, width - 1))}…`; }
export class Pane extends Container {
  constructor(title: string, children: Component[] = []) { super(); this.addChild(new Text(pc.bold(pc.magenta(`  ${title}`)), 0, 0)); this.addChild(new Text(pc.dim("  ─────────────────────────────"), 0, 0)); for (const child of children) this.addChild(child); }
}
export function makeHeader(model: ShellModel): Component {
  const workspace = model.root.replaceAll("\\", "/").split("/").filter(Boolean).at(-1) ?? model.root;
  const session = model.sessionLabel.length > 24 ? `${model.sessionLabel.slice(0, 23)}…` : model.sessionLabel;
  return new Text([pc.bold(pc.magenta(`  ${model.brand}`)) + pc.dim("  local-first practice coach"), pc.dim(`  workspace ${workspace}  ·  session ${session}  ·  `) + pc.magenta(model.modeLabel), pc.dim(`  ${rule}`)].join("\n"), 0, 0);
}
export function makeSidebar(model: ShellModel): Component {
  const lines = [pc.bold("  WORKSPACES"), ...model.workspaceItems.map((item, index) => index === 0 ? pc.magenta(`  ● ${clip(item, 19)}`) : pc.dim(`    ${clip(item, 19)}`)), "", pc.bold("  SESSIONS")];
  for (const session of model.sessionItems) lines.push(session.active ? pc.magenta(`  ● ${clip(session.label, 19)}`) : pc.dim(`  · ${clip(session.label, 19)}`), pc.dim(`    ${clip(session.detail, 19)}`));
  lines.push("", pc.bold("  AGENTS"), ...model.agentItems.map((item) => pc.dim(`  · ${clip(item, 19)}`)));
  return new Text(lines.join("\n"), 0, 0);
}
export function makeContext(model: ShellModel, unavailableReason?: string): Component {
  const lines = [pc.bold("  SESSION CONTEXT"), pc.dim("  ──────────────────────"), pc.magenta("  Objective"), pc.dim(`  ${clip(model.activeGoal ?? "Empty · no active session", 26)}`), "", pc.magenta("  Current task")];
  if (model.activeProblem) lines.push(pc.dim(`  ${clip(model.activeProblem.title, 26)}`), pc.dim(`  ${model.activeProblem.difficulty} · ${model.activeProblem.language}`));
  else lines.push(pc.dim("  Empty · no active problem"));
  lines.push("", pc.bold("  WORKSPACE FILES"), pc.dim("  ──────────────────────"), ...model.files.slice(0, 14).map((file) => pc.dim(`  ${clip(file, 26)}`)), "", pc.bold("  RUN STATUS"), pc.dim("  ──────────────────────"));
  if (model.lastAttempt) lines.push(pc.yellow(`  ● ${model.lastAttempt.verdict}`), pc.dim(`  ${clip(`${model.lastAttempt.passed}/${model.lastAttempt.total} · ${model.lastAttempt.at}`, 26)}`));
  else lines.push(pc.dim("  Empty · no local attempts"));
  lines.push("", pc.bold("  NOTES"), pc.dim("  ──────────────────────"), pc.dim(model.sourceCount ? `  ${model.sourceCount} recorded source${model.sourceCount === 1 ? "" : "s"}` : "  Empty · no notes or sources"));
  if (unavailableReason) lines.splice(4, 0, pc.yellow(`  ${unavailableReason}`));
  return new Text(lines.join("\n"), 1, 0);
}
export function makeTabs(model: ShellModel): Component {
  const labels = model.sessionItems.slice(0, 6).map((session, index) => index === 0 ? pc.magenta(`  ${clip(session.label, 18)}  `) : pc.dim(`  ${clip(session.label, 18)}  `));
  return new Text(labels.length ? labels.join(pc.dim("│")) : pc.dim("  Empty · no sessions"), 1, 0);
}
export function makeStatus(status: string): Text { return new Text(pc.dim(`  ${status || "ready"}`), 1, 0); }
