# Gogs Agent

Interact with Gogs repositories — list, create, update, close issues and pull requests, post comments, and inspect repos.

## How to use

Invoke commands via Bash/PowerShell using the CLI at `./dist/cli.js`. Every command prints structured JSON to stdout.

**Format:**
```
node dist/cli.js <resource> <action> [--flags]
```

**Output contract:**
```json
{"ok": true, "data": {...}}
{"ok": false, "error": "...", "code": "API_ERROR", "status": 404}
```

Exit codes: 0=success, 1=config/validation error, 2=API error, 3=network error.

**Global flags** (can be set on any command):
- `--repo <owner/repo>` — Target repository (or set `GOGS_DEFAULT_REPO` in .env)
- `--format json|markdown|text` — Output format (default: json)
- `--verbose` — Enable diagnostic logging

---

## Repository

### gogs repo info
Get repository metadata (name, owner, description, default branch, etc).
```
node dist/cli.js repo info [--repo owner/repo]
```

---

## Issues

### gogs issue list
List issues with optional filters.
```
node dist/cli.js issue list --repo owner/repo [--state open|closed|all] [--labels "a,b"] [--limit 20] [--page 1]
```

### gogs issue get
Get a single issue by number.
```
node dist/cli.js issue get --repo owner/repo --number 3
```

### gogs issue create
Create a new issue.
```
node dist/cli.js issue create --repo owner/repo --title "title" [--body "description"] [--assignee username]
```
Note: labels require label IDs (integers), not supported yet.

### gogs issue close
Close an issue.
```
node dist/cli.js issue close --repo owner/repo --number 3
```

### gogs issue reopen
Reopen a closed issue.
```
node dist/cli.js issue reopen --repo owner/repo --number 3
```

---

## Pull Requests

### gogs pr list
List pull requests.
```
node dist/cli.js pr list --repo owner/repo [--state open|closed|all] [--limit 20] [--page 1]
```

### gogs pr get
Get a single PR.
```
node dist/cli.js pr get --repo owner/repo --number 1
```

### gogs pr create
Create a pull request.
```
node dist/cli.js pr create --repo owner/repo --title "title" --head feature-branch --base main [--body "description"] [--assignee username]
```

### gogs pr merge
Merge a pull request.
```
node dist/cli.js pr merge --repo owner/repo --number 1 [--strategy merge|rebase|squash]
```

### gogs pr diff
Get the diff of a pull request.
```
node dist/cli.js pr diff --repo owner/repo --number 1
```

---

## Comments

### gogs comment list
List comments on an issue or PR. Set --type to "issue" or "pr".
```
node dist/cli.js comment list --repo owner/repo --type issue --number 3
```

### gogs comment create
Add a comment to an issue or PR.
```
node dist/cli.js comment create --repo owner/repo --type issue --number 3 --body "comment text"
```

---

## Examples

Create an issue:
```bash
node dist/cli.js issue create --repo xing/gogs-agent --title "Bug: login broken" --body "Steps to reproduce..."
```

List open issues and reply:
```bash
node dist/cli.js issue list --repo xing/gogs-agent --state open
node dist/cli.js comment create --repo xing/gogs-agent --type issue --number 1 --body "Working on this"
```

Full collaboration loop:
```bash
issue create → comment create (discuss) → pr create (fix) → pr diff (review) → pr merge → issue close
```
