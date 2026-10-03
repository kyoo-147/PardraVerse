import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { PracState } from "./types.js";

export const STATE_DIR = ".prac";
export const STATE_FILE = "state.json";

export function emptyState(): PracState {
  return {
    version: 1,
    contestMode: false,
    topics: [],
    problems: [],
    attempts: [],
    sources: [],
  };
}

export class Store {
  constructor(readonly root = process.cwd()) {}

  get directory(): string {
    return path.join(this.root, STATE_DIR);
  }

  get file(): string {
    return path.join(this.directory, STATE_FILE);
  }

  async exists(): Promise<boolean> {
    try {
      await readFile(this.file, "utf8");
      return true;
    } catch {
      return false;
    }
  }

  async init(): Promise<PracState> {
    await mkdir(this.directory, { recursive: true });
    if (await this.exists()) return this.load();
    const state = emptyState();
    await this.save(state);
    return state;
  }

  async load(): Promise<PracState> {
    let raw: string;
    try {
      raw = await readFile(this.file, "utf8");
    } catch {
      throw new Error(`No practice workspace found. Run \"prac init\" in ${this.root}.`);
    }
    const parsed = JSON.parse(raw) as Partial<PracState>;
    if (parsed.version !== 1 || !Array.isArray(parsed.problems) || !Array.isArray(parsed.topics)) {
      throw new Error(`Unsupported or corrupt state file: ${this.file}`);
    }
    return {
      ...emptyState(),
      ...parsed,
      attempts: parsed.attempts ?? [],
      sources: parsed.sources ?? [],
    };
  }

  async save(state: PracState): Promise<void> {
    await mkdir(this.directory, { recursive: true });
    const temporary = `${this.file}.tmp`;
    await writeFile(temporary, `${JSON.stringify(state, null, 2)}\n`, "utf8");
    await import("node:fs/promises").then(({ rename }) => rename(temporary, this.file));
  }
}

export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64) || "item";
}

export function uniqueId(base: string, existing: string[]): string {
  if (!existing.includes(base)) return base;
  let suffix = 2;
  while (existing.includes(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}
