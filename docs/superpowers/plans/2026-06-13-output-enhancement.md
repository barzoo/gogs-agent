# Output Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `--output <path>` global flag (with extension-based format inference) and render Markdown list outputs as tables.

**Architecture:** New `src/output.ts` handles file extension inference and stdout/file writing. `src/formatters.ts` is extended to detect arrays and render entity-specific Markdown tables. CLI `run()` determines effective format from `--output` extension, formats the result, and routes to stdout or file.

**Tech Stack:** TypeScript 5.x, Vitest, Node.js fs/promises

**Source spec:** `docs/superpowers/specs/2026-06-13-output-enhancement-design.md`

---

### File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/types.ts` | Modify | Add `output?: string` to `AppConfig` |
| `src/config.ts` | Modify | Read `GOGS_OUTPUT` and CLI `--output` |
| `src/output.ts` | **Create** | `inferFormatFromPath()`, `writeOutput()` |
| `tests/output.test.ts` | **Create** | Unit tests for output writer |
| `src/formatters.ts` | Modify | Render arrays as Markdown tables |
| `tests/formatters.test.ts` | Modify | Add list-table tests |
| `src/cli.ts` | Modify | Add `--output` flag, use effective format + writeOutput |

---

### Task 1: Output Writer + Config

**Files:**
- Create: `src/output.ts`
- Create: `tests/output.test.ts`
- Modify: `src/types.ts`
- Modify: `src/config.ts`

- [ ] **Step 1: Add `output` to types**

In `src/types.ts`, add `output?: string` to `AppConfig`:

```typescript
export interface AppConfig {
  baseUrl: string;
  apiKey: string;
  defaultRepo?: string;
  verbose: boolean;
  timeout: number;
  format: "json" | "markdown" | "text";
  repo?: string;
  output?: string;  // NEW
}
```

- [ ] **Step 2: Update config loader**

In `src/config.ts`, change the function signature and return object:

```typescript
export function loadConfig(cliOpts: {
  repo?: string;
  format?: "json" | "markdown" | "text";
  output?: string;
}): AppConfig {
  const apiKey = process.env.GOGS_API_KEY;
  if (!apiKey) {
    throw new ConfigError(
      "GOGS_API_KEY is required. Set it in .env or as environment variable."
    );
  }

  return {
    baseUrl: process.env.GOGS_BASE_URL || "https://git.desiyi.com/api/v1",
    apiKey,
    defaultRepo: process.env.GOGS_DEFAULT_REPO || undefined,
    verbose: process.env.GOGS_VERBOSE === "true",
    timeout: process.env.GOGS_TIMEOUT
      ? parseInt(process.env.GOGS_TIMEOUT, 10)
      : 30000,
    repo: cliOpts.repo,
    format: cliOpts.format || "json",
    output: cliOpts.output || process.env.GOGS_OUTPUT || undefined,
  };
}
```

- [ ] **Step 3: Write failing tests for output writer**

Create `tests/output.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { inferFormatFromPath, writeOutput } from "../src/output.js";
import { mkdtempSync, readFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

describe("inferFormatFromPath", () => {
  it("returns json for .json", () => {
    expect(inferFormatFromPath("out.json")).toBe("json");
  });

  it("returns markdown for .md", () => {
    expect(inferFormatFromPath("out.md")).toBe("markdown");
  });

  it("returns markdown for .markdown", () => {
    expect(inferFormatFromPath("out.markdown")).toBe("markdown");
  });

  it("returns text for .txt", () => {
    expect(inferFormatFromPath("out.txt")).toBe("text");
  });

  it("returns text for .text", () => {
    expect(inferFormatFromPath("out.text")).toBe("text");
  });

  it("returns null for unknown extension", () => {
    expect(inferFormatFromPath("out.xyz")).toBeNull();
  });

  it("is case-insensitive", () => {
    expect(inferFormatFromPath("out.JSON")).toBe("json");
    expect(inferFormatFromPath("out.MD")).toBe("markdown");
  });
});

describe("writeOutput", () => {
  it("writes to file when path provided", async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), "gogs-agent-test-"));
    const filePath = join(tmpDir, "output.json");

    await writeOutput("hello", filePath);
    const content = readFileSync(filePath, "utf-8");
    expect(content).toBe("hello");

    rmSync(tmpDir, { recursive: true, force: true });
  });
});
```

Run: `npx vitest run tests/output.test.ts` — tests FAIL (module not found)

- [ ] **Step 4: Implement `src/output.ts`**

```typescript
import { writeFile } from "fs/promises";

export function inferFormatFromPath(
  path: string
): "json" | "markdown" | "text" | null {
  const lower = path.toLowerCase();
  if (lower.endsWith(".json")) return "json";
  if (lower.endsWith(".md") || lower.endsWith(".markdown")) return "markdown";
  if (lower.endsWith(".txt") || lower.endsWith(".text")) return "text";
  return null;
}

export async function writeOutput(
  text: string,
  outputPath?: string
): Promise<void> {
  if (!outputPath) {
    process.stdout.write(text);
    if (!text.endsWith("\n")) process.stdout.write("\n");
    return;
  }
  await writeFile(outputPath, text, "utf-8");
}
```

Run: `npx vitest run tests/output.test.ts` — all tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/output.ts tests/output.test.ts src/types.ts src/config.ts
git commit -m "feat: add output writer and config support for --output flag"
```

---

### Task 2: Markdown List Tables

**Files:**
- Modify: `src/formatters.ts`
- Modify: `tests/formatters.test.ts`

- [ ] **Step 1: Write failing tests for list tables**

Add to `tests/formatters.test.ts` (before the final closing brace):

```typescript
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
```

Run: `npx vitest run tests/formatters.test.ts` — 4 new tests FAIL

- [ ] **Step 2: Implement markdown list tables in `src/formatters.ts`**

Replace the entire file with:

```typescript
import type { CliOutput } from "./types.js";

export function formatOutput(
  ok: boolean,
  dataOrError: unknown,
  format: "json" | "markdown" | "text"
): string {
  if (format === "markdown") {
    return formatMarkdown(ok, dataOrError);
  }
  const payload = ok ? { ok, data: dataOrError } : dataOrError;
  if (format === "text") {
    return JSON.stringify(payload, null, 2);
  }
  return JSON.stringify(payload);
}

function formatMarkdown(ok: boolean, payload: unknown): string {
  if (ok) {
    if (Array.isArray(payload)) {
      return formatArrayMarkdown(payload);
    }
    return formatObjectMarkdown(payload as Record<string, unknown>);
  } else {
    const err = payload as CliOutput;
    let md = `**Status**: ❌ Failed\n\n`;
    md += `**Error**: ${err.error}\n`;
    if (err.code) md += `- **Code**: ${err.code}\n`;
    if (err.status) md += `- **HTTP Status**: ${err.status}\n`;
    return md;
  }
}

function formatObjectMarkdown(data: Record<string, unknown>): string {
  let md = `**Status**: ✅ Success\n\n`;

  if (typeof data === "object" && data !== null) {
    if ("html_url" in data && "title" in data && "number" in data) {
      md += `[#${data["number"]}](${data["html_url"]}) — **${data["title"]}**\n`;
    }
    if ("state" in data) {
      md += `- **State**: ${data["state"]}\n`;
    }
    if ("body" in data && data["body"]) {
      md += `\n${data["body"]}\n`;
    }
  }

  md += `\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``;
  return md;
}

function formatArrayMarkdown(items: unknown[]): string {
  if (items.length === 0) {
    return `**Status**: ✅ Success\n\nNo results.\n\n\`\`\`json\n[]\n\`\`\``;
  }

  const first = items[0] as Record<string, unknown>;

  if ("html_url" in first && "title" in first && "number" in first && "comments" in first) {
    return formatIssueListMarkdown(items as Array<Record<string, unknown>>);
  }

  if ("html_url" in first && "title" in first && "number" in first && "merged" in first) {
    return formatPRListMarkdown(items as Array<Record<string, unknown>>);
  }

  if ("user" in first && "body" in first) {
    return formatCommentListMarkdown(items as Array<Record<string, unknown>>);
  }

  if ("color" in first && "name" in first && "id" in first) {
    return formatLabelListMarkdown(items as Array<Record<string, unknown>>);
  }

  return formatGenericListMarkdown(items);
}

function formatIssueListMarkdown(issues: Array<Record<string, unknown>>): string {
  let md = `**Status**: ✅ Success\n\n`;
  md += "| # | Title | State | Labels | Comments |\n";
  md += "|---|-------|-------|--------|----------|\n";

  for (const item of issues) {
    const number = item["number"];
    const title = item["title"];
    const htmlUrl = item["html_url"];
    const state = item["state"];
    const labels = ((item["labels"] as Array<{ name: string }>) || []).map((l) => l.name).join(", ") || "-";
    const comments = item["comments"] ?? 0;

    md += `| ${number} | [${title}](${htmlUrl}) | ${state} | ${labels} | ${comments} |\n`;
  }

  md += `\n\`\`\`json\n${JSON.stringify(issues, null, 2)}\n\`\`\``;
  return md;
}

function formatPRListMarkdown(prs: Array<Record<string, unknown>>): string {
  let md = `**Status**: ✅ Success\n\n`;
  md += "| # | Title | State | Source → Target | Merged |\n";
  md += "|---|-------|-------|-----------------|--------|\n";

  for (const item of prs) {
    const number = item["number"];
    const title = item["title"];
    const htmlUrl = item["html_url"];
    const state = item["state"];
    const head = (item["head"] as { ref: string })?.ref;
    const base = (item["base"] as { ref: string })?.ref;
    const merged = item["merged"] ? "Yes" : "No";

    md += `| ${number} | [${title}](${htmlUrl}) | ${state} | ${head} → ${base} | ${merged} |\n`;
  }

  md += `\n\`\`\`json\n${JSON.stringify(prs, null, 2)}\n\`\`\``;
  return md;
}

function formatCommentListMarkdown(comments: Array<Record<string, unknown>>): string {
  let md = `**Status**: ✅ Success\n\n`;
  md += "| User | Created | Body |\n";
  md += "|------|---------|------|\n";

  for (const item of comments) {
    const user = (item["user"] as { login: string })?.login;
    const created = item["created_at"];
    const body = String(item["body"] || "").replace(/\|/g, "\\|").replace(/\n/g, " ");

    md += `| ${user} | ${created} | ${body} |\n`;
  }

  md += `\n\`\`\`json\n${JSON.stringify(comments, null, 2)}\n\`\`\``;
  return md;
}

function formatLabelListMarkdown(labels: Array<Record<string, unknown>>): string {
  let md = `**Status**: ✅ Success\n\n`;
  md += "| ID | Name | Color |\n";
  md += "|----|------|-------|\n";

  for (const item of labels) {
    const id = item["id"];
    const name = item["name"];
    const color = item["color"];

    md += `| ${id} | ${name} | \`${color}\` |\n`;
  }

  md += `\n\`\`\`json\n${JSON.stringify(labels, null, 2)}\n\`\`\``;
  return md;
}

function formatGenericListMarkdown(items: unknown[]): string {
  let md = `**Status**: ✅ Success\n\n`;
  md += "| Item |\n";
  md += "|------|\n";

  for (const item of items) {
    md += `| ${JSON.stringify(item).slice(0, 80)} |\n`;
  }

  md += `\n\`\`\`json\n${JSON.stringify(items, null, 2)}\n\`\`\``;
  return md;
}
```

Run: `npx vitest run tests/formatters.test.ts` — all tests PASS
Run: `npx vitest run` — all 65 tests still pass

- [ ] **Step 3: Commit**

```bash
git add src/formatters.ts tests/formatters.test.ts
git commit -m "feat: render markdown lists as tables"
```

---

### Task 3: CLI Wiring

**Files:**
- Modify: `src/cli.ts`

- [ ] **Step 1: Add `--output` flag and effective format logic**

In `src/cli.ts`:

a) Add import for output helpers:
```typescript
import { inferFormatFromPath, writeOutput } from "./output.js";
```

b) Add `--output` option to the global program setup:

```typescript
program
  .name("gogs")
  .description("CLI tool for operating Gogs repositories")
  .version("0.1.0")
  .option("--repo <owner/repo>", "Target repository (or set GOGS_DEFAULT_REPO)")
  .option("--format <fmt>", "Output format: json, markdown, text", "json")
  .option("--output <path>", "Write output to file instead of stdout")
  .option("--verbose", "Enable verbose logging to stderr", false);
```

c) Update the `run()` function:

```typescript
async function run(fn: (config: ReturnType<typeof loadConfig>, client: ReturnType<typeof createGogsClient>) => Promise<void>) {
  try {
    const cliOpts = program.opts();
    const outputPath = cliOpts.output as string | undefined;
    const effectiveFormat = inferFormatFromPath(outputPath || "") || cliOpts.format;

    const config = loadConfig({
      repo: cliOpts.repo,
      format: effectiveFormat,
      output: outputPath,
    });

    const client = createGogsClient({
      baseUrl: config.baseUrl,
      apiKey: config.apiKey,
      timeout: config.timeout,
    });

    if (config.verbose) {
      console.error(`[verbose] Gogs API base: ${config.baseUrl}`);
      if (config.output) {
        console.error(`[verbose] Output file: ${config.output}`);
      }
    }

    await fn(config, client);
  } catch (err) {
    // ... existing error handling stays the same ...
  }
}
```

d) Add a `printResult` helper inside `src/cli.ts`, after the imports and before command definitions:

```typescript
async function printResult(result: unknown, config: AppConfig): Promise<void> {
  const text = formatOutput(true, result, config.format);
  await writeOutput(text, config.output);
}
```

Don't forget to add `AppConfig` to the `types` import if not already imported:
```typescript
import type { AppConfig } from "./types.js";
```

e) Replace every `console.log(formatOutput(true, result, config.format));` with `await printResult(result, config);`.

There are multiple occurrences across issue/pr/repo/comment/label actions. For example:

```typescript
// Before:
console.log(formatOutput(true, result, config.format));

// After:
await printResult(result, config);
```

Repeat for all command actions (issue list/get/create/close/reopen/update, pr list/get/create/merge/diff, repo info, comment list/create, label list/create).

Also note: because `run()` now has async `writeOutput`, all `.action()` callbacks are already async, so `await fn(config, client)` works.

- [ ] **Step 2: Verify**

Run: `npx tsc` — no errors
Run: `node dist/cli.js --help` — shows `--output` option
Run: `npx vitest run` — all tests pass

- [ ] **Step 3: Commit**

```bash
git add src/cli.ts
git commit -m "feat: add --output flag with extension-based format inference"
```

---

### Task 4: Smoke Test + Skill Update

- [ ] **Step 1: Smoke test markdown list**

```bash
node dist/cli.js issue list --repo xing/gogs-agent --format markdown
node dist/cli.js label list --repo xing/gogs-agent --format markdown
```

Expected: Tables rendered, followed by JSON block.

- [ ] **Step 2: Smoke test --output**

```bash
node dist/cli.js issue list --repo xing/gogs-agent --output /tmp/issues.json
node dist/cli.js issue list --repo xing/gogs-agent --output /tmp/issues.md
node dist/cli.js issue list --repo xing/gogs-agent --output /tmp/issues.txt
```

Verify file contents:
- `/tmp/issues.json` — one-line JSON
- `/tmp/issues.md` — markdown table
- `/tmp/issues.txt` — pretty-printed JSON

- [ ] **Step 3: Smoke test output format precedence**

```bash
node dist/cli.js issue list --repo xing/gogs-agent --format markdown --output /tmp/issues.json
```

Expected: File contains JSON (extension wins over `--format`).

- [ ] **Step 4: Run full suite and build**

Run: `npx vitest run` — all tests PASS
Run: `npm run build` — compiles + regenerates skill.md

- [ ] **Step 5: Commit and push**

```bash
git add skill.md
git commit -m "chore: regenerate skill.md with --output support"
git push origin master
```

---

### Summary

| Task | Files Created | Files Modified | Tests |
|------|--------------|---------------|-------|
| 1 | `src/output.ts`, `tests/output.test.ts` | `src/types.ts`, `src/config.ts` | 8 |
| 2 | — | `src/formatters.ts`, `tests/formatters.test.ts` | 4 |
| 3 | — | `src/cli.ts` | — |
| 4 | — | `skill.md` | — |

**Total new tests:** 12  
**Total tests after:** ~77
