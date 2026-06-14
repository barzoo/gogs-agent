# Command Reference

All commands follow: `gogs <resource> <action> [--flags]`

## Global Flags

These flags work on every command:

| Flag | Description |
|------|-------------|
| `--repo <owner/repo>` | Target repository — overrides `GOGS_DEFAULT_REPO` |
| `--format json\|markdown\|text` | Output format (default: `json`) |
| `--output <path>` | Write output to file instead of stdout |
| `--verbose` | Enable diagnostic logging to stderr |

---

## Issue Commands

### `gogs issue list`

List repository issues with optional filters.

```bash
gogs issue list --repo <owner/repo> [--state open|closed|all] [--labels a,b] [--limit 20] [--page 1]
```

| Flag | Type | Required | Description |
|------|------|----------|-------------|
| `--state` | string | No | Filter by state: `open`, `closed`, `all` |
| `--labels` | string | No | Comma-separated label names (e.g., `bug,urgent`) |
| `--limit` | integer | No | Results per page |
| `--page` | integer | No | Page number |

**Example:**

```bash
gogs issue list --repo xing/gogs-agent --state open --labels bug --limit 10
```

### `gogs issue get`

Get a single issue by number.

```bash
gogs issue get --repo <owner/repo> --number <n>
```

| Flag | Type | Required | Description |
|------|------|----------|-------------|
| `--number` | integer | **Yes** | Issue number |

**Example:**

```bash
gogs issue get --repo xing/gogs-agent --number 42
```

### `gogs issue create`

Create a new issue. Label names are resolved to IDs automatically — labels that don't exist yet are created for you.

```bash
gogs issue create --repo <owner/repo> --title "..." [--body "..."] [--labels a,b] [--assignee user] [--milestone id]
```

| Flag | Type | Required | Description |
|------|------|----------|-------------|
| `--title` | string | **Yes** | Issue title |
| `--body` | string | No | Issue body/description (Markdown supported) |
| `--labels` | string | No | Comma-separated label names — auto-resolved to IDs |
| `--assignee` | string | No | Assignee username |
| `--milestone` | integer | No | Milestone ID |

**Example:**

```bash
gogs issue create \
  --repo xing/gogs-agent \
  --title "feat: add webhook support" \
  --body "## Motivation\n\nWe need webhook events for CI integration." \
  --labels "enhancement,phase-2" \
  --assignee xing
```

### `gogs issue update`

Update an existing issue. Only the fields you provide are changed — everything else stays as-is.

```bash
gogs issue update --repo <owner/repo> --number <n> [--title "..."] [--body "..."] [--state open|closed] [--assignee user] [--milestone id] [--labels a,b]
```

| Flag | Type | Required | Description |
|------|------|----------|-------------|
| `--number` | integer | **Yes** | Issue number |
| `--title` | string | No | New title |
| `--body` | string | No | New body |
| `--state` | string | No | New state: `open` or `closed` |
| `--assignee` | string | No | New assignee username |
| `--milestone` | integer | No | New milestone ID |
| `--labels` | string | No | Comma-separated label names (replaces all labels) |

At least one field is required. Passing none is a validation error.

**Example:**

```bash
gogs issue update --repo xing/gogs-agent --number 42 --title "Fixed in v2" --state closed
```

### `gogs issue close`

Close an issue.

```bash
gogs issue close --repo <owner/repo> --number <n>
```

| Flag | Type | Required | Description |
|------|------|----------|-------------|
| `--number` | integer | **Yes** | Issue number |

### `gogs issue reopen`

Reopen a previously closed issue.

```bash
gogs issue reopen --repo <owner/repo> --number <n>
```

| Flag | Type | Required | Description |
|------|------|----------|-------------|
| `--number` | integer | **Yes** | Issue number |

---

## Pull Request Commands

### `gogs pr list`

List repository pull requests.

```bash
gogs pr list --repo <owner/repo> [--state open|closed|all] [--limit 20] [--page 1]
```

| Flag | Type | Required | Description |
|------|------|----------|-------------|
| `--state` | string | No | Filter by state |
| `--limit` | integer | No | Results per page |
| `--page` | integer | No | Page number |

### `gogs pr get`

Get a single pull request.

```bash
gogs pr get --repo <owner/repo> --number <n>
```

| Flag | Type | Required | Description |
|------|------|----------|-------------|
| `--number` | integer | **Yes** | PR number |

### `gogs pr create`

Create a new pull request.

```bash
gogs pr create --repo <owner/repo> --title "..." --head <branch> --base <branch> [--body "..."] [--assignee user]
```

| Flag | Type | Required | Description |
|------|------|----------|-------------|
| `--title` | string | **Yes** | PR title |
| `--head` | string | **Yes** | Source branch with your changes |
| `--base` | string | **Yes** | Target branch to merge into |
| `--body` | string | No | PR description (Markdown supported) |
| `--assignee` | string | No | Assignee username |

**Example:**

```bash
gogs pr create \
  --repo xing/gogs-agent \
  --title "feat: add label management" \
  --head feature/labels \
  --base main \
  --body "Closes #42"
```

### `gogs pr merge`

Merge a pull request.

```bash
gogs pr merge --repo <owner/repo> --number <n> [--strategy merge|rebase|squash]
```

| Flag | Type | Required | Description |
|------|------|----------|-------------|
| `--number` | integer | **Yes** | PR number |
| `--strategy` | string | No | Merge strategy: `merge` (default), `rebase`, or `squash` |

**Example:**

```bash
gogs pr merge --repo xing/gogs-agent --number 99 --strategy squash
```

### `gogs pr diff`

Get the diff of a pull request.

```bash
gogs pr diff --repo <owner/repo> --number <n>
```

| Flag | Type | Required | Description |
|------|------|----------|-------------|
| `--number` | integer | **Yes** | PR number |

The diff is returned as a raw unified diff string. Use `--output` to save it to a file:

```bash
gogs pr diff --repo xing/gogs-agent --number 99 --output pr-99.diff
```

---

## Comment Commands

Comments work on both issues and pull requests. In Gogs, PR comments use the same API endpoint as issue comments.

### `gogs comment list`

List comments on an issue or PR.

```bash
gogs comment list --repo <owner/repo> --type issue|pr --number <n>
```

| Flag | Type | Required | Description |
|------|------|----------|-------------|
| `--type` | string | **Yes** | `issue` or `pr` |
| `--number` | integer | **Yes** | Issue or PR number |

### `gogs comment create`

Add a comment to an issue or PR.

```bash
gogs comment create --repo <owner/repo> --type issue|pr --number <n> --body "..."
```

| Flag | Type | Required | Description |
|------|------|----------|-------------|
| `--type` | string | **Yes** | `issue` or `pr` |
| `--number` | integer | **Yes** | Issue or PR number |
| `--body` | string | **Yes** | Comment text (Markdown supported) |

**Example:**

```bash
gogs comment create \
  --repo xing/gogs-agent \
  --type pr \
  --number 99 \
  --body "## Review\n\n- [x] Looks good\n- [ ] Needs tests"
```

---

## Label Commands

### `gogs label list`

List all labels for a repository.

```bash
gogs label list --repo <owner/repo>
```

No additional flags.

**Example:**

```bash
gogs label list --repo xing/gogs-agent --format markdown
```

### `gogs label get`

Get a single label by its ID.

```bash
gogs label get --repo <owner/repo> --id <n>
```

| Flag | Type | Required | Description |
|------|------|----------|-------------|
| `--id` | integer | **Yes** | Label ID |

**Example:**

```bash
gogs label get --repo xing/gogs-agent --id 5
```

### `gogs label create`

Create a new label. If you don't specify a color, one is picked from a preset palette.

```bash
gogs label create --repo <owner/repo> --name "..." [--color hex]
```

| Flag | Type | Required | Description |
|------|------|----------|-------------|
| `--name` | string | **Yes** | Label name |
| `--color` | string | No | Hex color code (e.g., `#ee0701`). Picks from a preset palette if omitted |

**Example:**

```bash
gogs label create --repo xing/gogs-agent --name "phase-2" --color "#0e8a16"
```

### `gogs label update`

Update a label's name and/or color. At least one of `--name` or `--color` must be provided.

```bash
gogs label update --repo <owner/repo> --id <n> [--name "..."] [--color hex]
```

| Flag | Type | Required | Description |
|------|------|----------|-------------|
| `--id` | integer | **Yes** | Label ID |
| `--name` | string | No | New label name |
| `--color` | string | No | New hex color code |

**Examples:**

```bash
# Rename a label
gogs label update --repo xing/gogs-agent --id 3 --name "critical"

# Change a label's color
gogs label update --repo xing/gogs-agent --id 3 --color "#ee0701"

# Rename and recolor in one go
gogs label update --repo xing/gogs-agent --id 3 --name "urgent" --color "#d93f0b"
```

### `gogs label delete`

Delete a label by its ID.

```bash
gogs label delete --repo <owner/repo> --id <n>
```

| Flag | Type | Required | Description |
|------|------|----------|-------------|
| `--id` | integer | **Yes** | Label ID |

**Example:**

```bash
gogs label delete --repo xing/gogs-agent --id 8
```

---

## Repo Commands

### `gogs repo info`

Get repository metadata — name, description, default branch, clone URLs, and more.

```bash
gogs repo info --repo <owner/repo>
```

No additional flags.

**Example:**

```bash
gogs repo info --repo xing/gogs-agent
```

### `gogs repo create`

Create a new repository under your user account. The repo is initialized with a README.

```bash
gogs repo create --name <name> [--description "..."] [--private]
```

| Flag | Type | Required | Description |
|------|------|----------|-------------|
| `--name` | string | **Yes** | Repository name (created under your user) |
| `--description` | string | No | Repository description |
| `--private` | flag | No | Make the repository private (default: public) |

**Example:**

```bash
gogs repo create --name my-new-project --description "A fresh start" --private
```

---

## Output Formats

### JSON (default)

Structured, single-line output suitable for programmatic consumption.

```json
{"ok":true,"data":{"id":1,"number":42,"title":"Fix login bug","state":"open",...}}
```

### Markdown

Human-readable tables and links. Lists (issues, PRs, comments, labels) are rendered as tables with a collapsible JSON block appended. Single entities show key fields followed by a JSON block.

```markdown
**Status**: ✅ Success

| # | Title | State | Labels | Comments |
|---|-------|-------|--------|----------|
| 42 | [Fix login bug](https://...) | open | bug, urgent | 3 |

```json
[...]
```
```

### Text

Pretty-printed JSON with 2-space indentation.

```json
{
  "ok": true,
  "data": {
    ...
  }
}
```

---

## Complete Workflow Example

A full cycle — from discovering a bug to merging the fix:

```bash
# 1. Create an issue for the bug
gogs issue create \
  --repo xing/gogs-agent \
  --title "Bug: crash on empty input" \
  --body "Steps to reproduce:..." \
  --labels "bug"

# 2. Discuss
gogs comment create --repo xing/gogs-agent --type issue --number 42 --body "I can reproduce this."

# 3. Create fix branch (git, not gogs)
git checkout -b fix/empty-input main

# 4. Open a PR
gogs pr create \
  --repo xing/gogs-agent \
  --title "Fix: guard against empty input" \
  --head fix/empty-input \
  --base main

# 5. Review the diff
gogs pr diff --repo xing/gogs-agent --number 99

# 6. Approve via comment
gogs comment create --repo xing/gogs-agent --type pr --number 99 --body "LGTM!"

# 7. Merge
gogs pr merge --repo xing/gogs-agent --number 99 --strategy squash

# 8. Close the issue
gogs issue close --repo xing/gogs-agent --number 42
```

---

## Error Reference

| Error Code | HTTP Status | Meaning |
|------------|-------------|---------|
| `CONFIG_ERROR` | — | Missing or invalid configuration (no API key, no repo specified) |
| `VALIDATION_ERROR` | — | Invalid command arguments |
| `API_ERROR` | 400 | Bad request — check your input |
| `API_ERROR` | 401/403 | Invalid or expired API token |
| `API_ERROR` | 404 | Resource not found — wrong repo, issue, or PR number |
| `API_ERROR` | 409 | Conflict — merge conflict, duplicate label name, etc. |
| `API_ERROR` | 422 | Unprocessable — validation failed on the Gogs side |
| `API_ERROR` | 429 | Rate limited — the client auto-retries up to 3 times |
| `API_ERROR` | 5xx | Server error — client retries once, then fails |
| `NETWORK_ERROR` | — | Connection timeout, DNS failure, connection refused |
| `INTERNAL_ERROR` | — | Unexpected error — please report |
