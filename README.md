# Gogs Agent

**Operate Gogs repositories from the command line — and from Claude Code.**

`gogs-agent` is a CLI for Gogs, the self-hosted Git service. Issues, pull requests, comments, labels — the things you'd do on GitHub, but on your own instance. Every command outputs JSON, so both humans and Claude Code agents can parse the result.

> **Version:** 0.1.0 &emsp; **License:** MIT &emsp; **Runtime:** Node.js ≥ 18 &emsp; [中文文档](README.zh-CN.md)

---

## Features

- **16 CLI commands** covering issues, PRs, comments, labels, and repo metadata
- **3 output formats:** JSON (default), Markdown tables, plain text
- **Multi-repo support:** `--repo` flag on every command, with env-var fallback
- **Auto-generated Claude Code skill:** `skill.md` is rebuilt from CLI metadata on every build — no manual sync to maintain
- **Zero-config defaults:** set `GOGS_DEFAULT_REPO` once, skip `--repo` everywhere
- **Retry + backoff:** automatic retries on 429 (rate limit) and 5xx errors
- **Typed errors:** structured JSON with exit codes, so scripts can branch on failure

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

## Using in Your Project

### CLI only

```bash
# Install
npm install -g gogs-agent

# Configure — pick one
echo 'GOGS_API_KEY=your_token' >> .env          # project .env file
echo 'GOGS_DEFAULT_REPO=org/repo' >> .env       # optional, skips --repo everywhere
# or: export GOGS_API_KEY=your_token            # shell env var

# Use
gogs issue list --state open                    # no --repo needed if GOGS_DEFAULT_REPO set
gogs pr diff --number 42
```

If you work across multiple repositories, skip `GOGS_DEFAULT_REPO` and pass `--repo` explicitly:

```bash
gogs issue list --repo org/frontend --state open
gogs pr list --repo org/backend --state open
gogs pr list --repo org/docs --state open
```

### As a Claude Code Skill

The CLI works fine on its own. But the reason `gogs-agent` exists is Claude Code. Load the skill, and you talk to Claude about your repos in plain English — it figures out which `gogs` command to run. Tool schemas are generated from CLI metadata at build time, so they stay in sync automatically.

#### How It Works

The skill file at `skills/gogs-agent/skill.md` defines 16 tools — one per CLI command — each with a JSON Schema so Claude knows what arguments to pass. When you ask for something, Claude picks the right tool, runs the matching `gogs` command, and tells you what happened.

```
You (natural language) → Claude (selects tool + fills params) → gogs CLI → Gogs API → JSON → Claude formats output
```

#### Setup

1. **Install the CLI globally:**
   ```bash
   npm install -g gogs-agent
   ```

2. **Configure credentials:**
   ```bash
   export GOGS_API_KEY=your_gogs_api_token              # required — generate in Gogs → Settings → Applications
   export GOGS_BASE_URL=https://git.desiyi.com/api/v1   # optional — this is the default
   export GOGS_DEFAULT_REPO=your-org/your-repo           # optional — skips --repo on every command
   ```

3. **Make the skill discoverable** — pick one:

   **Option A (automatic):** The skill file lives under `skills/` in this project. Claude Code auto-discovers skills in `skills/` directories on launch.

   **Option B (explicit):** Reference it from your project's `CLAUDE.md`:
   ```markdown
   > Gogs 操作使用 gogs-agent skill，skill 文件在 ./skills/gogs-agent.skill
   ```

#### Usage — Just Talk to Claude

Once the skill is loaded, you don't need to remember CLI commands. Use natural language and Claude executes the right `gogs` command:

| You say | Claude executes |
|---------|----------------|
| "Show me open issues" | `gogs issue list --state open` |
| "Create an issue: login crash on iOS" | `gogs issue create --title "login crash on iOS" --body "..."` |
| "What's in PR #42?" | `gogs pr get --number 42` |
| "Merge PR #42 with squash" | `gogs pr merge --number 42 --strategy squash` |
| "Show me the diff for PR #42" | `gogs pr diff --number 42` |
| "What comments are on issue #5?" | `gogs comment list --type issue --number 5` |
| "Reply LGTM on issue #5" | `gogs comment create --type issue --number 5 --body "LGTM"` |
| "List all labels in this repo" | `gogs label list` |
| "Create a 'bug' label in red" | `gogs label create --name bug --color ee0701` |
| "Close issue #3 as done" | `gogs issue close --number 3` |
| "Show repo info" | `gogs repo info` |
| "Update issue #7 title to 'Fixed in v2'" | `gogs issue update --number 7 --title "Fixed in v2"` |

#### Complete Development Cycle

A real example — fixing a bug from start to finish:

```
You: "I found a bug — the login page crashes on iOS. Create an issue for it."
Claude: [creates issue #23] "Created issue #23: 'Bug: login crash on iOS'"

You: "Check out the issue and add some debugging notes."
Claude: [reads issue #23, adds a comment with analysis]

You: "I fixed it on branch fix/ios-login. Create a PR."
Claude: [creates PR #47 from fix/ios-login → main]

You: "Review the PR diff for any issues."
Claude: [fetches diff, analyzes it] "The diff looks clean. One suggestion: ..."

You: "Looks good, merge it with squash and close the issue."
Claude: [merges PR #47 with squash, closes issue #23] "Done. PR #47 merged, issue #23 closed."
```

#### Prerequisites Checklist

- [ ] Node.js 18+ installed
- [ ] `gogs-agent` installed globally (`npm install -g gogs-agent`)
- [ ] `GOGS_API_KEY` environment variable set with a valid Gogs API token
- [ ] `GOGS_BASE_URL` set (or accepting the default `https://git.desiyi.com/api/v1`)
- [ ] Skill file present in the project (already included under `skills/`)
- [ ] Claude Code restarted after adding the skill

### Configuration Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GOGS_API_KEY` | **Yes** | — | Gogs API token (Settings → Applications) |
| `GOGS_BASE_URL` | No | `https://git.desiyi.com/api/v1` | Your Gogs API base URL |
| `GOGS_DEFAULT_REPO` | No | — | Fallback repository as `owner/repo` |

Load order: `CLI --flags` > `environment variables` > `.env file` > `built-in defaults`

**Get a token:** Log into your Gogs instance → Settings → Applications → Generate new token.

> Full details: [docs/configuration.md](docs/configuration.md)

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

- Commands are pure functions: `(client, params) → data`. No env vars, no filesystem, no console.
- Side effects live in one place: `cli.ts` handles config, stdout, and process exit. Everything else is testable.
- Skill generation reads the Commander CLI tree at build time. No one edits the skill file by hand, so it can't drift from the implementation.
- Only three dependencies: `commander`, `dotenv`, and the Node.js standard library. HTTP requests use `fetch` — no third-party HTTP libraries.

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
