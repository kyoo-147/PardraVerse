import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { Attempt, PracState, SourceRecord } from "../types.js";
import { SessionStore, type SessionSummary } from "../session-store.js";

export type ShellMode = "practice" | "local-only" | "contest";

export interface SessionRecord {
  id: string;
  label: string;
  detail: string;
  active?: boolean;
}

export interface ProblemRecord {
  id: string;
  title: string;
  topic?: string;
  difficulty: string;
  language: string;
  active?: boolean;
}

export interface ShellModel {
  brand: string;
  version: string;
  root: string;
  mode: ShellMode;
  modeLabel: string;
  modelLabel: string;
  sessionLabel: string;
  problemItems: ProblemRecord[];
  sessionItems: SessionRecord[];
  workspaceItems: string[];
  agentItems: string[];
  activeGoal?: string;
  activeProblem?: { id: string; title: string; difficulty: string; language: string };
  activeSessionStartedAt?: string;
  files: string[];
  lastAttempt?: Attempt;
  attemptsCount: number;
  acceptedCount: number;
  sources: SourceRecord[];
  sourceCount: number;
}

function sessionLabel(session: Pick<SessionSummary, "id" | "title" | "goal" | "problem">): string {
  return session.title ?? session.goal ?? session.problem ?? session.id.slice(0, 8);
}

async function loadVersion(root: string): Promise<string> {
  const tryPaths = [
    path.join(root, "package.json"),
    path.resolve(process.cwd(), "package.json"),
  ];
  for (const pkgPath of tryPaths) {
    try {
      const content = await readFile(pkgPath, "utf8");
      const parsed = JSON.parse(content) as { version?: unknown };
      if (typeof parsed.version === "string") return `v${parsed.version}`;
    } catch {}
  }
  return "";
}

async function boundedFiles(root: string, directory: string): Promise<string[]> {
  const entries = await readdir(path.join(root, directory), { withFileTypes: true }).catch(() => []);
  const files: string[] = [];
  for (const entry of entries.slice(0, 20)) {
    if (!entry.isFile()) continue;
    const file = path.join(root, directory, entry.name);
    const readable = await readFile(file, "utf8").then((value) => value.slice(0, 512)).catch(() => undefined);
    if (readable !== undefined) files.push(path.join(directory, entry.name));
  }
  return files;
}

async function existingEntries(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true }).catch(() => []);
  const names = entries.filter((entry) => !entry.name.startsWith(".")).map((entry) => entry.name).slice(0, 30);
  return names.length ? names : ["Empty · no workspace files"];
}

export async function createShellModel(
  root: string,
  options: {
    state: PracState;
    aiAvailable: boolean;
    modelLabel?: string;
    sessions?: SessionStore;
  }
): Promise<ShellModel> {
  const absoluteRoot = path.resolve(root);
  const state = options.state;
  const version = await loadVersion(absoluteRoot);
  const mode: ShellMode = state.contestMode ? "contest" : options.aiAvailable ? "practice" : "local-only";
  const sessionStore = options.sessions ?? new SessionStore(absoluteRoot);
  const history = await sessionStore.list();
  const activeConversation = await sessionStore.active();

  const problem = state.activeSession?.problemId
    ? state.problems.find((item) => item.id === state.activeSession?.problemId)
    : undefined;

  const solutions = await boundedFiles(absoluteRoot, "solutions");
  const research = (await Promise.all(["research", "docs", "sources"].map((dir) => boundedFiles(absoluteRoot, dir)))).flat();
  const files = (await existingEntries(absoluteRoot)).filter((name) => name !== "solutions").slice(0, 12);
  if (solutions.length) files.push(...solutions.slice(0, 12));
  if (research.length) files.push(...research.slice(0, 12));

  const sessions: SessionRecord[] = history.map((session) => ({
    id: session.id,
    label: sessionLabel(session),
    detail: `${session.messageCount} message${session.messageCount === 1 ? "" : "s"} · ${new Date(session.updatedAt).toLocaleString()}`,
    active: session.id === activeConversation.id,
  }));

  const problemRecords: ProblemRecord[] = state.problems.map((p) => ({
    id: p.id,
    title: p.title,
    topic: p.topic,
    difficulty: p.difficulty,
    language: p.language,
    active: p.id === state.activeSession?.problemId,
  }));

  const attempt = state.attempts.length ? state.attempts[state.attempts.length - 1] : undefined;
  const attemptsCount = state.attempts.length;
  const acceptedCount = state.attempts.filter((a) => a.verdict === "accepted").length;

  const sources: SourceRecord[] = [...state.sources];

  return {
    brand: "PARDRA·VERSE",
    version,
    root: absoluteRoot,
    mode,
    modeLabel: state.contestMode ? "CONTEST LOCK" : options.aiAvailable ? "PRACTICE COACH" : "LOCAL ONLY",
    modelLabel: options.modelLabel ?? (options.aiAvailable ? "configured" : "AI unavailable"),
    sessionLabel: sessionLabel(activeConversation),
    problemItems: problemRecords,
    sessionItems: sessions.length ? sessions.slice(0, 12) : [{ id: "empty", label: "Empty · no sessions", detail: "start a conversation" }],
    workspaceItems: [path.basename(absoluteRoot) || absoluteRoot, `state · ${state.problems.length} problem${state.problems.length === 1 ? "" : "s"}`, ...files],
    agentItems: options.aiAvailable ? ["configured practice coach"] : ["Unavailable · AI provider"],
    activeGoal: state.activeSession?.goal,
    activeProblem: problem && { id: problem.id, title: problem.title, difficulty: problem.difficulty, language: problem.language },
    activeSessionStartedAt: state.activeSession?.startedAt,
    files: files.length ? files : ["Unavailable · workspace files"],
    lastAttempt: attempt,
    attemptsCount,
    acceptedCount,
    sources,
    sourceCount: state.sources.length,
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
    .filter(
      (block): block is { type: "text"; text: string } =>
        Boolean(block && typeof block === "object" && (block as { type?: unknown }).type === "text" && typeof (block as { text?: unknown }).text === "string")
    )
    .map((block) => block.text)
    .join("\n");
}
