import pc from "picocolors";
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
import { answerOffline } from "./offline-chat.js";
import { PracticeWorkspace } from "./practice.js";
import { contentText, createShellModel, formatTurnTime } from "./ui/view-model.js";
import { makeContext, makeHeader, makeSidebar, makeStatus, makeTabs } from "./ui/shell.js";

const selectTheme: SelectListTheme = {
  selectedPrefix: (text) => pc.magenta(text), selectedText: (text) => pc.bold(text),
  description: (text) => pc.dim(text), scrollInfo: (text) => pc.dim(text), noMatch: (text) => pc.yellow(text),
};
const markdownTheme: MarkdownTheme = {
  heading: (text) => pc.bold(pc.magenta(text)), link: (text) => pc.cyan(text), linkUrl: (text) => pc.dim(text),
  code: (text) => pc.cyan(text), codeBlock: (text) => text, codeBlockBorder: (text) => pc.dim(text),
  quote: (text) => pc.dim(text), quoteBorder: (text) => pc.magenta(text), hr: (text) => pc.dim(text),
  listBullet: (text) => pc.magenta(text), bold: (text) => pc.bold(text), italic: (text) => pc.italic(text),
  strikethrough: (text) => pc.strikethrough(text), underline: (text) => pc.underline(text),
};

export async function launchChat(root = process.cwd()): Promise<void> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) throw new Error("Interactive chat needs a terminal. Use the explicit prac commands in scripts or CI.");
  const workspace = new PracticeWorkspace(root);
  await workspace.ensure();
  const chatStore = new ChatStore(root);
  let runtime: PracticeAgentRuntime | undefined;
  let offlineReason = "";
  try { runtime = await createPracticeAgent(root); }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("PRAC_AI_API_KEY") && !message.includes("Contest mode is on")) throw error;
    offlineReason = message;
  }

  const state = await workspace.store.load();
  const model = createShellModel(root, { aiAvailable: Boolean(runtime), contestMode: state.contestMode, modelLabel: runtime?.modelLabel });
  const terminal = new ProcessTerminal();
  const tui = new TuiAltScreen(terminal);
  const transcript = new Container();
  const status = makeStatus("");
  const editor = new Editor(tui, { borderColor: pc.magenta, selectList: selectTheme }, { paddingX: 1 });
  const scroll = new ScrollView(transcript, { follow: "end", primary: true, overscroll: "chain" });
  const center = new VStack([
    makeTabs(),
    { component: scroll, basis: 0, grow: 1, minSize: 1 },
  ]);
  const bottom = new VStack([editor, status, new Text(pc.dim("  Ctrl+L clear  ·  /help commands  ·  /new fresh session  ·  /quit exit"), 1, 0)]);
  const main = new HStack([
    { component: makeSidebar(model), basis: 28, minSize: 22, maxSize: 34 },
    { component: center, basis: 0, grow: 1, minSize: 34 },
    { component: makeContext(model, !runtime ? (offlineReason.includes("Contest") ? "Contest lock: local actions only" : "AI unavailable: local actions only") : undefined), basis: 36, minSize: 28, maxSize: 44 },
  ]);
  tui.setLayoutRoot(new VStack([makeHeader(model), { component: main, basis: 0, grow: 1, minSize: 8 }, { component: bottom, basis: "auto", shrink: 1, minSize: 3 }]));
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
  const exited = new Promise<void>((resolve) => { resolveExit = resolve; });
  const stop = async (): Promise<void> => {
    if (stopping) return;
    stopping = true;
    editor.disableSubmit = true;
    if (runtime && !localFallbackActive) { await runtime.agent.waitForIdle(); await chatStore.replaceMessages(runtime.agent.state.messages as AgentMessage[]); }
    else await chatStore.replaceMessages(offlineMessages);
    await chatStore.event("ui.closed", { mode: runtime ? "ai" : "local" });
    await terminal.drainInput(1_000);
    tui.stop(); resolveExit();
  };

  runtime?.agent.subscribe((event) => {
    if (event.type === "message_start" && event.message.role === "assistant") { assistantText = ""; assistantView = undefined; }
    if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
      if (!assistantView) { assistantView = new Markdown("", 3, 0, markdownTheme); transcript.addChild(new Text(pc.magenta(`  ${formatTurnTime(Date.now())}  ●  │`), 1, 0)); transcript.addChild(assistantView); }
      assistantText += event.assistantMessageEvent.delta; assistantView.setText(assistantText); tui.requestRender();
    }
    if (event.type === "tool_execution_start") { status.setText(pc.dim(`  working · ${event.toolName.replaceAll("_", " ")}`)); tui.requestRender(); }
    if (event.type === "tool_execution_end") { transcript.addChild(new Text(pc.dim(`  ↳ ${event.toolName.replaceAll("_", " ")} ${event.isError ? pc.red("failed") : pc.green("done")}`), 3, 0)); tui.requestRender(); }
    if (event.type === "agent_end") { status.setText(""); editor.disableSubmit = false; transcript.addChild(new Spacer(1)); tui.setFocus(editor); tui.requestRender(); }
  });
  editor.onSubmit = (raw) => { const text = raw.trim(); if (!text) return; editor.setText(""); void handleInput(text); };

  async function handleInput(text: string): Promise<void> {
    if (text === "/quit" || text === "/exit") return stop();
    if (text === "/new") { runtime?.agent.reset(); await chatStore.reset(); offlineMessages = []; transcript.clear(); renderWelcome(transcript, Boolean(runtime), offlineReason); tui.requestRender(); return; }
    if (text === "/help") { transcript.addChild(new Text(pc.dim("  Try: Show my practice status · Start a session · Run my current solution · /new · /quit"), 3, 0)); tui.requestRender(); return; }
    renderUserMessage(transcript, text);
    editor.disableSubmit = true;
    const current = await workspace.store.load();
    const localOnly = !runtime || current.contestMode;
    status.setText(pc.dim(localOnly ? "  local only" : "  thinking")); tui.requestRender();
    try {
      if (runtime && !current.contestMode) await runtime.agent.prompt(text);
      else {
        if (!localFallbackActive) { offlineMessages = [...runtime!.agent.state.messages] as AgentMessage[]; localFallbackActive = true; }
        const answer = await answerOffline(workspace, text);
        offlineMessages.push({ role: "user", content: text, timestamp: Date.now() }, { role: "assistant", content: [{ type: "text", text: answer }], api: "offline", provider: "coding-prac", model: "local", usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } }, stopReason: "stop", timestamp: Date.now() });
        await chatStore.replaceMessages(offlineMessages);
        transcript.addChild(new Text(pc.magenta(`  ${formatTurnTime(Date.now())}  ●  │`), 1, 0)); transcript.addChild(new Markdown(answer, 3, 0, markdownTheme)); transcript.addChild(new Spacer(1));
        status.setText(""); editor.disableSubmit = false; tui.setFocus(editor); tui.requestRender();
      }
    } catch (error) { status.setText(""); editor.disableSubmit = false; transcript.addChild(new Text(pc.red(`  ${error instanceof Error ? error.message : String(error)}`), 3, 0)); transcript.addChild(new Spacer(1)); tui.requestRender(); }
  }

  tui.addInputListener((data) => {
    if (!matchesKey(data, Key.ctrl("c"))) return undefined;
    if (runtime?.agent.state.isStreaming) { runtime.agent.abort(); status.setText(pc.yellow("  aborted")); tui.requestRender(); return { consume: true }; }
    const now = Date.now();
    if (now - lastInterrupt < 1_000) void stop(); else { lastInterrupt = now; status.setText(pc.dim("  press Ctrl+C again to exit")); tui.requestRender(); }
    return { consume: true };
  });
  await chatStore.event("ui.opened", { mode: runtime ? "ai" : "local", model: runtime?.modelLabel });
  tui.start(); await exited;
}

function renderWelcome(container: Container, aiEnabled: boolean, offlineReason: string): void {
  container.addChild(new Spacer(1));
  container.addChild(new Text(pc.bold(pc.magenta("  Begin a practice session")), 1, 0));
  container.addChild(new Text(pc.dim("  Describe a goal; local state and tools remain available underneath."), 1, 0));
  if (!aiEnabled) container.addChild(new Text(pc.yellow(`  ${offlineReason.includes("Contest") ? "Contest lock active. Deterministic local actions only." : "AI unavailable. Local status, browsing, and judging remain available."}`), 1, 0));
  container.addChild(new Spacer(1));
  container.addChild(new Text(pc.dim("  Try: Show my practice status"), 3, 0));
  container.addChild(new Text(pc.dim(aiEnabled ? "  Try: Start a focused session for arrays" : "  Try: List my problems"), 3, 0));
  container.addChild(new Spacer(1));
}

function renderUserMessage(container: Container, text: string): void {
  container.addChild(new Text(pc.magenta(`  ${formatTurnTime(Date.now())}  ›  │`), 1, 0));
  container.addChild(new Markdown(text, 3, 0, markdownTheme));
  container.addChild(new Spacer(1));
}

function renderStoredMessage(container: Container, message: AgentMessage): void {
  const text = contentText(message.content);
  if (!text) return;
  const timestamp = typeof message.timestamp === "number" ? message.timestamp : undefined;
  const assistant = message.role === "assistant";
  container.addChild(new Text(pc.magenta(`  ${formatTurnTime(timestamp)}  ${assistant ? "●" : "›"}  │`), 1, 0));
  container.addChild(new Markdown(text, 3, 0, markdownTheme));
  container.addChild(new Spacer(1));
}
