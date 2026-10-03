import {
  Container,
  Editor,
  HStack,
  Key,
  Markdown,
  ProcessTerminal,
  ScrollView,
  Spacer,
  Text,
  TuiAltScreen,
  VStack,
  matchesKey,
  type MarkdownTheme,
  type SelectListTheme,
} from "@earendil-works/pi-tui";
import type { AgentMessage } from "@earendil-works/pi-agent-core";
import { createPracticeAgent, type PracticeAgentRuntime } from "./agent.js";
import { ChatStore } from "./chat-store.js";
import type { ConversationSession } from "./types.js";
import type { SessionSummary } from "./session-store.js";
import { answerOffline } from "./offline-chat.js";
import { PracticeWorkspace } from "./practice.js";
import { contentText, createShellModel, formatTurnTime } from "./ui/view-model.js";
import { makeContext, makeFooter, makeHeader, makeSidebar, makeStatus, makeTabs } from "./ui/shell.js";
import { c, theme, fgAnsi, bgAnsi, ANSI_RESET, TerminalThemeManager } from "./ui/theme.js";

const selectTheme: SelectListTheme = {
  selectedPrefix: (text) => c.accent(text),
  selectedText: (text) => c.bold(c.strong(text)),
  description: (text) => c.muted(text),
  scrollInfo: (text) => c.muted(text),
  noMatch: (text) => c.activeDot(text),
};

const markdownTheme: MarkdownTheme = {
  heading: (text) => c.bold(c.strong(text)),
  link: (text) => c.accent(text),
  linkUrl: (text) => c.muted(text),
  code: (text) => `${fgAnsi(theme.colors.accent.strong)}${bgAnsi(theme.colors.surface.code)}${text}${ANSI_RESET}`,
  codeBlock: (text) => `${fgAnsi(theme.colors.text.terminal)}${text}${ANSI_RESET}`,
  codeBlockBorder: (text) => c.border(text),
  quote: (text) => c.secondary(text),
  quoteBorder: (text) => c.accent(text),
  hr: (text) => c.border(text),
  listBullet: (text) => c.accent(text),
  bold: (text) => c.bold(text),
  italic: (text) => `\x1b[3m${text}${ANSI_RESET}`,
  strikethrough: (text) => `\x1b[9m${text}${ANSI_RESET}`,
  underline: (text) => `\x1b[4m${text}${ANSI_RESET}`,
};

export async function launchChat(root = process.cwd()): Promise<void> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error("Interactive chat needs a terminal. Use the explicit prac commands in scripts or CI.");
  }

  // Manage terminal emulator default colors with safe restoration
  const themeManager = new TerminalThemeManager(process.stdout);
  themeManager.applyTheme();
  const restoreThemeHandler = (): void => {
    themeManager.restoreTheme();
  };
  process.once("exit", restoreThemeHandler);
  process.once("SIGINT", restoreThemeHandler);
  process.once("SIGTERM", restoreThemeHandler);

  const workspace = new PracticeWorkspace(root);
  await workspace.ensure();
  const chatStore = new ChatStore(root);
  let runtime: PracticeAgentRuntime | undefined;
  let offlineReason = "";
  try {
    runtime = await createPracticeAgent(root);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("PRAC_AI_API_KEY") && !message.includes("Contest mode is on")) throw error;
    offlineReason = message;
  }

  const state = await workspace.store.load();
  let model = await createShellModel(root, {
    aiAvailable: Boolean(runtime),
    state,
    modelLabel: runtime?.modelLabel,
    sessions: chatStore.sessions,
  });

  const terminal = new ProcessTerminal();
  const tui = new TuiAltScreen(terminal);
  const transcript = new Container();
  const status = makeStatus("");
  const editor = new Editor(tui, { borderColor: (s) => c.borderFocus(s), selectList: selectTheme }, { paddingX: 1 });
  const scroll = new ScrollView(transcript, { follow: "end", primary: true, overscroll: "chain" });

  const installLayout = (): void => {
    // In pardra_ui.png, composer and status are within the center column under the transcript
    const center = new VStack([
      makeTabs(model),
      { component: scroll, basis: 0, grow: 1, minSize: 1 },
      editor,
      status,
    ]);

    const main = new HStack([
      { component: makeSidebar(model), basis: 26, minSize: 22, maxSize: 30, visible: (viewport) => viewport.width >= 96 },
      { component: center, basis: 0, grow: 1, minSize: 34 },
      {
        component: makeContext(
          model,
          !runtime
            ? offlineReason.includes("Contest")
              ? "Contest lock: local actions only"
              : "AI unavailable: local actions only"
            : undefined
        ),
        basis: 32,
        minSize: 26,
        maxSize: 38,
        visible: (viewport) => viewport.width >= 110,
      },
    ]);

    tui.setLayoutRoot(
      new VStack([
        makeHeader(model),
        { component: main, basis: 0, grow: 1, minSize: 8 },
        makeFooter(model),
      ])
    );
  };

  const refreshShell = async (): Promise<void> => {
    model = await createShellModel(root, {
      aiAvailable: Boolean(runtime),
      state: await workspace.store.load(),
      modelLabel: runtime?.modelLabel,
      sessions: chatStore.sessions,
    });
    installLayout();
    tui.setFocus(editor);
    tui.requestRender();
  };

  installLayout();
  tui.setFocus(editor);

  let offlineMessages = runtime ? [] : (await chatStore.load()).messages;
  let localFallbackActive = !runtime;
  const restored = (runtime?.agent.state.messages ?? offlineMessages) as AgentMessage[];
  const visibleHistory = restored.filter((message) => message.role === "user" || message.role === "assistant");
  if (!visibleHistory.length) renderWelcome(transcript, Boolean(runtime), offlineReason);
  else for (const message of visibleHistory) renderStoredMessage(transcript, message);

  let assistantView: Markdown | undefined;
  let assistantText = "";
  let lastInterrupt = 0;
  let stopping = false;
  let resolveExit!: () => void;
  const exited = new Promise<void>((resolve) => {
    resolveExit = resolve;
  });

  const stop = async (): Promise<void> => {
    if (stopping) return;
    stopping = true;
    editor.disableSubmit = true;
    try {
      themeManager.restoreTheme();
    } catch {}
    if (runtime && !localFallbackActive) {
      await runtime.agent.waitForIdle();
      await chatStore.replaceMessages(runtime.agent.state.messages as AgentMessage[]);
    } else {
      await chatStore.replaceMessages(offlineMessages);
    }
    await chatStore.event("ui.closed", { mode: runtime ? "ai" : "local" });
    await terminal.drainInput(1_000);
    tui.stop();
    resolveExit();
  };

  runtime?.agent.subscribe(async (event) => {
    if (event.type === "message_start" && event.message.role === "assistant") {
      assistantText = "";
      assistantView = undefined;
    }
    if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
      if (!assistantView) {
        assistantView = new Markdown("", 5, 0, markdownTheme);
        const time = c.muted(formatTurnTime(Date.now()));
        transcript.addChild(new Text(`  ${time}    ${c.activeDot("●")}   `, 1, 0));
        transcript.addChild(assistantView);
      }
      assistantText += event.assistantMessageEvent.delta;
      assistantView.setText(assistantText);
      tui.requestRender();
    }
    if (event.type === "tool_execution_start") {
      status.setText(c.muted(`  working · ${event.toolName.replaceAll("_", " ")}`));
      tui.requestRender();
    }
    if (event.type === "tool_execution_end") {
      transcript.addChild(
        new Text(c.muted(`  ↳ ${event.toolName.replaceAll("_", " ")} ${event.isError ? c.errorDot("failed") : c.successDot("done")}`), 3, 0)
      );
      tui.requestRender();
    }
    if (event.type === "agent_end") {
      status.setText("");
      editor.disableSubmit = false;
      transcript.addChild(new Spacer(1));
      await refreshShell();
    }
  });

  editor.onSubmit = (raw) => {
    const text = raw.trim();
    if (!text) return;
    editor.setText("");
    void handleInput(text);
  };

  async function handleInput(text: string): Promise<void> {
    if (text === "/quit" || text === "/exit") return stop();
    if (text === "/sessions") {
      renderSessionList(transcript, await chatStore.sessions.list());
      tui.requestRender();
      return;
    }
    if (text === "/new" || text.startsWith("/new ")) {
      runtime?.agent.reset();
      const session = await chatStore.sessions.create({ title: text.slice(5).trim() || undefined });
      offlineMessages = [];
      localFallbackActive = !runtime;
      transcript.clear();
      renderWelcome(transcript, Boolean(runtime), offlineReason);
      renderNotice(transcript, `Opened ${session.title ?? session.id.slice(0, 8)}.`);
      await refreshShell();
      return;
    }
    if (text.startsWith("/open ")) {
      const session = await resolveSession(chatStore, text.slice(6).trim());
      offlineMessages = [...session.messages];
      localFallbackActive = !runtime;
      if (runtime) runtime.agent.state.messages = [...session.messages];
      transcript.clear();
      const history = session.messages.filter((message) => message.role === "user" || message.role === "assistant");
      if (history.length) for (const message of history) renderStoredMessage(transcript, message);
      else renderWelcome(transcript, Boolean(runtime), offlineReason);
      await refreshShell();
      return;
    }
    if (text.startsWith("/rename ")) {
      const active = await chatStore.sessions.active();
      await chatStore.sessions.rename(active.id, text.slice(8).trim());
      await refreshShell();
      return;
    }
    if (text === "/archive") {
      const active = await chatStore.sessions.active();
      await chatStore.sessions.archive(active.id);
      const next = await chatStore.sessions.active();
      offlineMessages = [...next.messages];
      if (runtime) runtime.agent.state.messages = [...next.messages];
      transcript.clear();
      const history = next.messages.filter((message) => message.role === "user" || message.role === "assistant");
      if (history.length) for (const message of history) renderStoredMessage(transcript, message);
      else renderWelcome(transcript, Boolean(runtime), offlineReason);
      await refreshShell();
      return;
    }
    if (text === "/help") {
      transcript.addChild(
        new Text(
          c.muted("  Practice: describe a goal · run a solution · review a failure\n  Sessions: /sessions · /new [title] · /open <id> · /rename <title> · /archive\n  Runtime: /quit"),
          3,
          0
        )
      );
      tui.requestRender();
      return;
    }

    renderUserMessage(transcript, text);
    editor.disableSubmit = true;
    const current = await workspace.store.load();
    const localOnly = !runtime || current.contestMode;
    status.setText(c.muted(localOnly ? "  local only" : "  thinking"));
    tui.requestRender();

    try {
      if (runtime && !current.contestMode) {
        await runtime.agent.prompt(text);
      } else {
        if (!localFallbackActive) {
          offlineMessages = [...runtime!.agent.state.messages] as AgentMessage[];
          localFallbackActive = true;
        }
        const answer = await answerOffline(workspace, text);
        offlineMessages.push(
          { role: "user", content: text, timestamp: Date.now() },
          {
            role: "assistant",
            content: [{ type: "text", text: answer }],
            api: "offline",
            provider: "coding-prac",
            model: "local",
            usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } },
            stopReason: "stop",
            timestamp: Date.now(),
          }
        );
        await chatStore.replaceMessages(offlineMessages);
        const time = c.muted(formatTurnTime(Date.now()));
        transcript.addChild(new Text(`  ${time}    ${c.activeDot("●")}   `, 1, 0));
        transcript.addChild(new Markdown(answer, 5, 0, markdownTheme));
        transcript.addChild(new Spacer(1));
        status.setText("");
        editor.disableSubmit = false;
        await refreshShell();
      }
    } catch (error) {
      status.setText("");
      editor.disableSubmit = false;
      transcript.addChild(new Text(c.errorDot(`  ${error instanceof Error ? error.message : String(error)}`), 3, 0));
      transcript.addChild(new Spacer(1));
      tui.requestRender();
    }
  }

  tui.addInputListener((data) => {
    if (!matchesKey(data, Key.ctrl("c"))) return undefined;
    if (runtime?.agent.state.isStreaming) {
      runtime.agent.abort();
      status.setText(c.warningDot("  aborted"));
      tui.requestRender();
      return { consume: true };
    }
    const now = Date.now();
    if (now - lastInterrupt < 1_000) {
      void stop();
    } else {
      lastInterrupt = now;
      status.setText(c.muted("  press Ctrl+C again to exit"));
      tui.requestRender();
    }
    return { consume: true };
  });

  await chatStore.event("ui.opened", { mode: runtime ? "ai" : "local", model: runtime?.modelLabel });
  tui.start();
  await exited;
}

function renderWelcome(container: Container, aiEnabled: boolean, offlineReason: string): void {
  container.addChild(new Spacer(1));
  container.addChild(new Text(`  ${c.accentStrong("🐺")}  ${c.bold(c.strong("Welcome to PardraVerse"))}`, 1, 0));
  container.addChild(new Text(c.secondary("  Local-first practice coach. Think first, code by hand, run local tests."), 1, 0));
  if (!aiEnabled) {
    container.addChild(
      new Text(
        c.warningDot(
          `  ${offlineReason.includes("Contest") ? "Contest lock active. Deterministic local actions only." : "AI unavailable. Local status, browsing, and judging remain available."}`
        ),
        1,
        0
      )
    );
  }
  container.addChild(new Spacer(1));
  container.addChild(new Text(c.muted("  Try: Show my practice status"), 3, 0));
  container.addChild(new Text(c.muted(aiEnabled ? "  Try: Start a focused session for arrays" : "  Try: List my problems"), 3, 0));
  container.addChild(new Spacer(1));
}

function renderUserMessage(container: Container, text: string): void {
  const time = c.muted(formatTurnTime(Date.now()));
  container.addChild(new Text(`  ${time}    ${c.accentStrong(">")}   `, 1, 0));
  container.addChild(new Markdown(text, 5, 0, markdownTheme));
  container.addChild(new Spacer(1));
}

function renderStoredMessage(container: Container, message: AgentMessage): void {
  const text = contentText(message.content);
  if (!text) return;
  const timestamp = typeof message.timestamp === "number" ? message.timestamp : undefined;
  const time = c.muted(formatTurnTime(timestamp));
  const isAssistant = message.role === "assistant";
  const glyph = isAssistant ? c.activeDot("●") : c.accentStrong(">");
  container.addChild(new Text(`  ${time}    ${glyph}   `, 1, 0));
  container.addChild(new Markdown(text, 5, 0, markdownTheme));
  container.addChild(new Spacer(1));
}

async function resolveSession(store: ChatStore, query: string): Promise<ConversationSession> {
  if (!query) throw new Error("Use /open <session-id>.");
  const matches = (await store.sessions.list()).filter((session) => session.id === query || session.id.startsWith(query));
  if (!matches.length) throw new Error(`No session matches ${query}.`);
  if (matches.length > 1) throw new Error(`Session id ${query} is ambiguous.`);
  return store.sessions.open(matches[0]!.id);
}

function renderSessionList(container: Container, sessions: SessionSummary[]): void {
  container.addChild(new Text(c.bold(c.accentStrong("  Sessions")), 1, 0));
  if (!sessions.length) {
    container.addChild(new Text(c.muted("  Empty · no saved conversations"), 3, 0));
  } else {
    for (const session of sessions) {
      const label = session.title ?? session.goal ?? session.problem ?? session.id.slice(0, 8);
      container.addChild(new Text(`  ${c.accent(session.id.slice(0, 8))}  ${c.primary(label)}  ${c.muted(`${session.messageCount} messages`)}`, 3, 0));
    }
  }
  container.addChild(new Spacer(1));
}

function renderNotice(container: Container, message: string): void {
  container.addChild(new Text(c.muted(`  ${message}`), 3, 0));
  container.addChild(new Spacer(1));
}
