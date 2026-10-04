import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Key, matchesKey } from "@earendil-works/pi-tui";
import { SessionStore } from "../src/session-store.js";
import { createConversation, createShutdownCoordinator, selectAdjacentConversation } from "../src/ui-interactions.js";

const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))));
async function root(): Promise<string> {
  const value = await mkdtemp(path.join(os.tmpdir(), "pardra-interactions-"));
  roots.push(value);
  return value;
}

describe("TUI session interactions", () => {
  it("recognizes the legacy terminal sequences used by the session shortcuts", () => {
    expect(matchesKey("\x0e", Key.ctrl("n"))).toBe(true);
    expect(matchesKey("\x1b[5^", Key.ctrl("pageUp"))).toBe(true);
    expect(matchesKey("\x1b[6^", Key.ctrl("pageDown"))).toBe(true);
  });

  it("saves the active transcript before creating a conversation", async () => {
    const sessions = new SessionStore(await root());
    const first = await sessions.active();
    const messages = [{ role: "user" as const, content: "keep me", timestamp: 1 }];

    const created = await createConversation(sessions, messages, "New topic");

    expect(created.title).toBe("New topic");
    expect((await sessions.active()).id).toBe(created.id);
    expect((await sessions.open(first.id)).messages).toEqual(messages);
  });

  it("cycles through active sessions and preserves messages", async () => {
    const sessions = new SessionStore(await root());
    const first = await sessions.active();
    const second = await sessions.create({ title: "Second" });
    const third = await sessions.create({ title: "Third" });
    await sessions.open(second.id);
    const messages = [{ role: "user" as const, content: "draft", timestamp: 2 }];
    const order = (await sessions.list()).map((session) => session.id);
    const secondIndex = order.indexOf(second.id);

    const next = await selectAdjacentConversation(sessions, messages, "next");
    expect(next.id).toBe(order[(secondIndex + 1) % order.length]);
    expect((await sessions.open(second.id)).messages).toEqual(messages);

    const previousOrder = (await sessions.list()).map((session) => session.id);
    const previousIndex = previousOrder.indexOf(second.id);
    const previous = await selectAdjacentConversation(sessions, messages, "previous");
    expect(previous.id).toBe(previousOrder[(previousIndex - 1 + previousOrder.length) % previousOrder.length]);
    expect([first.id, second.id, third.id]).toContain(previous.id);
  });

  it("ignores archived sessions when cycling", async () => {
    const sessions = new SessionStore(await root());
    const archived = await sessions.active();
    const remaining = await sessions.create({ title: "Remaining" });
    await sessions.archive(archived.id);

    const selected = await selectAdjacentConversation(sessions, [], "next");

    expect(selected.id).toBe(remaining.id);
  });
});

describe("TUI shutdown coordination", () => {
  it("waits for cleanup before finalizing and exiting", async () => {
    const events: string[] = [];
    let finishCleanup!: () => void;
    const cleanupReady = new Promise<void>((resolve) => { finishCleanup = resolve; });
    const shutdown = createShutdownCoordinator({
      cleanup: async () => { events.push("cleanup started"); await cleanupReady; events.push("cleanup finished"); },
      finalize: () => { events.push("finalized"); },
      exit: (code) => { events.push(`exit ${code}`); },
    });

    const terminating = shutdown.terminate(143);
    await Promise.resolve();
    expect(events).toEqual(["cleanup started"]);
    finishCleanup();
    await terminating;

    expect(events).toEqual(["cleanup started", "cleanup finished", "finalized", "exit 143"]);
  });

  it("runs cleanup and finalization once across competing shutdown requests", async () => {
    const calls = { cleanup: 0, finalize: 0, exit: [] as number[] };
    const shutdown = createShutdownCoordinator({
      cleanup: async () => { calls.cleanup += 1; },
      finalize: () => { calls.finalize += 1; },
      exit: (code) => { calls.exit.push(code); },
    });

    await Promise.all([shutdown.stop(), shutdown.stop(), shutdown.terminate(130), shutdown.terminate(143)]);

    expect(calls).toEqual({ cleanup: 1, finalize: 1, exit: [130] });
  });

  it("finalizes and exits without rejecting when cleanup fails", async () => {
    const events: string[] = [];
    const failure = new Error("disk full");
    const shutdown = createShutdownCoordinator({
      cleanup: async () => { throw failure; },
      finalize: () => { events.push("finalized"); },
      exit: (code) => { events.push(`exit ${code}`); },
      onError: (error) => { events.push(error === failure ? "reported" : "wrong error"); },
    });

    await expect(shutdown.terminate(130)).resolves.toBeUndefined();
    expect(events).toEqual(["finalized", "reported", "exit 130"]);
  });
});
