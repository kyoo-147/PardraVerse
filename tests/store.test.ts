import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { emptyState, slugify, Store, uniqueId } from "../src/store.js";

const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))));

describe("Store", () => {
  it("initializes and round-trips state", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "prac-store-"));
    roots.push(root);
    const store = new Store(root);
    expect(await store.exists()).toBe(false);
    const state = await store.init();
    state.contestMode = true;
    await store.save(state);
    expect((await store.load()).contestMode).toBe(true);
  });

  it("rejects an uninitialized directory", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "prac-store-"));
    roots.push(root);
    await expect(new Store(root).load()).rejects.toThrow("prac init");
  });
});

describe("ids", () => {
  it("creates stable URL-safe slugs", () => expect(slugify("  Tổng Prefix Sums! ")).toBe("tong-prefix-sums"));
  it("adds a unique suffix", () => expect(uniqueId("graph", ["graph", "graph-2"])).toBe("graph-3"));
  it("returns a complete empty state", () => expect(emptyState()).toMatchObject({ version: 1, contestMode: false, problems: [] }));
});
