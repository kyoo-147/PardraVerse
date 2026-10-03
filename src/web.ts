import { createServer } from "node:http";
import type { PracState } from "./types.js";

function esc(value: unknown): string {
  return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
}

export function dashboardHtml(state: PracState): string {
  const accepted = new Set(state.attempts.filter((attempt) => attempt.verdict === "accepted").map((attempt) => attempt.problemId));
  const rows = state.problems
    .map((problem) => `<tr><td>${accepted.has(problem.id) ? "✓" : "·"}</td><td><strong>${esc(problem.title)}</strong><small>${esc(problem.id)}</small></td><td>${esc(problem.topic)}</td><td><span class="pill ${esc(problem.difficulty)}">${esc(problem.difficulty)}</span></td><td>${state.attempts.filter((attempt) => attempt.problemId === problem.id).length}</td></tr>`)
    .join("");
  const topicRows = state.topics.map((topic) => `<li><strong>${esc(topic.name)}</strong><span>${esc(topic.description)}</span></li>`).join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>coding_prac</title><style>
:root{color-scheme:dark;--bg:#0d0f0e;--panel:#151816;--line:#2a302c;--text:#edf2ee;--muted:#929d96;--acid:#b8f34a;--amber:#ffca5c}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:15px/1.5 ui-monospace,SFMono-Regular,Consolas,monospace}main{max-width:1100px;margin:auto;padding:44px 24px 80px}header{display:flex;justify-content:space-between;align-items:end;border-bottom:1px solid var(--line);padding-bottom:24px}h1{font-size:clamp(30px,6vw,70px);letter-spacing:-.06em;line-height:.9;margin:0}h1 em{color:var(--acid);font-style:normal}header p{color:var(--muted);max-width:340px;margin:0}.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--line);margin:32px 0;border:1px solid var(--line)}.stat{background:var(--panel);padding:20px}.stat b{font-size:30px;display:block}.stat span,small{color:var(--muted);display:block}section{margin-top:42px}h2{font-size:14px;text-transform:uppercase;letter-spacing:.15em;color:var(--acid)}table{width:100%;border-collapse:collapse;background:var(--panel);border:1px solid var(--line)}td,th{text-align:left;padding:13px;border-bottom:1px solid var(--line)}th{color:var(--muted);font-weight:400}.pill{padding:3px 7px;border:1px solid var(--line);font-size:12px}.hard{color:#ff7777}.medium{color:var(--amber)}ul{padding:0;display:grid;grid-template-columns:repeat(2,1fr);gap:1px;background:var(--line);border:1px solid var(--line)}li{list-style:none;background:var(--panel);padding:16px}li span{display:block;color:var(--muted);margin-top:6px}@media(max-width:700px){header{display:block}header p{margin-top:18px}.stats,ul{grid-template-columns:1fr}table{font-size:12px}td,th{padding:9px}}</style></head><body><main><header><h1>coding_<em>prac</em></h1><p>Local practice state. The CLI remains the primary interface; this page is a quiet read-only view.</p></header><div class="stats"><div class="stat"><b>${state.problems.length}</b><span>problems</span></div><div class="stat"><b>${accepted.size}</b><span>accepted</span></div><div class="stat"><b>${state.attempts.length}</b><span>attempts</span></div></div><section><h2>Problem board</h2><table><thead><tr><th></th><th>Problem</th><th>Topic</th><th>Level</th><th>Runs</th></tr></thead><tbody>${rows || '<tr><td colspan="5">No problems yet. Use prac problem create.</td></tr>'}</tbody></table></section><section><h2>Open learning map</h2><ul>${topicRows || "<li>No topics yet.</li>"}</ul></section></main></body></html>`;
}

export async function serveDashboard(state: PracState, port: number): Promise<void> {
  const server = createServer((request, response) => {
    if (request.url === "/api/state") {
      response.writeHead(200, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
      response.end(JSON.stringify(state));
      return;
    }
    if (request.url !== "/" && request.url !== "/index.html") {
      response.writeHead(404).end("Not found");
      return;
    }
    response.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
    response.end(dashboardHtml(state));
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });
  console.log(`Dashboard: http://127.0.0.1:${port}`);
  console.log("Press Ctrl+C to stop.");
}
