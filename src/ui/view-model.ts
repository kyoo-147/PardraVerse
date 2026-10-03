import path from "node:path";

export type ShellMode = "practice" | "local-only" | "contest";

export interface ShellModel {
  brand: string;
  root: string;
  mode: ShellMode;
  modeLabel: string;
  modelLabel: string;
  sessionLabel: string;
  workspaceItems: string[];
  sessionItems: string[];
  agentItems: string[];
}

export function createShellModel(root: string, options: {
  aiAvailable: boolean;
  contestMode?: boolean;
  modelLabel?: string;
  sessionLabel?: string;
}): ShellModel {
  const contestMode = options.contestMode === true;
  const mode: ShellMode = contestMode ? "contest" : options.aiAvailable ? "practice" : "local-only";
  return {
    brand: "PARDRA\u00b7VERSE",
    root: path.resolve(root),
    mode,
    modeLabel: contestMode ? "CONTEST LOCK" : options.aiAvailable ? "PRACTICE COACH" : "LOCAL ONLY",
    modelLabel: options.modelLabel ?? (options.aiAvailable ? "configured" : "AI unavailable"),
    sessionLabel: options.sessionLabel ?? "new session",
    workspaceItems: [path.basename(path.resolve(root)) || "workspace", "  local state", "  problems", "  solutions"],
    sessionItems: [options.sessionLabel ?? "new session", "No saved sessions surfaced"],
    agentItems: ["practice coach", "local runner"],
  };
}

export function formatTurnTime(timestamp?: number): string {
  if (!timestamp || !Number.isFinite(timestamp)) return "--:--";
  return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

export function contentText(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .filter((block): block is { type: "text"; text: string } => Boolean(block && typeof block === "object" && (block as { type?: unknown }).type === "text" && typeof (block as { text?: unknown }).text === "string"))
    .map((block) => block.text)
    .join("\n");
}
