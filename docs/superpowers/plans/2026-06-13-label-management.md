# Label Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add label list/create commands and auto-resolve label names to IDs when creating issues with `--labels`.

**Architecture:** New `resolveLabels()` shared module calls `GET /labels` to build a name→ID map, then auto-creates missing labels via `POST /labels` using a preset color table. `issueCreate` calls this resolver when `--labels` is passed, transparent to users.

**Tech Stack:** TypeScript 5.x, Vitest, same as Phase 1

**Source spec:** `docs/superpowers/specs/2026-06-13-label-management-design.md`

---

### File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/types.ts` | Modify line 132 | Add `LabelListParams`, `LabelCreateParams` |
| `src/labels.ts` | **Create** | `resolveLabels()` — name→ID resolver with auto-create |
| `src/commands/label.ts` | **Create** | `labelList`, `labelCreate` — pure command functions |
| `src/commands/issue.ts` | Modify lines 43-46 | `issueCreate` — call `resolveLabels()` when labels provided |
| `src/cli.ts` | Modify ~line 60, add after line 143 | Add `label` subcommand group; issue create passes labels |
| `tests/labels.test.ts` | **Create** | Unit tests for resolver |
| `tests/commands/label.test.ts` | **Create** | Unit tests for label commands |
| `tests/commands/issue.test.ts` | Modify line 76-94 | Restore labels test case |

---

### Task 1: Label Resolver (`resolveLabels`)

**Files:**
- Create: `src/labels.ts`
- Create: `tests/labels.test.ts`

- [ ] **Step 1: Write failing tests for resolveLabels**

Create `tests/labels.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { resolveLabels, PRESET_COLORS } from "../src/labels.js";
import type { GogsClient } from "../src/client.js";
import type { Label } from "../src/types.js";

const makeLabel = (id: number, name: string): Label => ({
  id, name, color: "#000000",
});

describe("resolveLabels", () => {
  it("returns IDs for all found names, no POST calls", async () => {
    const existingLabels: Label[] = [
      makeLabel(1, "bug"),
      makeLabel(2, "enhancement"),
      makeLabel(3, "urgent"),
    ];

    const mockClient: GogsClient = {
      request: vi.fn().mockResolvedValueOnce({
        ok: true, data: existingLabels,
      }),
    };

    const ids = await resolveLabels(mockClient, "xing/test", ["bug", "urgent"]);
    expect(ids).toEqual([1, 3]);
    // Only one call — the GET
    expect(mockClient.request).toHaveBeenCalledTimes(1);
    expect(mockClient.request).toHaveBeenCalledWith(
      "GET", "/repos/xing/test/labels"
    );
  });

  it("auto-creates missing labels with preset colors", async () => {
    const existingLabels: Label[] = [makeLabel(1, "bug")];
    const createdLabel: Label = makeLabel(5, "new-label");

    const mockClient: GogsClient = {
      request: vi.fn()
        .mockResolvedValueOnce({ ok: true, data: existingLabels })    // GET /labels
        .mockResolvedValueOnce({ ok: true, data: createdLabel }),     // POST /labels
    };

    const ids = await resolveLabels(mockClient, "xing/test", ["bug", "new-label"]);
    expect(ids).toEqual([1, 5]);

    expect(mockClient.request).toHaveBeenCalledTimes(2);
    expect(mockClient.request).toHaveBeenNthCalledWith(2,
      "POST", "/repos/xing/test/labels",
      { body: { name: "new-label", color: PRESET_COLORS[0] } }
    );
  });

  it("creates all labels when none exist", async () => {
    const created1: Label = makeLabel(10, "a");
    const created2: Label = makeLabel(11, "b");

    const mockClient: GogsClient = {
      request: vi.fn()
        .mockResolvedValueOnce({ ok: true, data: [] })                // GET /labels
        .mockResolvedValueOnce({ ok: true, data: created1 })          // POST a
        .mockResolvedValueOnce({ ok: true, data: created2 }),         // POST b
    };

    const ids = await resolveLabels(mockClient, "xing/test", ["a", "b"]);
    expect(ids).toEqual([10, 11]);
    expect(mockClient.request).toHaveBeenCalledTimes(3);
  });

  it("returns empty array for empty input", async () => {
    const mockClient: GogsClient = {
      request: vi.fn(),
    };

    const ids = await resolveLabels(mockClient, "xing/test", []);
    expect(ids).toEqual([]);
    expect(mockClient.request).not.toHaveBeenCalled();
  });

  it("matches case-insensitively", async () => {
    const existingLabels: Label[] = [makeLabel(1, "Bug")];

    const mockClient: GogsClient = {
      request: vi.fn().mockResolvedValueOnce({
        ok: true, data: existingLabels,
      }),
    };

    const ids = await resolveLabels(mockClient, "xing/test", ["bug"]);
    expect(ids).toEqual([1]);
    expect(mockClient.request).toHaveBeenCalledTimes(1);
  });

  it("deduplicates same name appearing twice in input", async () => {
    const existingLabels: Label[] = [makeLabel(1, "bug")];

    const mockClient: GogsClient = {
      request: vi.fn().mockResolvedValueOnce({
        ok: true, data: existingLabels,
      }),
    };

    const ids = await resolveLabels(mockClient, "xing/test", ["bug", "bug"]);
    // bug found, no POST needed — map already cached it
    expect(ids).toEqual([1, 1]);
    expect(mockClient.request).toHaveBeenCalledTimes(1);
  });
});
```

Run: `npx vitest run tests/labels.test.ts` — 6 tests FAIL (module not found)

- [ ] **Step 2: Implement `src/labels.ts`**

```typescript
import type { GogsClient } from "./client.js";
import type { Label } from "./types.js";

/** Preset color table for auto-created labels. */
export const PRESET_COLORS = [
  "#0052cc", "#ee0701", "#d93f0b",
  "#0e8a16", "#fbca04", "#5319e7",
];

/**
 * Resolve label names to label IDs.
 * Looks up existing labels (case-insensitive).
 * Auto-creates labels not found, using the preset color table.
 * Duplicates in the input are handled gracefully (second occurrence reuses cache).
 */
export async function resolveLabels(
  client: GogsClient,
  repo: string,
  names: string[]
): Promise<number[]> {
  if (!names.length) return [];

  // Fetch all existing labels for the repo
  const existing = await client.request<Label[]>(
    "GET",
    `/repos/${repo}/labels`
  );

  // Build case-insensitive name → id map
  const nameToId = new Map<string, number>();
  for (const label of existing.data) {
    nameToId.set(label.name.toLowerCase(), label.id);
  }

  let colorIdx = 0;
  const ids: number[] = [];

  for (const rawName of names) {
    const name = rawName.trim();
    const key = name.toLowerCase();

    const existingId = nameToId.get(key);
    if (existingId !== undefined) {
      ids.push(existingId);
    } else {
      // Auto-create with next preset color
      const color = PRESET_COLORS[colorIdx++ % PRESET_COLORS.length];
      const created = await client.request<Label>(
        "POST",
        `/repos/${repo}/labels`,
        { body: { name, color } }
      );
      ids.push(created.data.id);
      // Cache it so duplicates within the same call don't double-create
      nameToId.set(key, created.data.id);
    }
  }

  return ids;
}
```

Run: `npx vitest run tests/labels.test.ts` — 6 tests PASS

- [ ] **Step 3: Commit**

```bash
git add src/labels.ts tests/labels.test.ts
git commit -m "feat: add resolveLabels — label name to ID resolver with auto-create"
```

---

### Task 2: Label Commands

**Files:**
- Create: `src/commands/label.ts`
- Create: `tests/commands/label.test.ts`
- Modify: `src/types.ts` (add LabelListParams, LabelCreateParams)

- [ ] **Step 1: Add types to `src/types.ts`**

Insert after the existing `IssueCloseReopenParams` interface (around line 138):

```typescript
export interface LabelListParams {
  repo: string;
}

export interface LabelCreateParams {
  repo: string;
  name: string;
  color?: string;
}
```

- [ ] **Step 2: Write failing tests for label commands**

Create `tests/commands/label.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { labelList, labelCreate } from "../../src/commands/label.js";
import type { GogsClient } from "../../src/client.js";
import type { Label } from "../../src/types.js";

const makeLabel = (id: number, name: string, color: string): Label => ({
  id, name, color,
});

describe("labelList", () => {
  it("calls GET /repos/{repo}/labels", async () => {
    const mockLabels: Label[] = [
      makeLabel(1, "bug", "#ee0701"),
      makeLabel(2, "enhancement", "#0052cc"),
    ];
    const mockClient: GogsClient = {
      request: vi.fn().mockResolvedValue({ ok: true, data: mockLabels }),
    };

    const result = await labelList(mockClient, { repo: "xing/test" });
    expect(mockClient.request).toHaveBeenCalledWith(
      "GET", "/repos/xing/test/labels"
    );
    expect(result).toEqual(mockLabels);
  });
});

describe("labelCreate", () => {
  it("calls POST /repos/{repo}/labels with name and color", async () => {
    const createdLabel = makeLabel(3, "test", "#0052cc");
    const mockClient: GogsClient = {
      request: vi.fn().mockResolvedValue({ ok: true, data: createdLabel }),
    };

    const result = await labelCreate(mockClient, {
      repo: "xing/test",
      name: "test",
      color: "#0052cc",
    });

    expect(mockClient.request).toHaveBeenCalledWith(
      "POST", "/repos/xing/test/labels",
      { body: { name: "test", color: "#0052cc" } }
    );
    expect(result).toEqual(createdLabel);
  });

  it("uses first preset color as default when color is omitted", async () => {
    const createdLabel = makeLabel(4, "new", "#0052cc");
    const mockClient: GogsClient = {
      request: vi.fn().mockResolvedValue({ ok: true, data: createdLabel }),
    };

    const result = await labelCreate(mockClient, {
      repo: "xing/test",
      name: "new",
    });

    expect(mockClient.request).toHaveBeenCalledWith(
      "POST", "/repos/xing/test/labels",
      { body: { name: "new", color: "#0052cc" } }
    );
    expect(result).toEqual(createdLabel);
  });
});
```

Run: `npx vitest run tests/commands/label.test.ts` — 3 tests FAIL

- [ ] **Step 3: Implement `src/commands/label.ts`**

```typescript
import type { GogsClient } from "../client.js";
import type { Label, LabelListParams, LabelCreateParams } from "../types.js";
import { PRESET_COLORS } from "../labels.js";

export async function labelList(
  client: GogsClient,
  params: LabelListParams
): Promise<Label[]> {
  const res = await client.request<Label[]>(
    "GET",
    `/repos/${params.repo}/labels`
  );
  return res.data;
}

export async function labelCreate(
  client: GogsClient,
  params: LabelCreateParams
): Promise<Label> {
  const res = await client.request<Label>(
    "POST",
    `/repos/${params.repo}/labels`,
    { body: { name: params.name, color: params.color || PRESET_COLORS[0] } }
  );
  return res.data;
}
```

Run: `npx vitest run tests/commands/label.test.ts` — 3 tests PASS  
Run: `npx vitest run` — all previous tests still pass (no regressions)

- [ ] **Step 4: Commit**

```bash
git add src/commands/label.ts tests/commands/label.test.ts src/types.ts
git commit -m "feat: add label list and create commands with tests"
```

---

### Task 3: Issue Create Integration

**Files:**
- Modify: `src/commands/issue.ts` (add labels resolution)
- Modify: `tests/commands/issue.test.ts` (restore labels test)

- [ ] **Step 1: Update issue test to expect labels**

Read the current test at lines 76-94 of `tests/commands/issue.test.ts` and replace the "includes optional body, assignee, milestone" test with:

```typescript
  it("includes optional body, labels, assignee, milestone", async () => {
    const mockLabelsList: Label[] = [
      { id: 1, name: "bug", color: "#ee0701" },
      { id: 2, name: "urgent", color: "#d93f0b" },
    ];
    const mockClient: GogsClient = {
      request: vi.fn()
        // First call: GET /labels (from resolveLabels)
        .mockResolvedValueOnce({ ok: true, data: mockLabelsList })
        // Second call: POST /issues
        .mockResolvedValueOnce({ ok: true, data: makeMockIssue(101, "Full") }),
    };

    await issueCreate(mockClient, {
      repo: "xing/test",
      title: "Full",
      body: "Description",
      labels: "bug,urgent",
      assignee: "xing",
      milestone: 3,
    });

    // Verify GET /labels was called
    expect(mockClient.request).toHaveBeenNthCalledWith(1,
      "GET", "/repos/xing/test/labels"
    );
    // Verify POST /issues includes resolved label IDs
    expect(mockClient.request).toHaveBeenNthCalledWith(2,
      "POST", "/repos/xing/test/issues",
      {
        body: {
          title: "Full",
          body: "Description",
          labels: [1, 2],
          assignee: "xing",
          milestone: 3,
        },
      }
    );
  });
```

Also add the Label import at top:
```typescript
import type { Issue, Label } from "../../src/types.js";
```

Run: `npx vitest run tests/commands/issue.test.ts` — the new test FAILS because issueCreate doesn't call resolveLabels yet

- [ ] **Step 2: Implement labels resolution in `src/commands/issue.ts`**

```typescript
import type { GogsClient } from "../client.js";
import type {
  Issue,
  IssueListParams,
  IssueGetParams,
  IssueCreateParams,
  IssueCloseReopenParams,
} from "../types.js";
import { resolveLabels } from "../labels.js";

export async function issueList(
  client: GogsClient,
  params: IssueListParams
): Promise<Issue[]> {
  const query: Record<string, string | number> = {};
  if (params.state) query.state = params.state;
  if (params.labels) query.labels = params.labels;
  if (params.limit) query.limit = params.limit;
  if (params.page) query.page = params.page;

  const res = await client.request<Issue[]>(
    "GET",
    `/repos/${params.repo}/issues`,
    { query }
  );
  return res.data;
}

export async function issueGet(
  client: GogsClient,
  params: IssueGetParams
): Promise<Issue> {
  const res = await client.request<Issue>(
    "GET",
    `/repos/${params.repo}/issues/${params.number}`
  );
  return res.data;
}

export async function issueCreate(
  client: GogsClient,
  params: IssueCreateParams
): Promise<Issue> {
  const body: Record<string, unknown> = { title: params.title };
  if (params.body) body.body = params.body;

  // Resolve label names → label IDs (auto-creates missing labels)
  if (params.labels) {
    const names = params.labels
      .split(",")
      .map((l) => l.trim())
      .filter(Boolean);
    if (names.length) {
      body.labels = await resolveLabels(client, params.repo, names);
    }
  }

  if (params.assignee) body.assignee = params.assignee;
  if (params.milestone) body.milestone = params.milestone;

  const res = await client.request<Issue>(
    "POST",
    `/repos/${params.repo}/issues`,
    { body }
  );
  return res.data;
}

export async function issueCloseReopen(
  client: GogsClient,
  params: IssueCloseReopenParams
): Promise<Issue> {
  const res = await client.request<Issue>(
    "PATCH",
    `/repos/${params.repo}/issues/${params.number}`,
    { body: { state: params.action === "close" ? "closed" : "open" } }
  );
  return res.data;
}
```

Run: `npx vitest run` — all tests PASS (7 + 1 + 6 + 3 + labels: ~56 tests total)

- [ ] **Step 3: Commit**

```bash
git add src/commands/issue.ts tests/commands/issue.test.ts
git commit -m "feat: integrate label name→ID resolution into issue create"
```

---

### Task 4: CLI Wiring

**Files:**
- Modify: `src/cli.ts` (add label subcommand group)

- [ ] **Step 1: Add label subcommands to CLI**

Insert after the comment commands section (before the `// ── Main runner ──` line):

```typescript
// ── Label commands ──

const labelCmd = program
  .command("label")
  .description("Label operations");

labelCmd
  .command("list")
  .description("List all labels for a repository")
  .action(async () => {
    await run(async (config, client) => {
      const repo = resolveRepo(config, config.repo);
      const result = await labelList(client, { repo });
      console.log(formatOutput(true, result, config.format));
    });
  });

labelCmd
  .command("create")
  .description("Create a new label")
  .requiredOption("--name <name>", "Label name")
  .option("--color <hex>", "Hex color code (e.g. #ee0701)")
  .action(async (options) => {
    await run(async (config, client) => {
      const repo = resolveRepo(config, config.repo);
      const result = await labelCreate(client, {
        repo,
        name: options.name,
        color: options.color,
      });
      console.log(formatOutput(true, result, config.format));
    });
  });
```

Also add the import at the top:
```typescript
import { labelList, labelCreate } from "./commands/label.js";
```

- [ ] **Step 2: Verify compilation and help text**

Run: `npx tsc` — no errors
Run: `node dist/cli.js label --help` — shows `list` and `create` subcommands

- [ ] **Step 3: Commit**

```bash
git add src/cli.ts
git commit -m "feat: add label list and create CLI subcommands"
```

---

### Task 5: Live Smoke Test + Skill Update

**Files:**
- (No source changes, just verification)

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run`  
Expected: All 56+ tests PASS (existing 49 + label: 6 + label commands: 3)

- [ ] **Step 2: Live test against Gogs**

```bash
node dist/cli.js label list --repo xing/gogs-agent --format json
node dist/cli.js label create --repo xing/gogs-agent --name "test-label" --color "#0e8a16" --format json
node dist/cli.js issue create --repo xing/gogs-agent --title "标签功能测试" --labels "test-label,does-not-exist-yet" --format json
node dist/cli.js label list --repo xing/gogs-agent --format json
```

Expected: 
- `label list` shows labels (may be empty initially)
- `label create` creates "test-label" in green
- `issue create` resolves "test-label" to its ID and auto-creates "does-not-exist-yet" with the next preset color
- `label list` now shows both labels

- [ ] **Step 3: Regenerate skill.md**

Run: `npm run build`  
Expected: tsc compiles + skill.md regenerated with label tools

- [ ] **Step 4: Commit**

```bash
git add skill.md
git commit -m "chore: regenerate skill.md with label tools"
```

---

### Summary

| Task | Files Created | Files Modified | Tests |
|------|--------------|---------------|-------|
| 1 | `src/labels.ts`, `tests/labels.test.ts` | — | 6 |
| 2 | `src/commands/label.ts`, `tests/commands/label.test.ts` | `src/types.ts` | 3 |
| 3 | — | `src/commands/issue.ts`, `tests/commands/issue.test.ts` | 1 modified |
| 4 | — | `src/cli.ts` | — |
| 5 | — | `skill.md` (regenerated) | — |

**Total new tests:** 9  
**Total tests after:** ~58
