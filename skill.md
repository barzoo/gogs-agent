---
name: gogs-agent
description: |
  Operate Gogs (self-hosted Git service) repositories directly from Claude Code.
  Use this skill whenever the user needs to interact with Gogs issues, pull requests,
  comments, or repository metadata. Covers listing, creating, updating, closing,
  merging, and diffing. Trigger on any mention of Gogs, self-hosted Git, issue
  management, PR workflows, code review, or repository operations — even if the user
  doesn't explicitly ask for a "skill".
---

# Gogs Agent Skill

Operate Gogs repositories directly from Claude Code — create and manage issues, pull requests, comments, and labels.

## Prerequisites

- Node.js 18+ installed
- `GOGS_API_KEY` environment variable set (or in .env file)
- Optional: `GOGS_BASE_URL` (defaults to https://git.desiyi.com/api/v1)
- Optional: `GOGS_DEFAULT_REPO` as fallback for --repo

## Installation

```bash
npm install -g gogs-agent
```

## Usage

This skill provides the following tools. Call them with structured arguments to interact with Gogs.

## Tools

### gogs_issue_list

List repository issues (issue resource)

**Parameters:**
- `repo` (string, optional): Target repository (or set GOGS_DEFAULT_REPO)
- `format` (string, optional): Output format: json, markdown, text
- `output` (string, optional): Write output to file instead of stdout
- `verbose` (string, optional): Enable verbose logging to stderr
- `state` (string, optional): Filter by state: open, closed, all
- `labels` (string, optional): Filter by labels (comma-separated)
- `limit` (integer, optional): Number of results per page
- `page` (integer, optional): Page number
### gogs_issue_get

Get a single issue (issue resource)

**Parameters:**
- `repo` (string, optional): Target repository (or set GOGS_DEFAULT_REPO)
- `format` (string, optional): Output format: json, markdown, text
- `output` (string, optional): Write output to file instead of stdout
- `verbose` (string, optional): Enable verbose logging to stderr
- `number` (integer, required): Issue number
### gogs_issue_create

Create a new issue (issue resource)

**Parameters:**
- `repo` (string, optional): Target repository (or set GOGS_DEFAULT_REPO)
- `format` (string, optional): Output format: json, markdown, text
- `output` (string, optional): Write output to file instead of stdout
- `verbose` (string, optional): Enable verbose logging to stderr
- `title` (string, required): Issue title
- `body` (string, optional): Issue body/description
- `labels` (string, optional): Comma-separated labels
- `assignee` (string, optional): Assignee username
- `milestone` (integer, optional): Milestone ID
### gogs_issue_close

Close an issue (issue resource)

**Parameters:**
- `repo` (string, optional): Target repository (or set GOGS_DEFAULT_REPO)
- `format` (string, optional): Output format: json, markdown, text
- `output` (string, optional): Write output to file instead of stdout
- `verbose` (string, optional): Enable verbose logging to stderr
- `number` (integer, required): Issue number
### gogs_issue_reopen

Reopen a closed issue (issue resource)

**Parameters:**
- `repo` (string, optional): Target repository (or set GOGS_DEFAULT_REPO)
- `format` (string, optional): Output format: json, markdown, text
- `output` (string, optional): Write output to file instead of stdout
- `verbose` (string, optional): Enable verbose logging to stderr
- `number` (integer, required): Issue number
### gogs_issue_update

Update an issue (issue resource)

**Parameters:**
- `repo` (string, optional): Target repository (or set GOGS_DEFAULT_REPO)
- `format` (string, optional): Output format: json, markdown, text
- `output` (string, optional): Write output to file instead of stdout
- `verbose` (string, optional): Enable verbose logging to stderr
- `number` (integer, required): Issue number
- `title` (string, optional): New title
- `body` (string, optional): New body
- `state` (string, optional): New state: open or closed
- `assignee` (string, optional): Assignee username
- `milestone` (integer, optional): Milestone ID
- `labels` (string, optional): Comma-separated label names
### gogs_pr_list

List repository pull requests (pr resource)

**Parameters:**
- `repo` (string, optional): Target repository (or set GOGS_DEFAULT_REPO)
- `format` (string, optional): Output format: json, markdown, text
- `output` (string, optional): Write output to file instead of stdout
- `verbose` (string, optional): Enable verbose logging to stderr
- `state` (string, optional): Filter by state: open, closed, all
- `limit` (integer, optional): Results per page
- `page` (integer, optional): Page number
### gogs_pr_get

Get a single pull request (pr resource)

**Parameters:**
- `repo` (string, optional): Target repository (or set GOGS_DEFAULT_REPO)
- `format` (string, optional): Output format: json, markdown, text
- `output` (string, optional): Write output to file instead of stdout
- `verbose` (string, optional): Enable verbose logging to stderr
- `number` (integer, required): PR number
### gogs_pr_create

Create a new pull request (pr resource)

**Parameters:**
- `repo` (string, optional): Target repository (or set GOGS_DEFAULT_REPO)
- `format` (string, optional): Output format: json, markdown, text
- `output` (string, optional): Write output to file instead of stdout
- `verbose` (string, optional): Enable verbose logging to stderr
- `title` (string, required): PR title
- `head` (string, required): Source branch with changes
- `base` (string, required): Target branch to merge into
- `body` (string, optional): PR description
- `assignee` (string, optional): Assignee username
### gogs_pr_merge

Merge a pull request (pr resource)

**Parameters:**
- `repo` (string, optional): Target repository (or set GOGS_DEFAULT_REPO)
- `format` (string, optional): Output format: json, markdown, text
- `output` (string, optional): Write output to file instead of stdout
- `verbose` (string, optional): Enable verbose logging to stderr
- `number` (integer, required): PR number
- `strategy` (string, optional): Merge strategy: merge, rebase, squash
### gogs_pr_diff

Get pull request diff (pr resource)

**Parameters:**
- `repo` (string, optional): Target repository (or set GOGS_DEFAULT_REPO)
- `format` (string, optional): Output format: json, diff
- `output` (string, optional): Write output to file instead of stdout
- `verbose` (string, optional): Enable verbose logging to stderr
- `number` (integer, required): PR number
### gogs_repo_info

Get repository information (repo resource)

**Parameters:**
- `repo` (string, optional): Target repository (or set GOGS_DEFAULT_REPO)
- `format` (string, optional): Output format: json, markdown, text
- `output` (string, optional): Write output to file instead of stdout
- `verbose` (string, optional): Enable verbose logging to stderr
### gogs_comment_list

List comments on an issue or PR (comment resource)

**Parameters:**
- `repo` (string, optional): Target repository (or set GOGS_DEFAULT_REPO)
- `format` (string, optional): Output format: json, markdown, text
- `output` (string, optional): Write output to file instead of stdout
- `verbose` (string, optional): Enable verbose logging to stderr
- `type` (string, required): Type: issue or pr
- `number` (integer, required): Issue or PR number
### gogs_comment_create

Add a comment to an issue or PR (comment resource)

**Parameters:**
- `repo` (string, optional): Target repository (or set GOGS_DEFAULT_REPO)
- `format` (string, optional): Output format: json, markdown, text
- `output` (string, optional): Write output to file instead of stdout
- `verbose` (string, optional): Enable verbose logging to stderr
- `type` (string, required): Type: issue or pr
- `number` (integer, required): Issue or PR number
- `body` (string, required): Comment text
### gogs_label_list

List all labels for a repository (label resource)

**Parameters:**
- `repo` (string, optional): Target repository (or set GOGS_DEFAULT_REPO)
- `format` (string, optional): Output format: json, markdown, text
- `output` (string, optional): Write output to file instead of stdout
- `verbose` (string, optional): Enable verbose logging to stderr
### gogs_label_create

Create a new label (label resource)

**Parameters:**
- `repo` (string, optional): Target repository (or set GOGS_DEFAULT_REPO)
- `format` (string, optional): Output format: json, markdown, text
- `output` (string, optional): Write output to file instead of stdout
- `verbose` (string, optional): Enable verbose logging to stderr
- `name` (string, required): Label name
- `color` (string, optional): Hex color code (e.g. #ee0701)

## Tool Schema (JSON)

```json
[
  {
    "name": "gogs_issue_list",
    "description": "List repository issues (issue resource)",
    "inputSchema": {
      "type": "object",
      "properties": {
        "repo": {
          "type": "string",
          "description": "Target repository (or set GOGS_DEFAULT_REPO)"
        },
        "format": {
          "type": "string",
          "description": "Output format: json, markdown, text"
        },
        "output": {
          "type": "string",
          "description": "Write output to file instead of stdout"
        },
        "verbose": {
          "type": "string",
          "description": "Enable verbose logging to stderr"
        },
        "state": {
          "type": "string",
          "description": "Filter by state: open, closed, all"
        },
        "labels": {
          "type": "string",
          "description": "Filter by labels (comma-separated)"
        },
        "limit": {
          "type": "integer",
          "description": "Number of results per page"
        },
        "page": {
          "type": "integer",
          "description": "Page number"
        }
      },
      "required": []
    }
  },
  {
    "name": "gogs_issue_get",
    "description": "Get a single issue (issue resource)",
    "inputSchema": {
      "type": "object",
      "properties": {
        "repo": {
          "type": "string",
          "description": "Target repository (or set GOGS_DEFAULT_REPO)"
        },
        "format": {
          "type": "string",
          "description": "Output format: json, markdown, text"
        },
        "output": {
          "type": "string",
          "description": "Write output to file instead of stdout"
        },
        "verbose": {
          "type": "string",
          "description": "Enable verbose logging to stderr"
        },
        "number": {
          "type": "integer",
          "description": "Issue number"
        }
      },
      "required": [
        "number"
      ]
    }
  },
  {
    "name": "gogs_issue_create",
    "description": "Create a new issue (issue resource)",
    "inputSchema": {
      "type": "object",
      "properties": {
        "repo": {
          "type": "string",
          "description": "Target repository (or set GOGS_DEFAULT_REPO)"
        },
        "format": {
          "type": "string",
          "description": "Output format: json, markdown, text"
        },
        "output": {
          "type": "string",
          "description": "Write output to file instead of stdout"
        },
        "verbose": {
          "type": "string",
          "description": "Enable verbose logging to stderr"
        },
        "title": {
          "type": "string",
          "description": "Issue title"
        },
        "body": {
          "type": "string",
          "description": "Issue body/description"
        },
        "labels": {
          "type": "string",
          "description": "Comma-separated labels"
        },
        "assignee": {
          "type": "string",
          "description": "Assignee username"
        },
        "milestone": {
          "type": "integer",
          "description": "Milestone ID"
        }
      },
      "required": [
        "title"
      ]
    }
  },
  {
    "name": "gogs_issue_close",
    "description": "Close an issue (issue resource)",
    "inputSchema": {
      "type": "object",
      "properties": {
        "repo": {
          "type": "string",
          "description": "Target repository (or set GOGS_DEFAULT_REPO)"
        },
        "format": {
          "type": "string",
          "description": "Output format: json, markdown, text"
        },
        "output": {
          "type": "string",
          "description": "Write output to file instead of stdout"
        },
        "verbose": {
          "type": "string",
          "description": "Enable verbose logging to stderr"
        },
        "number": {
          "type": "integer",
          "description": "Issue number"
        }
      },
      "required": [
        "number"
      ]
    }
  },
  {
    "name": "gogs_issue_reopen",
    "description": "Reopen a closed issue (issue resource)",
    "inputSchema": {
      "type": "object",
      "properties": {
        "repo": {
          "type": "string",
          "description": "Target repository (or set GOGS_DEFAULT_REPO)"
        },
        "format": {
          "type": "string",
          "description": "Output format: json, markdown, text"
        },
        "output": {
          "type": "string",
          "description": "Write output to file instead of stdout"
        },
        "verbose": {
          "type": "string",
          "description": "Enable verbose logging to stderr"
        },
        "number": {
          "type": "integer",
          "description": "Issue number"
        }
      },
      "required": [
        "number"
      ]
    }
  },
  {
    "name": "gogs_issue_update",
    "description": "Update an issue (issue resource)",
    "inputSchema": {
      "type": "object",
      "properties": {
        "repo": {
          "type": "string",
          "description": "Target repository (or set GOGS_DEFAULT_REPO)"
        },
        "format": {
          "type": "string",
          "description": "Output format: json, markdown, text"
        },
        "output": {
          "type": "string",
          "description": "Write output to file instead of stdout"
        },
        "verbose": {
          "type": "string",
          "description": "Enable verbose logging to stderr"
        },
        "number": {
          "type": "integer",
          "description": "Issue number"
        },
        "title": {
          "type": "string",
          "description": "New title"
        },
        "body": {
          "type": "string",
          "description": "New body"
        },
        "state": {
          "type": "string",
          "description": "New state: open or closed"
        },
        "assignee": {
          "type": "string",
          "description": "Assignee username"
        },
        "milestone": {
          "type": "integer",
          "description": "Milestone ID"
        },
        "labels": {
          "type": "string",
          "description": "Comma-separated label names"
        }
      },
      "required": [
        "number"
      ]
    }
  },
  {
    "name": "gogs_pr_list",
    "description": "List repository pull requests (pr resource)",
    "inputSchema": {
      "type": "object",
      "properties": {
        "repo": {
          "type": "string",
          "description": "Target repository (or set GOGS_DEFAULT_REPO)"
        },
        "format": {
          "type": "string",
          "description": "Output format: json, markdown, text"
        },
        "output": {
          "type": "string",
          "description": "Write output to file instead of stdout"
        },
        "verbose": {
          "type": "string",
          "description": "Enable verbose logging to stderr"
        },
        "state": {
          "type": "string",
          "description": "Filter by state: open, closed, all"
        },
        "limit": {
          "type": "integer",
          "description": "Results per page"
        },
        "page": {
          "type": "integer",
          "description": "Page number"
        }
      },
      "required": []
    }
  },
  {
    "name": "gogs_pr_get",
    "description": "Get a single pull request (pr resource)",
    "inputSchema": {
      "type": "object",
      "properties": {
        "repo": {
          "type": "string",
          "description": "Target repository (or set GOGS_DEFAULT_REPO)"
        },
        "format": {
          "type": "string",
          "description": "Output format: json, markdown, text"
        },
        "output": {
          "type": "string",
          "description": "Write output to file instead of stdout"
        },
        "verbose": {
          "type": "string",
          "description": "Enable verbose logging to stderr"
        },
        "number": {
          "type": "integer",
          "description": "PR number"
        }
      },
      "required": [
        "number"
      ]
    }
  },
  {
    "name": "gogs_pr_create",
    "description": "Create a new pull request (pr resource)",
    "inputSchema": {
      "type": "object",
      "properties": {
        "repo": {
          "type": "string",
          "description": "Target repository (or set GOGS_DEFAULT_REPO)"
        },
        "format": {
          "type": "string",
          "description": "Output format: json, markdown, text"
        },
        "output": {
          "type": "string",
          "description": "Write output to file instead of stdout"
        },
        "verbose": {
          "type": "string",
          "description": "Enable verbose logging to stderr"
        },
        "title": {
          "type": "string",
          "description": "PR title"
        },
        "head": {
          "type": "string",
          "description": "Source branch with changes"
        },
        "base": {
          "type": "string",
          "description": "Target branch to merge into"
        },
        "body": {
          "type": "string",
          "description": "PR description"
        },
        "assignee": {
          "type": "string",
          "description": "Assignee username"
        }
      },
      "required": [
        "title",
        "head",
        "base"
      ]
    }
  },
  {
    "name": "gogs_pr_merge",
    "description": "Merge a pull request (pr resource)",
    "inputSchema": {
      "type": "object",
      "properties": {
        "repo": {
          "type": "string",
          "description": "Target repository (or set GOGS_DEFAULT_REPO)"
        },
        "format": {
          "type": "string",
          "description": "Output format: json, markdown, text"
        },
        "output": {
          "type": "string",
          "description": "Write output to file instead of stdout"
        },
        "verbose": {
          "type": "string",
          "description": "Enable verbose logging to stderr"
        },
        "number": {
          "type": "integer",
          "description": "PR number"
        },
        "strategy": {
          "type": "string",
          "description": "Merge strategy: merge, rebase, squash"
        }
      },
      "required": [
        "number"
      ]
    }
  },
  {
    "name": "gogs_pr_diff",
    "description": "Get pull request diff (pr resource)",
    "inputSchema": {
      "type": "object",
      "properties": {
        "repo": {
          "type": "string",
          "description": "Target repository (or set GOGS_DEFAULT_REPO)"
        },
        "format": {
          "type": "string",
          "description": "Output format: json, diff"
        },
        "output": {
          "type": "string",
          "description": "Write output to file instead of stdout"
        },
        "verbose": {
          "type": "string",
          "description": "Enable verbose logging to stderr"
        },
        "number": {
          "type": "integer",
          "description": "PR number"
        }
      },
      "required": [
        "number"
      ]
    }
  },
  {
    "name": "gogs_repo_info",
    "description": "Get repository information (repo resource)",
    "inputSchema": {
      "type": "object",
      "properties": {
        "repo": {
          "type": "string",
          "description": "Target repository (or set GOGS_DEFAULT_REPO)"
        },
        "format": {
          "type": "string",
          "description": "Output format: json, markdown, text"
        },
        "output": {
          "type": "string",
          "description": "Write output to file instead of stdout"
        },
        "verbose": {
          "type": "string",
          "description": "Enable verbose logging to stderr"
        }
      },
      "required": []
    }
  },
  {
    "name": "gogs_comment_list",
    "description": "List comments on an issue or PR (comment resource)",
    "inputSchema": {
      "type": "object",
      "properties": {
        "repo": {
          "type": "string",
          "description": "Target repository (or set GOGS_DEFAULT_REPO)"
        },
        "format": {
          "type": "string",
          "description": "Output format: json, markdown, text"
        },
        "output": {
          "type": "string",
          "description": "Write output to file instead of stdout"
        },
        "verbose": {
          "type": "string",
          "description": "Enable verbose logging to stderr"
        },
        "type": {
          "type": "string",
          "description": "Type: issue or pr"
        },
        "number": {
          "type": "integer",
          "description": "Issue or PR number"
        }
      },
      "required": [
        "type",
        "number"
      ]
    }
  },
  {
    "name": "gogs_comment_create",
    "description": "Add a comment to an issue or PR (comment resource)",
    "inputSchema": {
      "type": "object",
      "properties": {
        "repo": {
          "type": "string",
          "description": "Target repository (or set GOGS_DEFAULT_REPO)"
        },
        "format": {
          "type": "string",
          "description": "Output format: json, markdown, text"
        },
        "output": {
          "type": "string",
          "description": "Write output to file instead of stdout"
        },
        "verbose": {
          "type": "string",
          "description": "Enable verbose logging to stderr"
        },
        "type": {
          "type": "string",
          "description": "Type: issue or pr"
        },
        "number": {
          "type": "integer",
          "description": "Issue or PR number"
        },
        "body": {
          "type": "string",
          "description": "Comment text"
        }
      },
      "required": [
        "type",
        "number",
        "body"
      ]
    }
  },
  {
    "name": "gogs_label_list",
    "description": "List all labels for a repository (label resource)",
    "inputSchema": {
      "type": "object",
      "properties": {
        "repo": {
          "type": "string",
          "description": "Target repository (or set GOGS_DEFAULT_REPO)"
        },
        "format": {
          "type": "string",
          "description": "Output format: json, markdown, text"
        },
        "output": {
          "type": "string",
          "description": "Write output to file instead of stdout"
        },
        "verbose": {
          "type": "string",
          "description": "Enable verbose logging to stderr"
        }
      },
      "required": []
    }
  },
  {
    "name": "gogs_label_create",
    "description": "Create a new label (label resource)",
    "inputSchema": {
      "type": "object",
      "properties": {
        "repo": {
          "type": "string",
          "description": "Target repository (or set GOGS_DEFAULT_REPO)"
        },
        "format": {
          "type": "string",
          "description": "Output format: json, markdown, text"
        },
        "output": {
          "type": "string",
          "description": "Write output to file instead of stdout"
        },
        "verbose": {
          "type": "string",
          "description": "Enable verbose logging to stderr"
        },
        "name": {
          "type": "string",
          "description": "Label name"
        },
        "color": {
          "type": "string",
          "description": "Hex color code (e.g. #ee0701)"
        }
      },
      "required": [
        "name"
      ]
    }
  }
]
```

## Output Format

All tools return structured JSON to stdout:

**Success:**
```json
{ "ok": true, "data": { ... } }
```

**Error:**
```json
{ "ok": false, "error": "Human-readable message", "code": "API_ERROR", "status": 404 }
```

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Configuration or validation error |
| 2 | Gogs API error (non-2xx response) |
| 3 | Network error (timeout, DNS, connection refused) |

## Examples

**List open issues:**
```bash
gogs issue list --repo owner/repo --state open
```

**Create an issue:**
```bash
gogs issue create --repo owner/repo --title "Bug: crash on startup" --body "Steps to reproduce..."
```

**Get PR diff:**
```bash
gogs pr diff --repo owner/repo --number 42
```

**Merge a PR:**
```bash
gogs pr merge --repo owner/repo --number 42 --strategy squash
```

**Add a comment:**
```bash
gogs comment create --repo owner/repo --type issue --number 5 --body "LGTM!"
```
