# Issue Update Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `gogs issue update` command to edit any combination of issue fields (title, body, state, assignee, milestone, labels) with a single `PATCH /issues/{n}` call.

**Architecture:** New `issueUpdate()` function in `src/commands/issue.ts` builds a partial body from optional params, resolves label names to IDs, validates at least one field is present, and calls `PATCH`. CLI adds `issue update` subcommand. Existing close/reopen unchanged.

**Tech Stack:** TypeScript 5.x, Vitest (same as Phase 1)

**Source spec:** `docs/superpowers/specs/2026-06-13-issue-update-design.md`

---

### File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/types.ts` | Modify | Add `IssueUpdateParams` |
| `src/commands/issue.ts` | Modify | Add `issueUpdate()` function |
| `src/cli.ts` | Modify | Add `issue update` subcommand |
| `tests/commands/issue.test.ts` | Modify | Add 7 tests for `issueUpdate` |

---

### Task 1: Type + Implementation

**Files:**
- Modify: `src/types.ts`
- Modify: `src/commands/issue.ts`
- Modify: `tests/commands/issue.test.ts`

- [ ] **Step 1: Add `IssueUpdateParams` type**

In `src/types.ts`, insert after `IssueCloseReopenParams`:

```typescript
export interface IssueUpdateParams {
  repo: string;
  number: number;
  title?: string;
  body?: string;
  state?: "open" | "closed";
  assignee?: string;
  milestone?: number;
  labels?: string;
}
```

- [ ] **Step 2: Write failing tests**

In `tests/commands/issue.test.ts`, add `Label` to existing import:
```typescript
import type { Issue, Label } from "../../src/types.js";
```

Add `issueUpdate` to the import from commands:
```typescript
import { issueList, issueGet, issueCreate, issueCloseReopen, issueUpdate } from "../../src/commands/issue.js";
```

Add these tests after the `issueCloseReopen` describe block:

```typescript
describe("issueUpdate", () => {
  it("updates title only", async () => {
    const updatedIssue = makeMockIssue(1, "New Title");
    const mockClient: GogsClient = {
      request: vi.fn().mockResolvedValue({ ok: true, data: updatedIssue }),
    };

    const result = await issueUpdate(mockClient, {
      repo: "xing/test", number: 1, title: "New Title",
    });

    expect(mockClient.request).toHaveBeenCalledWith(
      "PATCH", "/repos/xing/test/issues/1",
      { body: { title: "New Title" } }
    );
    expect(result).toEqual(updatedIssue);
  });

  it("updates body only", async () => {
    const updatedIssue = makeMockIssue(1, "Old", "open");
    const mockClient: GogsClient = {
      request: vi.fn().mockResolvedValue({ ok: true, data: updatedIssue }),
    };

    await issueUpdate(mockClient, {
      repo: "xing/test", number: 1, body: "New body text",
    });

    expect(mockClient.request).toHaveBeenCalledWith(
      "PATCH", "/repos/xing/test/issues/1",
      { body: { body: "New body text" } }
    );
  });

  it("updates state only", async () => {
    const updatedIssue = makeMockIssue(1, "Old", "closed");
    const mockClient: GogsClient = {
      request: vi.fn().mockResolvedValue({ ok: true, data: updatedIssue }),
    };

    await issueUpdate(mockClient, {
      repo: "xing/test", number: 1, state: "closed",
    });

    expect(mockClient.request).toHaveBeenCalledWith(
      "PATCH", "/repos/xing/test/issues/1",
      { body: { state: "closed" } }
    );
  });

  it("updates multiple fields at once", async () => {
    const updatedIssue = makeMockIssue(1, "New Title", "closed");
    const mockClient: GogsClient = {
      request: vi.fn().mockResolvedValue({ ok: true, data: updatedIssue }),
    };

    await issueUpdate(mockClient, {
      repo: "xing/test", number: 1,
      title: "New Title",
      state: "closed",
      assignee: "xing",
    });

    expect(mockClient.request).toHaveBeenCalledWith(
      "PATCH", "/repos/xing/test/issues/1",
      { body: { title: "New Title", state: "closed", assignee: "xing" } }
    );
  });

  it("updates with labels (resolves names to IDs)", async () => {
    const mockLabels: Label[] = [
      { id: 1, name: "bug", color: "#ee0701" },
      { id: 2, name: "urgent", color: "#d93f0b" },
    ];
    const updatedIssue = makeMockIssue(1, "Old");
    const mockClient: GogsClient = {
      request: vi.fn()
        .mockResolvedValueOnce({ ok: true, data: mockLabels })     // GET /labels
        .mockResolvedValueOnce({ ok: true, data: updatedIssue }),  // PATCH /issues
    };

    await issueUpdate(mockClient, {
      repo: "xing/test", number: 1, labels: "bug,urgent",
    });

    expect(mockClient.request).toHaveBeenNthCalledWith(1,
      "GET", "/repos/xing/test/labels"
    );
    expect(mockClient.request).toHaveBeenNthCalledWith(2,
      "PATCH", "/repos/xing/test/issues/1",
      { body: { labels: [1, 2] } }
    );
  });

  it("updates all fields at once", async () => {
    const mockLabels: Label[] = [{ id: 1, name: "bug", color: "#ee0701" }];
    const updatedIssue = makeMockIssue(1, "All Fields", "open");
    const mockClient: GogsClient = {
      request: vi.fn()
        .mockResolvedValueOnce({ ok: true, data: mockLabels })
        .mockResolvedValueOnce({ ok: true, data: updatedIssue }),
    };

    await issueUpdate(mockClient, {
      repo: "xing/test", number: 1,
      title: "All Fields",
      body: "New body",
      state: "open",
      assignee: "xing",
      milestone: 2,
      labels: "bug",
    });

    expect(mockClient.request).toHaveBeenNthCalledWith(2,
      "PATCH", "/repos/xing/test/issues/1",
      { body: { title: "All Fields", body: "New body", state: "open", assignee: "xing", milestone: 2, labels: [1] } }
    );
  });

  it("throws ValidationError when no fields provided", async () => {
    const mockClient: GogsClient = { request: vi.fn() };

    await expect(
      issueUpdate(mockClient, { repo: "xing/test", number: 1 })
    ).rejects.toThrow("At least one field to update is required");

    expect(mockClient.request).not.toHaveBeenCalled();
  });
});
```

Run: `npx vitest run tests/commands/issue.test.ts` — 7 new tests FAIL

- [ ] **Step 3: Implement `issueUpdate` in `src/commands/issue.ts`**

Add the import for ValidationError:
```typescript
import { ValidationError } from "../errors.js";
```

Add `IssueUpdateParams` to the type imports:
```typescript
import type {
  Issue,
  IssueListParams,
  IssueGetParams,
  IssueCreateParams,
  IssueCloseReopenParams,
  IssueUpdateParams,
} from "../types.js";
```

Add the `issueUpdate` function after `issueCloseReopen`:

```typescript
export async function issueUpdate(
  client: GogsClient,
  params: IssueUpdateParams
): Promise<Issue> {
  const body: Record<string, unknown> = {};

  if (params.title !== undefined) body.title = params.title;
  if (params.body !== undefined) body.body = params.body;
  if (params.state !== undefined) body.state = params.state;
  if (params.assignee !== undefined) body.assignee = params.assignee;
  if (params.milestone !== undefined) body.milestone = params.milestone;

  if (params.labels) {
    const names = params.labels.split(",").map((l) => l.trim()).filter(Boolean);
    if (names.length) {
      body.labels = await resolveLabels(client, params.repo, names);
    }
  }

  if (Object.keys(body).length === 0) {
    throw new ValidationError("At least one field to update is required");
  }

  const res = await client.request<Issue>(
    "PATCH",
    `/repos/${params.repo}/issues/${params.number}`,
    { body }
  );
  return res.data;
}
```

Run: `npx vitest run tests/commands/issue.test.ts` — ALL tests PASS (7 existing + 7 new = 14)
Run: `npx vitest run` — all 65 tests PASS, no regressions

- [ ] **Step 4: Commit**

```bash
git add src/types.ts src/commands/issue.ts tests/commands/issue.test.ts
git commit -m "feat: add issue update — edit title, body, state, assignee, milestone, labels"
```

---

### Task 2: CLI Wiring

**Files:**
- Modify: `src/cli.ts`

- [ ] **Step 1: Add import and subcommand**

In `src/cli.ts`, update the `issue` import to include `issueUpdate`:

```typescript
import { issueList, issueGet, issueCreate, issueCloseReopen, issueUpdate } from "./commands/issue.js";
```

After the `issue reopen` subcommand and before `// ── PR commands ──`, add:

```typescript
issueCmd
  .command("update")
  .description("Update an issue")
  .requiredOption("--number <n>", "Issue number", parseInt)
  .option("--title <title>", "New title")
  .option("--body <body>", "New body")
  .option("--state <state>", "New state: open or closed")
  .option("--assignee <user>", "Assignee username")
  .option("--milestone <id>", "Milestone ID", parseInt)
  .option("--labels <labels>", "Comma-separated label names")
  .action(async (options) => {
    await run(async (config, client) => {
      const repo = resolveRepo(config, config.repo);
      const result = await issueUpdate(client, {
        repo,
        number: options.number,
        title: options.title,
        body: options.body,
        state: options.state,
        assignee: options.assignee,
        milestone: options.milestone,
        labels: options.labels,
      });
      console.log(formatOutput(true, result, config.format));
    });
  });
```

- [ ] **Step 2: Verify**

Run: `npx tsc` — no errors
Run: `node dist/cli.js issue update --help` — shows all options
Run: `npx vitest run` — all tests pass

- [ ] **Step 3: Commit**

```bash
git add src/cli.ts
git commit -m "feat: add issue update CLI subcommand"
```

---

### Task 3: Smoke Test + Skill Update

- [ ] **Step 1: Live test**

```bash
# Update title of an existing issue
node dist/cli.js issue update --repo xing/gogs-agent --number 1 --title "Updated: smoke test" --format json

# Update title + state
node dist/cli.js issue update --repo xing/gogs-agent --number 1 --title "Final test" --state open --format json

# Update with labels
node dist/cli.js issue update --repo xing/gogs-agent --number 1 --labels "bug,enhancement" --format json

# Verify no-args error
node dist/cli.js issue update --repo xing/gogs-agent --number 1 --format json
# Expected: exit 1, "At least one field to update is required"
```

- [ ] **Step 2: Full test suite + build**

Run: `npx vitest run` — all tests PASS
Run: `npm run build` — compiles + regenerates skill.md

- [ ] **Step 3: Commit & push**

```bash
git add skill.md
git commit -m "chore: regenerate skill.md with issue update tool"
git push origin master
```

---

### Summary

| Task | Files Modified | New Tests |
|------|---------------|-----------|
| 1 | `types.ts`, `issue.ts`, `issue.test.ts` | 7 |
| 2 | `cli.ts` | — |
| 3 | `skill.md` (regenerated) | — |

**Total tests after:** 65 (existing 58 + 7 new)
