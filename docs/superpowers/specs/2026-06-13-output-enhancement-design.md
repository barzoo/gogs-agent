# Output Enhancement — Design Specification

**Date**: 2026-06-13  
**Status**: Approved  
**Parent**: Phase 2 — [Issue #7](https://git.desiyi.com/xing/gogs-agent/issues/7)

---

## Overview

Enhance output formatting:
1. `--format markdown` renders lists (arrays of issues/PRs/comments/labels) as Markdown tables, followed by a collapsible JSON block.
2. Add global `--output <path>` flag. File extension determines output format; unrecognized extensions fall back to `--format`.

---

## Scope

This spec covers only the output layer. It does not change command logic, API calls, or the structure of JSON responses.

---

## Architecture

### Files

| File | Action | Purpose |
|------|--------|---------|
| `src/types.ts` | Modify | Add `output?: string` to `AppConfig` |
| `src/config.ts` | Modify | Read `GOGS_OUTPUT` / CLI `--output` |
| `src/formatters.ts` | Modify | Rewrite markdown formatter to support list tables |
| `src/output.ts` | **Create** | `inferFormatFromPath()`, `writeOutput()` |
| `src/cli.ts` | Modify | Add `--output` global option; use `writeOutput` |
| `tests/formatters.test.ts` | Modify | Add list-table tests |
| `tests/output.test.ts` | **Create** | Test file extension inference and write behavior |

### Data Flow

```
Command result
  ↓
CLI determines effective format:
  - If --output given: infer format from extension, else use --format
  - If no --output: use --format, write to stdout
  ↓
formatOutput(ok, data, effectiveFormat) → string
  ↓
writeOutput(text, outputPath)
  - outputPath present → fs.writeFile
  - outputPath absent → process.stdout.write
```

---

## CLI Changes

### New global flag

```bash
gogs issue list --repo x/r --format json --output issues.json
gogs issue list --repo x/r --output issues.md     # markdown from extension
gogs issue list --repo x/r --output issues.txt     # text from extension
gogs issue list --repo x/r --output issues.data    # falls back to --format
gogs issue list --repo x/r --format markdown       # stdout, unchanged
```

### Extension mapping

| Extension | Format |
|-----------|--------|
| `.json` | json |
| `.md`, `.markdown` | markdown |
| `.txt`, `.text` | text |
| other / none | fallback to `--format` |

---

## Config Changes

```typescript
// src/types.ts
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

```typescript
// src/config.ts
export function loadConfig(cliOpts: {
  repo?: string;
  format?: "json" | "markdown" | "text";
  output?: string;
}): AppConfig {
  // ... existing validation ...
  return {
    // ... existing fields ...
    output: cliOpts.output || process.env.GOGS_OUTPUT || undefined,
  };
}
```

---

## Formatter Changes

### `formatOutput` signature (unchanged)

```typescript
export function formatOutput(
  ok: boolean,
  dataOrError: unknown,
  format: "json" | "markdown" | "text"
): string
```

### Markdown success rendering

If `dataOrError` is an **array**, render as a table. Otherwise, keep the existing single-object rendering.

#### Issue list table

```markdown
**Status**: ✅ Success

| # | Title | State | Labels | Comments |
|---|-------|-------|--------|----------|
| 1 | [Fix bug](https://git.desiyi.com/xing/repo/issues/1) | open | bug, urgent | 3 |
| 2 | [Add feature](https://...) | closed | enhancement | 0 |

```json
[...]
```
```

#### PR list table

```markdown
| # | Title | State | Source → Target | Merged |
|---|-------|-------|-----------------|--------|
| 1 | [Fix bug](https://...) | open | fix → main | No |
```

#### Comment list table

```markdown
| User | Created | Body |
|------|---------|------|
| xing | 2026-06-13 | Looks good |
```

#### Label list table

```markdown
| ID | Name | Color |
|----|------|-------|
| 1 | bug | `#ee0701` |
```

#### Generic array fallback

If array items don't match known entity shapes, render key/value rows for each item.

### Markdown error rendering (unchanged)

Keep existing error markdown format.

---

## Output Writer

### `src/output.ts`

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

---

## CLI Runner Changes

```typescript
// src/cli.ts
program
  .option("--repo <owner/repo>", "Target repository (or set GOGS_DEFAULT_REPO)")
  .option("--format <fmt>", "Output format: json, markdown, text", "json")
  .option("--output <path>", "Write output to file instead of stdout")
  .option("--verbose", "Enable verbose logging to stderr", false);

async function run(...) {
  // ...
  const cliOpts = program.opts();
  const effectiveFormat = inferFormatFromPath(cliOpts.output) || cliOpts.format;
  const config = loadConfig({
    repo: cliOpts.repo,
    format: effectiveFormat,
    output: cliOpts.output,
  });
  // ...
  const text = formatOutput(true, result, config.format);
  await writeOutput(text, config.output);
}
```

---

## Error Handling

| Scenario | Behavior |
|----------|----------|
| `--output` path invalid | `writeFile` throws; CLI catches as internal error, exit 1 |
| `--output issues.json` with `--format markdown` | Writes JSON because `.json` extension wins |
| `--output issues.xyz` with `--format text` | Writes text (fallback) |
| No `--output` | Writes to stdout, same as today |

---

## Testing

### `tests/formatters.test.ts`

Add tests for markdown list rendering:
- Issue array → table with expected columns
- PR array → table with expected columns
- Comment array → table with expected columns
- Label array → table with expected columns
- Single object → unchanged existing behavior
- Error → unchanged existing behavior

### `tests/output.test.ts`

New file:
- `inferFormatFromPath` for `.json`, `.md`, `.txt`, `.UNKNOWN`
- `writeOutput` with no path writes to stdout
- `writeOutput` with path writes to file (use temp path in `os.tmpdir()`)

### Regression

Run `npx vitest run` — all existing tests must still pass.

---

## Non-functional

| Concern | Decision |
|---------|----------|
| Backward compat | Default behavior (stdout, json) unchanged |
| `--output` + `--format` | Extension takes precedence; extension unknown → `--format` |
| Stdout newline | `writeOutput` ensures trailing newline only for stdout |
| File newline | Writes exactly what formatter returns |
| Overwrite behavior | Overwrites existing file silently (standard fs behavior) |
