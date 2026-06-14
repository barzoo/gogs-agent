# Gogs Agent

**Operate Gogs repositories from the command line — and from Claude Code.**

`gogs-agent` is a CLI for [Gogs](https://gogs.io) ([github.com/gogs/gogs](https://github.com/gogs/gogs)), the painless self-hosted Git service. Issues, pull requests, comments, labels — everything you'd do on GitHub, but on your own instance. Every command outputs JSON, so both humans and Claude Code agents can parse the result.

> **Version:** 0.2.2 &emsp; **License:** MIT &emsp; **Runtime:** Node.js ≥ 18 &emsp; **Gogs API:** v1 (Gogs ≥ v0.12) &emsp; [中文文档](README.zh-CN.md)

---

## Features

- **17 CLI commands** covering issues, PRs, comments, labels, and repo management
- **3 output formats:** JSON (default), Markdown tables, plain text — plus `--output` to write directly to files
- **Multi-repo support:** `--repo` flag on every command, with `GOGS_DEFAULT_REPO` env-var fallback
- **Auto-generated Claude Code skill:** `skill.md` is regenerated from CLI metadata on every build — never drifts from the implementation
- **Smart label resolution:** pass human-readable names like `--labels "bug,urgent"` — the CLI resolves them to IDs and auto-creates missing labels
- **Retry + backoff:** automatic retries on 429 (rate limit) and 5xx errors
- **Typed errors:** structured JSON with exit codes, so scripts can branch on failure

---

## Quick Start

### 1. Install

```bash
npm install -g gogs-agent
```

### 2. Configure

Create `~/.gogs/config.json` with your API token (one-time setup):

```json
{
  "apiKey": "your_gogs_api_token_here",
  "baseUrl": "https://git.desiyi.com/api/v1"
}
```

Generate a token at: your Gogs instance → **Settings → Applications**.

Optionally, set a default repo so you can skip `--repo` on every command:

```bash
export GOGS_DEFAULT_REPO=your-org/your-repo
```

> Full configuration guide: [docs/configuration.md](docs/configuration.md)

### 3. Use

```bash
# Issues
gogs issue list --repo myorg/myrepo --state open
gogs issue create --repo myorg/myrepo --title "Bug: login crash" --labels "bug,urgent"

# Pull Requests
gogs pr create --repo myorg/myrepo --title "Fix login" --head fix-branch --base main
gogs pr merge --repo myorg/myrepo --number 42 --strategy squash

# Comments
gogs comment create --repo myorg/myrepo --type issue --number 5 --body "LGTM!"

# Labels
gogs label list --repo myorg/myrepo
gogs label create --repo myorg/myrepo --name "priority-high" --color "#ee0701"
```

> Every command with all flags: [docs/commands.md](docs/commands.md)

---

## Commands Overview

| Group | Commands |
|-------|----------|
| **Issue** | `list` · `get` · `create` · `update` · `close` · `reopen` |
| **Pull Request** | `list` · `get` · `create` · `merge` · `diff` |
| **Comment** | `list` · `create` |
| **Label** | `list` · `get` · `create` · `update` · `delete` |
| **Repo** | `info` · `create` |

All commands follow: `gogs <resource> <action> [--flags]`

---

## Claude Code Skill

Beyond standalone CLI use, `gogs-agent` ships with a Claude Code skill. Once loaded, you talk to Claude about your repos in plain English — it picks the right `gogs` command, fills in the parameters, and formats the result.

```
You (natural language) → Claude (selects tool + fills params) → gogs CLI → Gogs API → JSON → Claude formats output
```

The skill file at `skills/gogs-agent/skill.md` is auto-generated from CLI metadata at build time, so it never drifts from the implementation.

**Setup:**
1. Install the CLI globally: `npm install -g gogs-agent`
2. Set `GOGS_API_KEY` (and optionally `GOGS_DEFAULT_REPO`) as environment variables
3. The skill is auto-discovered from the `skills/` directory on Claude Code launch

**What you can say:**
| You say | Claude executes |
|---------|----------------|
| "Show me open issues" | `gogs issue list --state open` |
| "Create an issue: login crash on iOS" | `gogs issue create --title "login crash on iOS" --body "..."` |
| "Merge PR #42 with squash" | `gogs pr merge --number 42 --strategy squash` |
| "What comments are on issue #5?" | `gogs comment list --type issue --number 5` |
| "Rename label #3 to 'critical'" | `gogs label update --id 3 --name critical` |

---

## Documentation

| Document | Content |
|----------|---------|
| [docs/configuration.md](docs/configuration.md) | All config options: env vars, `~/.gogs/config.json`, `.env`, CLI flags, precedence rules |
| [docs/commands.md](docs/commands.md) | Full command reference — every flag for all 17 commands, with examples |
| [skill.md](skill.md) | Auto-generated Claude Code skill with JSON Schema tool definitions |

---

## Development

```bash
git clone https://git.desiyi.com/xing/gogs-agent.git
cd gogs-agent
npm install
npm test          # 83 tests, ~11s
npm run build     # compiles TypeScript + generates skill.md
```

### Architecture

Commands are pure functions: `(client, params) → data`. Side effects live only in `cli.ts`. The skill is auto-generated from the Commander CLI tree at build time. Only three runtime dependencies: `commander`, `dotenv`, and the Node.js standard library.

```
src/
├── cli.ts              # Commander.js entry point (owns all side effects)
├── client.ts           # Gogs API HTTP client (auth, retry, pagination)
├── config.ts           # Config loader (CLI > env > .env > user config > defaults)
├── types.ts            # Shared TypeScript interfaces
├── errors.ts           # Typed error classes
├── formatters.ts       # JSON / markdown / text output
├── labels.ts           # Label name→ID resolution + auto-create
├── output.ts           # File output + extension-based format inference
└── commands/
    ├── issue.ts        # list, get, create, update, close, reopen
    ├── pr.ts           # list, get, create, merge, diff
    ├── comment.ts      # list, create
    ├── label.ts        # list, get, create, update, delete
    └── repo.ts         # info, create
```
