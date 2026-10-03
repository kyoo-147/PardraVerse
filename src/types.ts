export type Language = "cpp" | "python" | "javascript";

export interface TestCase {
  name: string;
  input: string;
  expected: string;
  hidden?: boolean;
}

export interface Problem {
  id: string;
  title: string;
  topic: string;
  difficulty: "easy" | "medium" | "hard";
  statement: string;
  constraints: string[];
  language: Language;
  sourceUrl?: string;
  tests: TestCase[];
  createdAt: string;
}

export interface Topic {
  id: string;
  name: string;
  description: string;
  createdAt: string;
}

export interface Attempt {
  id: string;
  problemId: string;
  at: string;
  passed: number;
  total: number;
  durationMs: number;
  verdict: "accepted" | "wrong-answer" | "runtime-error" | "compile-error" | "timeout";
}

export interface SourceRecord {
  id: string;
  url: string;
  title: string;
  goal: string;
  addedAt: string;
}

export interface ActiveSession {
  problemId?: string;
  goal: string;
  startedAt: string;
}

export interface PracState {
  version: 1;
  contestMode: boolean;
  topics: Topic[];
  problems: Problem[];
  attempts: Attempt[];
  sources: SourceRecord[];
  activeSession?: ActiveSession;
}

export interface RunResult {
  name: string;
  verdict: "passed" | "wrong-answer" | "runtime-error" | "timeout";
  durationMs: number;
  expected: string;
  actual: string;
  stderr: string;
}

import type { AgentMessage } from "@earendil-works/pi-agent-core";

export type SessionStatus = "active" | "archived";

export interface ConversationSession {
  version: 1;
  id: string;
  title?: string;
  problem?: string;
  goal?: string;
  createdAt: string;
  updatedAt: string;
  status: SessionStatus;
  messages: AgentMessage[];
}
