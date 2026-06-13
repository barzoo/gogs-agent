# Gogs Agent

**Claude Code Skill + CLI for operating Gogs repositories.**

`gogs-agent` gives Claude Code agents (and humans) structured, type-safe access to Gogs — the self-hosted Git service. Create and manage issues, pull requests, comments, and labels through a uniform CLI that speaks JSON.

> **Version:** 0.1.0 &emsp; **License:** MIT &emsp; **Runtime:** Node.js ≥ 18

---

## Features

- **16 CLI commands** covering issues, PRs, comments, labels, and repo metadata
- **3 output formats** — JSON (default), Markdown tables, plain text
- **Multi-repo support** — `--repo` flag on every command, with env-var fallback
- **Auto-generated Claude Code skill** — `skill.md` is rebuilt from CLI metadata on every build, preventing drift
- **Zero-config defaults** — set `GOGS_DEFAULT_REPO` once and skip `--repo` everywhere
- **Retry + backoff** — API client retries on 429 (rate limit) and 5xx errors automatically
- **Typed errors** — structured JSON errors with exit codes so scripts (and agents) can branch on failure

---

## Quick Start

### 1. Install

```bash
npm install -g gogs-agent
```

### 2. Configure

Create a `.env` file (or set environment variables):

```bash
GOGS_API_KEY=your_gogs_api_token_here
GOGS_BASE_URL=https://git.desiyi.com/api/v1
GOGS_DEFAULT_REPO=your-org/your-repo    # optional — skip --repo everywhere
```

> See [docs/configuration.md](docs/configuration.md) for all options and precedence rules.

### 3. Use

```bash
# List open issues
gogs issue list --repo myorg/myrepo --state open

# Create an issue
gogs issue create --repo myorg/myrepo --title "Bug: login crash" --labels "bug,urgent"

# Create a PR
gogs pr create --repo myorg/myrepo --title "Fix login" --head fix-branch --base main

# Get PR diff
gogs pr diff --repo myorg/myrepo --number 42

# Merge a PR
gogs pr merge --repo myorg/myrepo --number 42 --strategy squash

# Add a comment
gogs comment create --repo myorg/myrepo --type issue --number 5 --body "LGTM!"
```

> See [docs/commands.md](docs/commands.md) for every command with all flags.

---

## Commands Overview

| Group | Commands |
|-------|----------|
| **Issue** | `list` · `get` · `create` · `update` · `close` · `reopen` |
| **Pull Request** | `list` · `get` · `create` · `merge` · `diff` |
| **Comment** | `list` · `create` |
| **Label** | `list` · `create` |
| **Repo** | `info` |

All commands follow: `gogs <resource> <action> [--flags]`

---

## Output Contract

Every command writes structured JSON to stdout:

**Success:**
```json
{ "ok": true, "data": { ... } }
```

**Error:**
```json
{ "ok": false, "error": "...", "code": "API_ERROR", "status": 404 }
```

**Exit codes:** `0` success · `1` config/validation · `2` API error · `3` network error

Use `--format markdown` for human-readable tables, or `--output path/to/file.json` to write results directly to a file.

---

## Using as a Claude Code Skill

This project ships a ready-to-use Claude Code skill. Install the `.skill` file:

```bash
# The skill file is at the repo root:
gogs-agent.skill
```

Or install via plugin registry (coming soon). When loaded, Claude Code agents can directly operate your Gogs repositories — creating issues, reviewing PRs, merging code, and managing labels — all through structured tool calls.

The skill's tool schemas are **auto-generated from CLI metadata** during `npm run build`, so they never drift from the actual CLI implementation.

---

## Development

```bash
git clone https://git.desiyi.com/xing/gogs-agent.git
cd gogs-agent
npm install
npm test          # 77 tests, ~11s
npm run build     # compiles TypeScript + generates skill.md
```

---

## Documentation

| Document | Content |
|----------|---------|
| [docs/commands.md](docs/commands.md) | Full command reference — every flag for all 16 commands |
| [docs/configuration.md](docs/configuration.md) | Env vars, `.env` setup, config precedence chain |
| [skill.md](skill.md) | Auto-generated Claude Code skill with JSON Schema tool definitions |

---

## Design

`gogs-agent` is built around a few principles:

- **Pure command functions** — each command receives params + client, returns data. No ambient state.
- **CLI owns side effects** — only `cli.ts` touches config, stdout, and process exit.
- **Single source of truth** — `scripts/generate-skill.ts` reads the Commander CLI tree and produces `skill.md` at build time, preventing manual sync drift.
- **Node 18+ stdlib** — zero external HTTP dependencies beyond `fetch`, `commander`, and `dotenv`.

```
src/
├── cli.ts              # Commander.js entry point
├── client.ts           # Gogs API HTTP client (auth, retry, pagination)
├── config.ts           # Env + CLI config loader
├── types.ts            # Shared TypeScript interfaces
├── errors.ts           # Typed error classes
├── formatters.ts       # JSON / markdown / text output
├── labels.ts           # Label resolution helpers
├── output.ts           # File output + format inference
└── commands/
    ├── issue.ts        # List, get, create, update, close, reopen
    ├── pr.ts           # List, get, create, merge, diff
    ├── comment.ts      # List, create
    ├── label.ts        # List, create
    └── repo.ts         # Info
```
