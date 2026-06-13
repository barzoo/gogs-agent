# Label Management — Design Specification

**Date**: 2026-06-13  
**Status**: Approved  
**Parent**: Phase 2 — [Issue #7](https://git.desiyi.com/xing/gogs-agent/issues/7)

---

## Overview

Add label management commands (`label list`, `label create`) and a shared label-name-to-ID resolver. When `issue create --labels "bug,urgent"` encounters a label name that doesn't exist in the repo, it auto-creates the label with a preset color before creating the issue.

---

## Problem

Gogs API `CreateIssueOption.labels` accepts `[]int64` — label IDs, not label names. Phase 1 workaround was to omit labels entirely. Users want to pass human-readable names like `--labels "bug,urgent"` and have the tool handle the resolution.

---

## Architecture

### Files

| File | Action | Purpose |
|------|--------|---------|
| `src/labels.ts` | **Create** | `resolveLabels()` — shared label name→ID resolver |
| `src/commands/label.ts` | **Create** | `labelList`, `labelCreate` — pure command functions |
| `src/commands/issue.ts` | **Modify** | `issueCreate` — call `resolveLabels()` when `--labels` passed |
| `src/types.ts` | **Modify** | Add `LabelListParams`, `LabelCreateParams` |
| `src/cli.ts` | **Modify** | Add `label` subcommand group, update `issue create` |
| `tests/labels.test.ts` | **Create** | Unit tests for resolver |
| `tests/commands/label.test.ts` | **Create** | Unit tests for label commands |
| `tests/commands/issue.test.ts` | **Modify** | Restore labels assertion in `issueCreate` test |

### Data Flow

```
User: gogs issue create --labels "bug,urgent,new-label"
  │
  ▼
cli.ts  →  issueCreate(client, {repo, title, body, labels: "bug,urgent,new-label"})
  │
  ▼
issueCreate:
  names = ["bug", "urgent", "new-label"]
  ids = await resolveLabels(client, repo, names)
  │
  ▼
resolveLabels:
  1. GET /repos/{r}/labels                          → [{id:1,name:"bug"}, {id:2,name:"urgent"}]
  2. "bug"    → found    → id=1
     "urgent"  → found    → id=2
     "new-label" → MISSING → POST /repos/{r}/labels {name:"new-label", color:"#0052cc"}
                              → {id:3, name:"new-label"}
  3. return [1, 2, 3]
  │
  ▼
  POST /repos/{r}/issues {title, body, labels:[1,2,3]}
```

---

## CLI Commands

### label list

```
gogs label list --repo owner/repo
```

Lists all labels for a repository with their IDs, names, and colors.

**API**: `GET /repos/{owner}/{repo}/labels`  
**Output**: `{"ok":true, "data": [Label]}`

### label create

```
gogs label create --repo owner/repo --name "label-name" [--color "hex"]
```

Creates a new label. If `--color` is omitted, uses the preset color table (cycling).

**API**: `POST /repos/{owner}/{repo}/labels` with body `{name, color}`  
**Output**: `{"ok":true, "data": Label}`

### issue create (modified)

```
gogs issue create --repo owner/repo --title "..." [--labels "a,b,c"] ...
```

When `--labels` is provided, the names are resolved to IDs via `resolveLabels()`. Missing labels are auto-created with preset colors. Resolution is case-insensitive.

---

## Core Module: `src/labels.ts`

```typescript
import type { GogsClient } from "./client.js";
import type { Label } from "./types.js";

/** Preset color table, cycles for auto-created labels. */
const PRESET_COLORS = [
  "#0052cc", "#ee0701", "#d93f0b",
  "#0e8a16", "#fbca04", "#5319e7",
];

/**
 * Resolve label names to label IDs.
 * Looks up existing labels; auto-creates any that don't exist.
 * Case-insensitive matching.
 */
export async function resolveLabels(
  client: GogsClient,
  repo: string,
  names: string[]
): Promise<number[]> {
  if (!names.length) return [];

  // 1. Fetch all existing labels
  const existing = await client.request<Label[]>(
    "GET",
    `/repos/${repo}/labels`
  );

  // 2. Build name→id map (case-insensitive)
  const nameToId = new Map<string, number>();
  for (const label of existing.data) {
    nameToId.set(label.name.toLowerCase(), label.id);
  }

  // 3. Resolve each name, creating missing ones
  let colorIdx = 0;
  const ids: number[] = [];

  for (const name of names) {
    const key = name.trim().toLowerCase();
    if (!key) continue;

    const existingId = nameToId.get(key);
    if (existingId !== undefined) {
      ids.push(existingId);
    } else {
      const color = PRESET_COLORS[colorIdx++ % PRESET_COLORS.length];
      const created = await client.request<Label>(
        "POST",
        `/repos/${repo}/labels`,
        { body: { name: name.trim(), color } }
      );
      ids.push(created.data.id);
      // Cache so duplicates in same batch don't double-create
      nameToId.set(key, created.data.id);
    }
  }

  return ids;
}
```

### Behavior Summary

| Scenario | GET /labels | POST /labels |
|----------|-------------|--------------|
| All names found | Called once | Never called |
| Some missing | Called once | Called per missing name |
| All missing | Called once | Called per name |
| Empty names[] | Not called | Not called |
| Duplicate in input | — | Auto-deduped (cached in map) |

---

## Command Functions

### `src/commands/label.ts`

```typescript
export function labelList(client: GogsClient, params: {repo: string}): Promise<Label[]>
export function labelCreate(client: GogsClient, params: LabelCreateParams): Promise<Label>
```

### `src/commands/issue.ts` (modified)

`issueCreate` gains an additional parameter flow: if `params.labels` is set, it splits by comma, resolves via `resolveLabels(client, params.repo, names)`, and includes the resulting IDs in the request body.

---

## Types Additions

```typescript
// In types.ts:

export interface LabelListParams {
  repo: string;
}

export interface LabelCreateParams {
  repo: string;
  name: string;
  color?: string;
}
```

`IssueCreateParams.labels` remains `string | undefined` (comma-separated names). The resolution happens inside `issueCreate`, not at the type level.

---

## CLI Wiring

```
gogs label list   --repo <o/r>
gogs label create --repo <o/r> --name <name> [--color <hex>]
```

And in `issue create` handler:
```typescript
.action(async (options) => {
  await run(async (config, client) => {
    const repo = resolveRepo(config, config.repo);
    const result = await issueCreate(client, {
      repo,
      title: options.title,
      body: options.body,
      labels: options.labels,  // ← now passed through
      assignee: options.assignee,
      milestone: options.milestone,
    });
    // ...
  });
});
```

---

## Testing

### `tests/labels.test.ts` (5 tests)

| Test | Mock Setup | Expected |
|------|-----------|----------|
| All names found | GET returns matching labels | Returns correct IDs, no POST calls |
| Some missing | GET returns partial match | POSTs for missing, returns all IDs |
| All missing | GET returns empty | POSTs for each name, returns all IDs |
| Empty input | — | Returns [], no API calls |
| Case-insensitive match | GET has "Bug", input "bug" | Matches, no POST |

### `tests/commands/label.test.ts` (3 tests)

| Test | Expected |
|------|----------|
| labelList calls GET /repos/{r}/labels | Passes correct path |
| labelCreate calls POST with name + color | Passes correct body |
| labelCreate omits color → uses default | Body has `{name, color: "#0052cc"}` |

### `tests/commands/issue.test.ts` (1 modified test)

Restore the "includes labels" test case:
- Mock `resolveLabels` (via injected dependency or by mocking the client's GET/POST)
- Verify issue body includes resolved label IDs

---

## Non-Functional

| Concern | Decision |
|---------|----------|
| Idempotency | `resolveLabels` avoids double-creating duplicate names in same call |
| Performance | One GET /labels per issue create; additional POST per new label |
| Color consistency | Same color table as GitHub defaults; cycling for auto-created labels |
| API compatibility | `POST /repos/{r}/labels` with same name returns 422 — mitigated by the "check first" pattern |
