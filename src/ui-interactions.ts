import type { AgentMessage } from "@earendil-works/pi-agent-core";
import type { ConversationSession } from "./types.js";
import type { SessionStore } from "./session-store.js";

export type SessionDirection = "next" | "previous";

export interface ShutdownCoordinator {
  stop(): Promise<void>;
  terminate(code: number): Promise<void>;
}

export function createShutdownCoordinator(options: {
  cleanup: () => Promise<void>;
  finalize: () => void;
  exit: (code: number) => void;
  onError?: (error: unknown) => void;
}): ShutdownCoordinator {
  let stopPromise: Promise<void> | undefined;
  let terminatePromise: Promise<void> | undefined;

  const stop = (): Promise<void> => {
    stopPromise ??= (async () => {
      let failure: unknown;
      try {
        await options.cleanup();
      } catch (error) {
        failure = error;
      } finally {
        try {
          options.finalize();
        } catch (error) {
          failure ??= error;
        }
      }
      if (failure !== undefined) {
        try {
          options.onError?.(failure);
        } catch {
          // Shutdown must settle even if its diagnostic sink is unavailable.
        }
      }
    })();
    return stopPromise;
  };

  return {
    stop,
    terminate(code: number): Promise<void> {
      terminatePromise ??= (async () => {
        try {
          await stop();
        } finally {
          options.exit(code);
        }
      })();
      return terminatePromise;
    },
  };
}

export async function createConversation(
  sessions: SessionStore,
  messages: AgentMessage[],
  title?: string,
): Promise<ConversationSession> {
  await sessions.updateMessages(messages);
  return sessions.create({ title });
}

export async function selectAdjacentConversation(
  sessions: SessionStore,
  messages: AgentMessage[],
  direction: SessionDirection,
): Promise<ConversationSession> {
  const [active, available] = await Promise.all([sessions.active(), sessions.list()]);
  const currentIndex = available.findIndex((session) => session.id === active.id);
  if (currentIndex < 0) throw new Error(`Active session is not available: ${active.id}`);

  const offset = direction === "next" ? 1 : -1;
  const target = available[(currentIndex + offset + available.length) % available.length]!;
  await sessions.updateMessages(messages);
  return target.id === active.id ? sessions.active() : sessions.open(target.id);
}
