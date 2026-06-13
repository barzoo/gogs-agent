# Gogs Agent — Design Specification

**Date**: 2026-06-13  
**Status**: Approved  
**Target**: Claude Code Skill + TypeScript CLI for operating Gogs repositories

---

## Overview

Gogs Agent enables Claude Code agents to interact with Gogs (self-hosted Git service) through structured CLI commands. It covers issue-driven development and pull request / code review workflows across multiple repositories. The gogs-agent project itself serves as the initial dogfooding project.

### Scope

| Dimension | Decision |
|-----------|----------|
| Functional scope | Issues + PRs + Comments (Phase 1); labels, milestones, repo search later |
| Multi-repo | Yes — `--repo` flag on every command, with `GOGS_DEFAULT_REPO` fallback |
| User interface | CLI tool called by Claude Code Skill; Agent invokes structured tool definitions |
| Language | TypeScript, compiled to a single Node.js executable entry point |
| Delivery | npm package, usable as `gogs <resource> <action> [--flags]` |

---

## Architecture

### Package Structure

```
gogs-agent/
├── src/
│   ├── cli.ts              # CLI entry point, commander.js sub-command routing
│   ├── client.ts           # Gogs HTTP client (fetch + API token auth)
│   ├── config.ts           # Configuration loader (CLI > env > .env > defaults)
│   ├── commands/
│   │   ├── issue.ts        # issue list, get, create, update, close, reopen
│   │   ├── pr.ts           # pr list, get, create, merge, close, diff
│   │   ├── repo.ts         # repo info, list, search
│   │   └── comment.ts      # comment list, create (for both issues and PRs)
│   ├── formatters.ts       # Output formatters: JSON, markdown, plain text
│   ├── errors.ts           # Error classes: ConfigError, ValidationError, ApiError, NetworkError
│   └── types.ts            # Gogs API response types and internal shared types
├── skill.md                # Claude Code Skill definition (auto-generated tool schemas)
├── scripts/
│   └── generate-skill.ts   # Tool schema generator from CLI metadata
├── package.json
├── tsconfig.json
└── .env.example
```

### Module Responsibilities

| Module | Single Responsibility | Key Dependencies |
|--------|----------------------|------------------|
| `cli.ts` | Parse args, route to command handler, format output, handle errors | commander, all command modules, config, formatters |
| `client.ts` | HTTP request封装：base URL、认证、超时、重试、分页解析 | fetch (Node 18+), config (for url/key) |
| `config.ts` | Load and validate configuration from CLI flags, env vars, .env, defaults | dotenv |
| `commands/issue.ts` | Pure functions: take params → call client → return typed result | client, types |
| `commands/pr.ts` | Pure functions: take params → call client → return typed result | client, types |
| `commands/repo.ts` | Pure functions: take params → call client → return typed result | client, types |
| `commands/comment.ts` | Pure functions: take params → call client → return typed result | client, types |
| `formatters.ts` | Transform result objects to JSON string, markdown, or plain text | types |
| `errors.ts` | Typed error classes with exit codes and structured output | — |
| `types.ts` | All shared type definitions — API responses, input params, config shape | — |

### Design Principles

- **Command functions are pure**: They receive parameters and a client instance, return results. No direct access to `process.env`, `fs`, or `console`.
- **Client is stateless**: Each HTTP request is independent. No connection pooling, no in-memory cache.
- **CLI boundary owns side effects**: Only `cli.ts` reads config, calls command functions, and writes to stdout/stderr.
- **Uniform output contract**: Every invocation produces structured JSON (or markdown/text) to stdout. stderr is for diagnostics only when `--verbose`.

---

## CLI Command Design

All commands follow: `gogs <resource> <action> [--flags]`

### Global Flags

| Flag | Description | Fallback |
|------|-------------|----------|
| `--repo <owner/repo>` | Target repository | `GOGS_DEFAULT_REPO` env var |
| `--format json|markdown|text` | Output format | `json` |
| `--verbose` | Enable diagnostic logging to stderr | `false` |
| `--help` | Show help at any command level | — |

### Issue Commands

```
gogs issue list    --repo <o/r>  [--state open|closed|all]  [--labels a,b]  [--limit 20]  [--page 1]        [Phase 1]
gogs issue get     --repo <o/r>  --number <#>                                                                [Phase 1]
gogs issue create  --repo <o/r>  --title "..."  [--body "..."]  [--labels a,b]  [--assignee user]           [Phase 1]
gogs issue close   --repo <o/r>  --number <#>                                                                [Phase 1]
gogs issue reopen  --repo <o/r>  --number <#>                                                                [Phase 1]
gogs issue update  --repo <o/r>  --number <#>  [--title "..."]  [--body "..."]  [--state open|closed]       [Phase 2]
```

### PR Commands

```
gogs pr list       --repo <o/r>  [--state open|closed|all]  [--limit 20]  [--page 1]                        [Phase 1]
gogs pr get        --repo <o/r>  --number <#>                                                                [Phase 1]
gogs pr create     --repo <o/r>  --title "..."  --head <branch>  --base <branch>  [--body "..."]            [Phase 1]
gogs pr merge      --repo <o/r>  --number <#>  [--strategy merge|rebase|squash]                              [Phase 1]
gogs pr diff       --repo <o/r>  --number <#>  [--format json|diff]                                          [Phase 1]
gogs pr close      --repo <o/r>  --number <#>                                                                [Phase 2]
```

### Repo Commands

```
gogs repo info     --repo <o/r>                                                                              [Phase 1]
gogs repo list     [--org <org>]  [--limit 20]                                                               [Phase 2]
gogs repo search   --query "..."                                                                             [Phase 2]
```

### Comment Commands

```
gogs comment list   --repo <o/r>  --type issue|pr  --number <#>                                              [Phase 1]
gogs comment create --repo <o/r>  --type issue|pr  --number <#>  --body "..."                                [Phase 1]
```

### Output Contract

All commands write structured output to stdout:

**Success**:
```json
{ "ok": true, "data": { ... } }
```

**Error**:
```json
{ "ok": false, "error": "Human-readable message", "code": "API_ERROR", "status": 404 }
```

**Exit Codes**:
| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Configuration or validation error |
| 2 | Gogs API error (non-2xx response) |
| 3 | Network error (timeout, DNS, connection refused) |

When `--format markdown`, output is rendered as human-readable text suitable for Agent-to-user display.

---

## Skill Definition

### Generation Strategy

Tool schemas for Claude Code are **auto-generated** from CLI metadata to prevent drift between the CLI implementation and the Skill definition.

- **Source of truth**: Commander.js sub-command metadata (`name`, `description`, `options` with types, defaults, required flags)
- **Generator**: `scripts/generate-skill.ts` reads CLI metadata at build time and outputs `skill.md` with complete JSON Schema tool definitions
- **Integration**: Run as `npm run generate-skill` during `npm run build`

### Tool Mapping (Phase 1)

Each CLI command maps to one Claude Code tool:

| Tool Name | CLI Command | Purpose |
|-----------|-------------|---------|
| `gogs_issue_list` | `issue list` | List repo issues with filters |
| `gogs_issue_get` | `issue get` | Get single issue details |
| `gogs_issue_create` | `issue create` | Create a new issue |
| `gogs_issue_close` | `issue close` | Close an issue |
| `gogs_issue_reopen` | `issue reopen` | Reopen a closed issue |
| `gogs_pr_list` | `pr list` | List repo pull requests |
| `gogs_pr_get` | `pr get` | Get single PR details |
| `gogs_pr_create` | `pr create` | Create a new pull request |
| `gogs_pr_merge` | `pr merge` | Merge a pull request |
| `gogs_pr_diff` | `pr diff` | Get PR diff content |
| `gogs_comment_list` | `comment list` | List comments on issue/PR |
| `gogs_comment_create` | `comment create` | Add a comment to issue/PR |
| `gogs_repo_info` | `repo info` | Get repository metadata |

### Skill Behavior

When loaded in Claude Code, the Skill presents these tools to the Agent. The Agent:
1. Sees tool definitions with parameter schemas
2. Calls tools with structured arguments
3. Receives structured JSON responses
4. Uses those responses to inform the user or make decisions

---

## Gogs API Client

### HTTP Client (`client.ts`)

```typescript
interface GogsClient {
  request<T>(
    method: string,
    path: string,
    opts?: {
      query?: Record<string, string | number>;
      body?: unknown;
    }
  ): Promise<GogsResponse<T>>;
}

interface GogsResponse<T> {
  ok: boolean;
  data: T;
  pagination?: {
    total: number;
    page: number;
    pageSize: number;
  };
}
```

### Behavior

- **Authentication**: `Authorization: token <apiKey>` — injected by reading config
- **Base URL**: Reads from `GOGS_BASE_URL`, defaults to `https://git.desiyi.com/api/v1`
- **HTTP engine**: Node.js built-in `fetch` (Node 18+) — zero external dependencies
- **Pagination**: Parses `X-Total` and `X-Page` response headers from Gogs API
- **Retry policy**: 
  - 429 (rate limit): Exponential backoff, max 3 retries (1s, 2s, 4s)
  - 5xx (server error): Single retry after 1s
  - 4xx (client error): No retry
- **Timeout**: Default 30s, configurable via `GOGS_TIMEOUT` env var
- **Logging**: When `--verbose`, logs request method/URL/status/duration to stderr

### Gogs API Endpoint Mapping (Phase 1)

| CLI Command | HTTP Method | API Path |
|-------------|-------------|----------|
| `issue list` | GET | `/repos/{owner}/{repo}/issues` |
| `issue get` | GET | `/repos/{owner}/{repo}/issues/{number}` |
| `issue create` | POST | `/repos/{owner}/{repo}/issues` |
| `issue update` | PATCH | `/repos/{owner}/{repo}/issues/{number}` |
| `pr list` | GET | `/repos/{owner}/{repo}/pulls` |
| `pr get` | GET | `/repos/{owner}/{repo}/pulls/{number}` |
| `pr create` | POST | `/repos/{owner}/{repo}/pulls` |
| `pr merge` | POST | `/repos/{owner}/{repo}/pulls/{number}/merge` |
| `pr diff` | GET | `/repos/{owner}/{repo}/pulls/{number}.diff` |
| `comment list` | GET | `/repos/{owner}/{repo}/issues/{number}/comments` |
| `comment create` | POST | `/repos/{owner}/{repo}/issues/{number}/comments` |
| `repo info` | GET | `/repos/{owner}/{repo}` |

Gogs treats PR comments via the same `/issues/{number}/comments` endpoint (Gogs models PRs as a type of issue internally).

### Core Types (`types.ts`)

```typescript
interface Issue {
  id: number;
  number: number;
  title: string;
  body: string;
  state: "open" | "closed";
  labels: Label[];
  assignee: User | null;
  milestone: Milestone | null;
  created_at: string;
  updated_at: string;
  html_url: string;
}

interface PullRequest {
  id: number;
  number: number;
  title: string;
  body: string;
  state: "open" | "closed";
  head: { label: string; ref: string; sha: string };
  base: { label: string; ref: string; sha: string };
  assignee: User | null;
  merged: boolean;
  merged_by: User | null;
  created_at: string;
  updated_at: string;
  html_url: string;
}

interface Comment {
  id: number;
  body: string;
  user: User;
  created_at: string;
  updated_at: string;
}

interface User {
  id: number;
  login: string;
  full_name: string;
  avatar_url: string;
}

interface Label {
  id: number;
  name: string;
  color: string;
}

interface Milestone {
  id: number;
  title: string;
  state: string;
}
```

---

## Configuration Management

### Load Order

```
CLI --flags  >  Environment variables  >  .env file  >  Hardcoded defaults
```

### Config Shape

```typescript
interface Config {
  baseUrl: string;      // GOGS_BASE_URL     — default: "https://git.desiyi.com/api/v1"
  apiKey: string;       // GOGS_API_KEY      — required, no default
  defaultRepo: string;  // GOGS_DEFAULT_REPO — optional, falls back to requiring --repo
  verbose: boolean;     // GOGS_VERBOSE      — default: false
  timeout: number;      // GOGS_TIMEOUT      — default: 30000 (30s)
}
```

### Validation

- Missing `apiKey` → exit 1 with message: `"GOGS_API_KEY is required. Set it in .env or as environment variable."`
- Missing `repo` (and no `GOGS_DEFAULT_REPO`) → exit 1 with message: `"--repo <owner/repo> is required."`

---

## Error Handling

### Error Hierarchy

```
ConfigError      (exit 1)  — Missing or invalid configuration
ValidationError  (exit 1)  — Invalid command arguments (bad state, negative number, etc.)
ApiError         (exit 2)  — Gogs API returned non-2xx, includes HTTP status and body
NetworkError     (exit 3)  — Connection timeout, DNS failure, connection refused
```

### Structured Error Output

All errors produce to stdout:
```json
{
  "ok": false,
  "error": "Issue #42 not found in repo xing/ctrlx-AI-Agent",
  "code": "API_ERROR",
  "status": 404
}
```

### Agent-Friendly Messages

When `--format markdown`, errors render as:
```markdown
**Error**: Issue #42 not found in repo `xing/ctrlx-AI-Agent`
- **Code**: API_ERROR
- **HTTP Status**: 404
```

---

## MVP Phase 1 Scope

### Commands Included (13 commands)

| Group | Command | 
|-------|---------|
| Repo | `gogs repo info` |
| Issue | `gogs issue create`, `list`, `get`, `close`, `reopen` |
| PR | `gogs pr create`, `list`, `get`, `diff`, `merge` |
| Comment | `gogs comment create`, `list` |

### Collaboration Loop Coverage

The 13 commands cover a complete development cycle:

```
1. Discover a bug / request feature
   → gogs issue create --title "Bug: ..." --body "..."

2. Discuss the issue
   → gogs comment create --type issue --number #N --body "..."

3. Create a fix branch and submit PR
   → gogs pr create --title "Fix: ..." --head fix-branch --base main

4. Review the code
   → gogs pr diff --number #M
   → gogs comment create --type pr --number #M --body "LGTM"

5. Merge the fix
   → gogs pr merge --number #M

6. Close the issue
   → gogs issue close --number #N

7. Review history
   → gogs issue list --state closed
   → gogs pr list --state closed
```

### Explicitly Deferred (Phase 2+)

- `gogs issue update` — editing existing issue title/body
- `gogs pr close` — closing PR without merge
- `gogs repo list`, `gogs repo search` — multi-repo queries
- Label management (`label add`, `label remove`, `label list`)
- Milestone management
- Webhook management
- Wiki operations
- Branch operations

---

## Testing Strategy

### Unit Tests

- **Command functions**: Test each command function with a mocked GogsClient. Verify correct API path, method, query params, and body transformation.
- **Formatters**: Test each format mode with known objects.
- **Config loader**: Test priority chain with various combinations of flags/env/file.

### Integration Tests

- **API client**: Test against a real Gogs instance (use a dedicated test repo `xing/gogs-agent-test`).
- **CLI end-to-end**: Run CLI commands against real Gogs API, verify stdout JSON structure.

### Test Runner

- Vitest (fast, TypeScript-native, compatible with Node.js project)

---

## Non-Functional Requirements

| Concern | Requirement |
|---------|-------------|
| Node version | Node.js 18+ (for built-in `fetch`) |
| External dependencies | Minimal — `commander`, `dotenv`, `vitest` (dev); zero runtime beyond stdlib |
| Startup time | < 200ms for a single command invocation |
| stdout | Always valid UTF-8 JSON (or markdown when `--format markdown`), always a single line for JSON mode |
| stderr | Empty unless `--verbose` is set or the process crashes unexpectedly |

---

## Open Questions & Future Considerations

1. **PR review workflow**: Should Phase 2 include `gogs pr approve` / `gogs pr request-changes` if Gogs API supports review states?
2. **Multi-instance support**: If users have multiple Gogs instances, should there be a named-instance config pattern (`gogs --instance work issue list`)?
3. **Rate limit awareness**: Should the CLI expose a `gogs rate-limit` command so Agent can check before batch operations?
