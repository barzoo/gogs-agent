import { describe, it, expect } from "vitest";
import { formatOutput } from "../src/formatters.js";

const sampleData = {
  id: 1,
  number: 42,
  title: "Fix login bug",
  state: "open",
  html_url: "https://git.desiyi.com/xing/repo/issues/42",
};

const sampleError = {
  ok: false,
  error: "Issue #42 not found",
  code: "API_ERROR",
  status: 404,
};

describe("formatOutput", () => {
  it("formats success as JSON by default", () => {
    const result = formatOutput(true, sampleData, "json");
    const parsed = JSON.parse(result);
    expect(parsed).toEqual({ ok: true, data: sampleData });
  });

  it("formats error as JSON", () => {
    const result = formatOutput(false, sampleError as any, "json");
    const parsed = JSON.parse(result);
    expect(parsed).toEqual(sampleError);
  });

  it("formats success as markdown", () => {
    const result = formatOutput(true, sampleData, "markdown");
    expect(result).toContain("**Status**: ✅ Success");
    expect(result).toContain("[#42](https://git.desiyi.com/xing/repo/issues/42)");
  });

  it("formats error as markdown", () => {
    const result = formatOutput(false, sampleError as any, "markdown");
    expect(result).toContain("**Error**: Issue #42 not found");
    expect(result).toContain("- **Code**: API_ERROR");
    expect(result).toContain("- **HTTP Status**: 404");
    expect(result).toContain("**Status**: ❌ Failed");
  });

  it("formats success as plain text", () => {
    const result = formatOutput(true, sampleData, "text");
    expect(result).toBe(JSON.stringify({ ok: true, data: sampleData }, null, 2));
  });
});

const makeIssue = (n: number, title: string, state: "open" | "closed") => ({
  id: n,
  number: n,
  title,
  body: "",
  state,
  labels: [{ id: 1, name: "bug", color: "#ee0701" }],
  assignee: null,
  milestone: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  html_url: `https://git.desiyi.com/xing/repo/issues/${n}`,
  comments: 2,
});

const makePR = (n: number, title: string, state: "open" | "closed", merged: boolean) => ({
  id: n, number: n, title, body: "", state,
  head: { label: "", ref: "feature", sha: "abc" },
  base: { label: "", ref: "main", sha: "def" },
  assignee: null, merged, merged_by: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  html_url: `https://git.desiyi.com/xing/repo/pulls/${n}`,
});

const makeComment = (body: string, login: string) => ({
  id: 1, body,
  user: { id: 1, login, full_name: "", avatar_url: "" },
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
});

const makeLabel = (id: number, name: string, color: string) => ({
  id, name, color,
});

describe("formatOutput markdown list tables", () => {
  it("renders issue list as markdown table", () => {
    const issues = [makeIssue(1, "Fix bug", "open"), makeIssue(2, "Add feat", "closed")];
    const result = formatOutput(true, issues, "markdown");
    expect(result).toContain("| # | Title | State | Labels | Comments |");
    expect(result).toContain("| 1 |");
    expect(result).toContain("Fix bug");
    expect(result).toContain("bug");
    expect(result).toContain("```json");
  });

  it("renders PR list as markdown table", () => {
    const prs = [makePR(1, "Feature branch", "open", false)];
    const result = formatOutput(true, prs, "markdown");
    expect(result).toContain("| # | Title | State | Source → Target | Merged |");
    expect(result).toContain("feature → main");
  });

  it("renders comment list as markdown table", () => {
    const comments = [makeComment("Looks good", "xing")];
    const result = formatOutput(true, comments, "markdown");
    expect(result).toContain("| User | Created | Body |");
    expect(result).toContain("xing");
    expect(result).toContain("Looks good");
  });

  it("renders label list as markdown table", () => {
    const labels = [makeLabel(1, "bug", "#ee0701")];
    const result = formatOutput(true, labels, "markdown");
    expect(result).toContain("| ID | Name | Color |");
    expect(result).toContain("bug");
    expect(result).toContain("`#ee0701`");
  });
});
