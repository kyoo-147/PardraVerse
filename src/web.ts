import { createServer } from "node:http";
import type { PracState } from "./types.js";

function esc(value: unknown): string {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]!);
}

function elapsed(startedAt?: string): string {
  if (!startedAt) return "idle";
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 60_000));
  return minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

export function dashboardHtml(state: PracState): string {
  const accepted = new Set(
    state.attempts.filter((attempt) => attempt.verdict === "accepted").map((attempt) => attempt.problemId),
  );
  const activeProblem = state.problems.find((problem) => problem.id === state.activeSession?.problemId);
  const progress = state.problems.length ? Math.round((accepted.size / state.problems.length) * 100) : 0;
  const problems = state.problems.map((problem) => {
    const attempts = state.attempts.filter((attempt) => attempt.problemId === problem.id).length;
    const active = problem.id === state.activeSession?.problemId;
    return `<tr${active ? ' class="active"' : ""}>
      <td><span class="dot ${accepted.has(problem.id) ? "accepted" : active ? "current" : ""}" aria-hidden="true"></span><span class="sr-only">${accepted.has(problem.id) ? "accepted" : active ? "current" : "not accepted"}</span></td>
      <td><strong>${esc(problem.title)}</strong><small>${esc(problem.id)}</small></td>
      <td>${esc(problem.topic)}</td>
      <td>${esc(problem.difficulty)}</td>
      <td class="number">${attempts || "—"}</td>
    </tr>`;
  }).join("");
  const activity = state.attempts.slice(-6).reverse().map((attempt) => {
    const problem = state.problems.find((candidate) => candidate.id === attempt.problemId);
    return `<li><span class="verdict ${esc(attempt.verdict)}">${esc(attempt.verdict.replace("-", " "))}</span><div><strong>${esc(problem?.title ?? attempt.problemId)}</strong><small>${esc(new Date(attempt.at).toLocaleString())} · ${attempt.passed}/${attempt.total}</small></div></li>`;
  }).join("");
  const topics = state.topics.slice(0, 8).map((topic) => `<li><strong>${esc(topic.name)}</strong><small>${esc(topic.description || topic.id)}</small></li>`).join("");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark">
<title>PardraVerse workspace</title>
<style>
:root{color-scheme:dark;--bg:#0c0d0c;--surface:#121412;--raised:#171a17;--line:#292d29;--text:#f0f2ec;--muted:#8b9288;--green:#b7f36b;--amber:#f0c36b;--red:#ed756d;--blue:#8ab4ef;--mono:"Cascadia Code","SFMono-Regular",Consolas,monospace;--sans:"Segoe UI Variable",Inter,system-ui,sans-serif}*{box-sizing:border-box}html{background:var(--bg)}body{margin:0;color:var(--text);background:var(--bg);font:14px/1.5 var(--sans)}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}.app{min-height:100vh;display:grid;grid-template-rows:auto 1fr auto}.top{height:58px;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;padding:0 max(22px,calc((100vw - 1280px)/2));font-family:var(--mono)}.brand{font-weight:700;letter-spacing:-.03em}.brand span{color:var(--green)}.mode{font-size:11px;color:${state.contestMode ? "var(--amber)" : "var(--muted)"};text-transform:uppercase;letter-spacing:.08em}.layout{width:min(1280px,calc(100% - 44px));margin:36px auto;display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:32px}.main,.side{min-width:0}.intro{display:flex;align-items:end;justify-content:space-between;gap:24px;margin-bottom:28px}.intro h1{margin:0;font-size:clamp(30px,4vw,52px);line-height:1;letter-spacing:-.055em;font-weight:650}.intro p{margin:0;color:var(--muted);font-family:var(--mono);font-size:12px}.stats{display:grid;grid-template-columns:repeat(3,1fr);border:1px solid var(--line);margin-bottom:20px;background:var(--surface)}.stat{padding:18px 20px;border-right:1px solid var(--line)}.stat:last-child{border:0}.stat b{display:block;font:600 24px/1 var(--mono)}.stat span{display:block;color:var(--muted);font-size:11px;margin-top:8px}.progress{height:2px;background:var(--line);margin-top:12px}.progress i{display:block;height:100%;background:var(--green);width:${progress}%}.panel{border:1px solid var(--line);background:var(--surface);margin-bottom:20px}.panel-head{height:50px;padding:0 16px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--line)}.panel-head h2{font-size:13px;margin:0}.panel-head span{font:10px var(--mono);color:var(--muted);text-transform:uppercase;letter-spacing:.08em}table{width:100%;border-collapse:collapse}th,td{text-align:left;border-bottom:1px solid var(--line);padding:13px 12px}th{font:11px var(--mono);color:var(--muted);text-transform:uppercase;letter-spacing:.06em}tbody tr:last-child td{border-bottom:0}tbody tr.active{background:#1a1b16}td:first-child{width:32px}td strong{display:block;font-size:13px;font-weight:600}td small,.side small{display:block;color:var(--muted);font:11px/1.4 var(--mono);margin-top:3px}.number{text-align:right;font-family:var(--mono)}.dot{display:block;width:7px;height:7px;border:1px solid #788176}.dot.accepted{border-color:var(--green);background:var(--green)}.dot.current{border-color:var(--amber);background:var(--amber)}.session{padding:20px}.session .label{font:10px var(--mono);color:var(--muted);text-transform:uppercase;letter-spacing:.08em}.session .time{font:600 36px/1 var(--mono);margin:12px 0 18px;color:${state.activeSession ? "var(--green)" : "var(--muted)"}}.session h2{font-size:18px;line-height:1.2;margin:0 0 7px}.session p{margin:0;color:var(--muted);font-size:12px}.meta{display:grid;grid-template-columns:1fr 1fr;border-top:1px solid var(--line);margin:20px -20px -20px}.meta div{padding:13px 20px;border-right:1px solid var(--line)}.meta div:last-child{border:0}.meta b{display:block;font:12px var(--mono)}.meta span{font-size:11px;color:var(--muted);text-transform:uppercase}.plain-list{margin:0;padding:0}.plain-list li{list-style:none;display:flex;gap:12px;padding:13px 16px;border-bottom:1px solid var(--line)}.plain-list li:last-child{border:0}.plain-list strong{font-size:12px}.verdict{font:11px var(--mono);text-transform:uppercase;color:var(--amber);width:92px;padding-top:2px}.verdict.accepted{color:var(--green)}.verdict.compile-error,.verdict.runtime-error,.verdict.wrong-answer{color:var(--red)}.terminal{width:min(1280px,calc(100% - 44px));margin:0 auto 30px;border:1px solid var(--line);background:var(--raised);padding:14px 16px;color:var(--muted);font:12px var(--mono)}.terminal b{color:var(--green);font-weight:400}.terminal code{color:var(--text)}@media(max-width:850px){.layout{grid-template-columns:1fr}.side{display:grid;grid-template-columns:1fr 1fr;gap:20px}.side .panel{margin:0}.side .panel:last-child{grid-column:1/-1}.intro{align-items:start;flex-direction:column}.stats{grid-template-columns:1fr 1fr}.stat:nth-child(2){border-right:0}.stat:last-child{grid-column:1/-1;border-top:1px solid var(--line)}}@media(max-width:620px){.top{padding:0 16px}.layout,.terminal{width:calc(100% - 24px)}.layout{margin:24px auto}.side{grid-template-columns:1fr}.side .panel:last-child{grid-column:auto}.stats{grid-template-columns:1fr}.stat,.stat:nth-child(2){border-right:0;border-bottom:1px solid var(--line)}.stat:last-child{grid-column:auto;border-bottom:0}.panel{overflow:hidden}.table-scroll{overflow-x:auto}table{white-space:nowrap}.intro h1{font-size:34px}th:nth-child(3),td:nth-child(3){display:none}}
@media(max-width:620px){th:nth-child(5),td:nth-child(5){display:none}}
</style>
</head>
<body><div class="app">
<header class="top"><div class="brand">coding_<span>prac</span></div><div class="mode">${state.contestMode ? "contest lock" : "local workspace"}</div></header>
<div class="layout"><main class="main">
<section class="intro"><h1>Your practice,<br>in one place.</h1><p>${state.activeSession ? "session in progress" : "ready when you are"}</p></section>
<section class="stats" aria-label="Practice summary"><div class="stat"><b>${accepted.size}/${state.problems.length}</b><span>accepted</span><div class="progress"><i></i></div></div><div class="stat"><b>${state.attempts.length}</b><span>attempts recorded</span></div><div class="stat"><b>${state.topics.length}</b><span>topics in your map</span></div></section>
<section class="panel"><div class="panel-head"><h2>Problems</h2><span>${state.problems.length} total</span></div><div class="table-scroll"><table aria-label="Practice problems"><thead><tr><th scope="col">Status</th><th scope="col">Problem</th><th scope="col">Topic</th><th scope="col">Level</th><th scope="col" class="number">Runs</th></tr></thead><tbody>${problems || '<tr><td colspan="5">No problems yet. Start in the terminal and describe what you want to practice.</td></tr>'}</tbody></table></div></section>
</main><aside class="side">
<section class="panel"><div class="panel-head"><h2>Current session</h2><span>${elapsed(state.activeSession?.startedAt)}</span></div><div class="session"><span class="label">focus</span><div class="time">${elapsed(state.activeSession?.startedAt)}</div><h2>${esc(activeProblem?.title ?? state.activeSession?.goal ?? "Nothing active")}</h2><p>${esc(state.activeSession?.goal ?? "Tell the terminal agent what you want to work on.")}</p><div class="meta"><div><b>${esc(activeProblem?.difficulty ?? "—")}</b><span>level</span></div><div><b>${esc(activeProblem?.language ?? "—")}</b><span>language</span></div></div></div></section>
<section class="panel"><div class="panel-head"><h2>Recent activity</h2><span>latest</span></div><ul class="plain-list">${activity || "<li><div><strong>No attempts yet</strong><small>Run a solution from the terminal.</small></div></li>"}</ul></section>
<section class="panel"><div class="panel-head"><h2>Learning map</h2><span>open-ended</span></div><ul class="plain-list">${topics || "<li><div><strong>No topics yet</strong><small>Add any subject you want to learn.</small></div></li>"}</ul></section>
</aside></div>
<div class="terminal"><b>❯</b> <code>prac</code> <span>— continue in the conversational terminal</span></div>
</div></body></html>`;
}

export async function serveDashboard(loadState: () => Promise<PracState>, port: number): Promise<void> {
  const server = createServer(async (request, response) => {
    try {
      if (request.url === "/api/state") {
        const state = await loadState();
        response.writeHead(200, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
        response.end(JSON.stringify(state));
        return;
      }
      if (request.url === "/favicon.ico") {
        response.writeHead(204, { "cache-control": "public, max-age=86400" }).end();
        return;
      }
      if (request.url !== "/" && request.url !== "/index.html") {
        response.writeHead(404).end("Not found");
        return;
      }
      const state = await loadState();
      response.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
      response.end(dashboardHtml(state));
    } catch (error) {
      response.writeHead(500, { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" });
      response.end(error instanceof Error ? error.message : "Could not load workspace state");
    }
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });
  console.log(`Workspace: http://127.0.0.1:${port}`);
  console.log("Press Ctrl+C to stop.");
}
