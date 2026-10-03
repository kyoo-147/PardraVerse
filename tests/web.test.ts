import { describe, expect, it } from "vitest";
import { dashboardHtml } from "../src/web.js";
import { emptyState } from "../src/store.js";

describe("dashboard", () => {
  it("renders real practice state and escapes user content", () => {
    const state = emptyState();
    state.topics.push({ id: "arrays", name: "Arrays <script>", description: "linear scans", createdAt: "2026-10-03T00:00:00.000Z" });
    state.problems.push({
      id: "sum-values",
      title: "Sum values",
      topic: "arrays",
      difficulty: "easy",
      statement: "Print the sum.",
      constraints: [],
      language: "javascript",
      tests: [],
      createdAt: "2026-10-03T00:00:00.000Z",
    });
    state.attempts.push({ id: "a1", problemId: "sum-values", at: "2026-10-03T00:00:00.000Z", passed: 1, total: 1, durationMs: 8, verdict: "accepted" });
    const html = dashboardHtml(state);
    expect(html).toContain("Sum values");
    expect(html).toContain("01");
    expect(html).toContain("Arrays &lt;script&gt;");
    expect(html).not.toContain("Arrays <script>");
  });
});
