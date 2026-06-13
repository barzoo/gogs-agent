---
name: gogs-agent
description: |
  Operate Gogs (self-hosted Git service) repositories directly from Claude Code.
  Use this skill whenever the user needs to interact with Gogs issues, pull requests,
  comments, labels, or repository metadata. Covers listing, creating, updating,
  closing, merging, and diffing. Trigger on any mention of Gogs, self-hosted Git,
  issue management, PR workflows, code review, or repository operations — even if
  the user doesn't explicitly ask for a "skill".
---

# Gogs Agent

CLI tool for operating Gogs repositories — issues, pull requests, comments, labels, and repo metadata.

## Prerequisites

- Node.js 18+ installed
- `gogs-agent` npm package installed globally: `npm install -g gogs-agent`
- `GOGS_API_KEY` environment variable set with a Gogs API token
- Optional: `GOGS_BASE_URL` (defaults to `https://git.desiyi.com/api/v1`)
- Optional: `GOGS_DEFAULT_REPO` as fallback when `--repo` is not specified

## How to Use

Every interaction with Gogs goes through the `gogs` CLI. Run commands via Bash:

```
gogs <resource> <action> [--flags]
```

### Global Flags

| Flag | Description |
|------|-------------|
| `--repo <owner/repo>` | Target repository (or set `GOGS_DEFAULT_REPO` env var) |
| `--format <fmt>` | Output format: `json` (default), `markdown`, or `text` |
| `--output <path>` | Write output to a file instead of stdout |
| `--verbose` | Enable diagnostic logging to stderr |

### Output Contract

All commands produce structured JSON to stdout. Always parse stdout as JSON.

**Success:**
```json
{ "ok": true, "data": { ... } }
```

**Error:**
```json
{ "ok": false, "error": "message", "code": "API_ERROR", "status": 404 }
```

**Exit codes:** 0 (success), 1 (config/validation error), 2 (API error), 3 (network error).

## Available Commands

### Issue Operations

| Command | Description |
|---------|-------------|
| `gogs issue list` | List issues with optional `--state`, `--labels`, `--limit`, `--page` filters |
| `gogs issue get` | Get a single issue by `--number` |
| `gogs issue create` | Create an issue with `--title` (required) and optional `--body`, `--labels`, `--assignee`, `--milestone` |
| `gogs issue update` | Update an issue by `--number` with optional `--title`, `--body`, `--state`, `--assignee`, `--milestone`, `--labels` |
| `gogs issue close` | Close an issue by `--number` |
| `gogs issue reopen` | Reopen a closed issue by `--number` |

### PR Operations

| Command | Description |
|---------|-------------|
| `gogs pr list` | List PRs with optional `--state`, `--limit`, `--page` filters |
| `gogs pr get` | Get a single PR by `--number` |
| `gogs pr create` | Create a PR with `--title`, `--head`, `--base` (all required) and optional `--body`, `--assignee` |
| `gogs pr merge` | Merge a PR by `--number` with optional `--strategy` (merge, rebase, squash) |
| `gogs pr diff` | Get PR diff by `--number` |

### Comment Operations

| Command | Description |
|---------|-------------|
| `gogs comment list` | List comments with `--type` (issue or pr) and `--number` |
| `gogs comment create` | Add a comment with `--type`, `--number`, and `--body` |

### Repo Operations

| Command | Description |
|---------|-------------|
| `gogs repo info` | Get repository metadata |

### Label Operations

| Command | Description |
|---------|-------------|
| `gogs label list` | List all labels for a repository |
| `gogs label create` | Create a label with `--name` and optional `--color` (hex) |

## Workflow Patterns

### Complete Development Cycle

```
1. Discover a bug / request feature
   → gogs issue create --repo owner/repo --title "Bug: ..." --body "..."

2. Discuss the issue
   → gogs comment create --repo owner/repo --type issue --number N --body "..."

3. Create a fix branch and submit PR
   → gogs pr create --repo owner/repo --title "Fix: ..." --head fix-branch --base main

4. Review the code
   → gogs pr diff --repo owner/repo --number M
   → gogs comment create --repo owner/repo --type pr --number M --body "LGTM"

5. Merge the fix
   → gogs pr merge --repo owner/repo --number M

6. Close the issue
   → gogs issue close --repo owner/repo --number N

7. Review history
   → gogs issue list --repo owner/repo --state closed
   → gogs pr list --repo owner/repo --state closed
```

## Error Handling

- Always check `ok` in the JSON response before using `data`
- On error, read `error`, `code`, and `status` for diagnostics
- Configuration errors (code: CONFIG_ERROR) mean env vars are missing
- API errors (code: API_ERROR) with status 404 mean the resource doesn't exist
- API errors with status 401/403 mean the API token is invalid or expired
- Network errors (code: NETWORK_ERROR) suggest the Gogs instance is unreachable

## Formatting Output for Users

Use `--format markdown` when displaying results directly to users. The markdown formatter renders:
- Issue/PR lists as tables with links
- Single entities with title, state, and body
- Comments as user-timestamp-body tables
- Labels as name-color tables

Use `--format json` (the default) when the output will be processed programmatically.
