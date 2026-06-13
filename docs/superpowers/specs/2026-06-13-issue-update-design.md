# Issue Update — Design Specification

**Date**: 2026-06-13  
**Status**: Approved  
**Parent**: Phase 2 — [Issue #7](https://git.desiyi.com/xing/gogs-agent/issues/7)

---

## Overview

Add `gogs issue update` — a single command to edit any combination of issue fields (title, body, state, assignee, milestone, labels). Only the provided parameters are patched via `PATCH /issues/{n}`. Existing `issue close` / `issue reopen` commands remain as shortcuts.

---

## Command

```
gogs issue update --repo owner/repo --number <n>
  [--title "new title"]
  [--body "new body"]
  [--state open|closed]
  [--assignee username]
  [--milestone <id>]
  [--labels "a,b,c"]
```

All parameters optional. At least one must be provided — passing none is a `ValidationError`.

### Behavior

| Input | API Body |
|-------|----------|
| `--title "X"` | `{title: "X"}` |
| `--title "X" --state closed` | `{title: "X", state: "closed"}` |
| `--labels "bug,urgent"` | resolveLabels → `{labels: [1, 2]}` |
| (none) | Error: "At least one field to update is required" |

---

## Architecture

### Files

| File | Action | Purpose |
|------|--------|---------|
| `src/types.ts` | Modify | Add `IssueUpdateParams` |
| `src/commands/issue.ts` | Modify | Add `issueUpdate()` function |
| `src/cli.ts` | Modify | Add `issue update` subcommand |
| `tests/commands/issue.test.ts` | Modify | Add update tests |

### Implementation

```typescript
// src/types.ts — new interface
export interface IssueUpdateParams {
  repo: string;
  number: number;
  title?: string;
  body?: string;
  state?: "open" | "closed";
  assignee?: string;
  milestone?: number;
  labels?: string;  // comma-separated names, resolved via resolveLabels
}
```

```typescript
// src/commands/issue.ts — new function
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
    const names = params.labels.split(",").map(l => l.trim()).filter(Boolean);
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

### CLI wiring

```typescript
issueCmd
  .command("update")
  .description("Update an issue (any combination of title, body, state, assignee, milestone, labels)")
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

---

## Testing

### Unit tests (add to `tests/commands/issue.test.ts`)

| Test | Setup | Expected |
|------|-------|----------|
| update title only | `issueUpdate({title:"New"})` | PATCH body `{title:"New"}` |
| update body only | `issueUpdate({body:"New body"})` | PATCH body `{body:"New body"}` |
| update state only | `issueUpdate({state:"closed"})` | PATCH body `{state:"closed"}` |
| update multiple fields | title + state + assignee | PATCH body includes all three |
| update with labels | labels "bug,urgent" | resolveLabels → labels: [1,2] |
| no fields provided | `issueUpdate({})` | throws ValidationError |
| update with all fields | title+body+state+assignee+milestone+labels | all in PATCH body |

---

## Non-functional

| Concern | Decision |
|---------|----------|
| Backward compat | `issue close` / `issue reopen` unchanged |
| Label support | Reuses `resolveLabels()` — same auto-create behavior |
| API endpoint | `PATCH /repos/{owner}/{repo}/issues/{number}` (already used by close/reopen) |
| Validation | At least one field required; if none, throws before API call |
