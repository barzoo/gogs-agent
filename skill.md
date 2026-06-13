# Gogs Agent Skill

Operate Gogs repositories directly from Claude Code — create and manage issues, pull requests, and comments.

## Usage

This skill provides the following tools. Call them with structured arguments to interact with Gogs.

## Tools

### gogs_issue_list

List repository issues (issue resource)

**Parameters:**
- `repo` (string, optional): Target repository as owner/repo (or set GOGS_DEFAULT_REPO env var)
- `state` (string, required): Filter by state: open, closed, all
- `labels` (string, required): Filter by labels (comma-separated)
- `limit` (integer, required): Number of results per page
- `page` (integer, required): Page number

### gogs_issue_get

Get a single issue (issue resource)

**Parameters:**
- `repo` (string, optional): Target repository as owner/repo (or set GOGS_DEFAULT_REPO env var)
- `number` (integer, required): Issue number

### gogs_issue_create

Create a new issue (issue resource)

**Parameters:**
- `repo` (string, optional): Target repository as owner/repo (or set GOGS_DEFAULT_REPO env var)
- `title` (string, required): Issue title
- `body` (string, required): Issue body/description
- `labels` (string, required): Comma-separated labels
- `assignee` (string, required): Assignee username
- `milestone` (integer, required): Milestone ID

### gogs_issue_close

Close an issue (issue resource)

**Parameters:**
- `repo` (string, optional): Target repository as owner/repo (or set GOGS_DEFAULT_REPO env var)
- `number` (integer, required): Issue number

### gogs_issue_reopen

Reopen a closed issue (issue resource)

**Parameters:**
- `repo` (string, optional): Target repository as owner/repo (or set GOGS_DEFAULT_REPO env var)
- `number` (integer, required): Issue number

### gogs_pr_list

List repository pull requests (pr resource)

**Parameters:**
- `repo` (string, optional): Target repository as owner/repo (or set GOGS_DEFAULT_REPO env var)
- `state` (string, required): Filter by state: open, closed, all
- `limit` (integer, required): Results per page
- `page` (integer, required): Page number

### gogs_pr_get

Get a single pull request (pr resource)

**Parameters:**
- `repo` (string, optional): Target repository as owner/repo (or set GOGS_DEFAULT_REPO env var)
- `number` (integer, required): PR number

### gogs_pr_create

Create a new pull request (pr resource)

**Parameters:**
- `repo` (string, optional): Target repository as owner/repo (or set GOGS_DEFAULT_REPO env var)
- `title` (string, required): PR title
- `head` (string, required): Source branch with changes
- `base` (string, required): Target branch to merge into
- `body` (string, required): PR description
- `assignee` (string, required): Assignee username

### gogs_pr_merge

Merge a pull request (pr resource)

**Parameters:**
- `repo` (string, optional): Target repository as owner/repo (or set GOGS_DEFAULT_REPO env var)
- `number` (integer, required): PR number
- `strategy` (string, required): Merge strategy: merge, rebase, squash

### gogs_pr_diff

Get pull request diff (pr resource)

**Parameters:**
- `repo` (string, optional): Target repository as owner/repo (or set GOGS_DEFAULT_REPO env var)
- `number` (integer, required): PR number
- `format` (string, required): Output format: json, diff

### gogs_repo_info

Get repository information (repo resource)

**Parameters:**
- `repo` (string, optional): Target repository as owner/repo (or set GOGS_DEFAULT_REPO env var)

### gogs_comment_list

List comments on an issue or PR (comment resource)

**Parameters:**
- `repo` (string, optional): Target repository as owner/repo (or set GOGS_DEFAULT_REPO env var)
- `type` (string, required): Type: issue or pr
- `number` (integer, required): Issue or PR number

### gogs_comment_create

Add a comment to an issue or PR (comment resource)

**Parameters:**
- `repo` (string, optional): Target repository as owner/repo (or set GOGS_DEFAULT_REPO env var)
- `type` (string, required): Type: issue or pr
- `number` (integer, required): Issue or PR number
- `body` (string, required): Comment text


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
          "description": "Target repository as owner/repo (or set GOGS_DEFAULT_REPO env var)"
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
      "required": [
        "state",
        "labels",
        "limit",
        "page"
      ]
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
          "description": "Target repository as owner/repo (or set GOGS_DEFAULT_REPO env var)"
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
          "description": "Target repository as owner/repo (or set GOGS_DEFAULT_REPO env var)"
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
        "title",
        "body",
        "labels",
        "assignee",
        "milestone"
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
          "description": "Target repository as owner/repo (or set GOGS_DEFAULT_REPO env var)"
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
          "description": "Target repository as owner/repo (or set GOGS_DEFAULT_REPO env var)"
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
    "name": "gogs_pr_list",
    "description": "List repository pull requests (pr resource)",
    "inputSchema": {
      "type": "object",
      "properties": {
        "repo": {
          "type": "string",
          "description": "Target repository as owner/repo (or set GOGS_DEFAULT_REPO env var)"
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
      "required": [
        "state",
        "limit",
        "page"
      ]
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
          "description": "Target repository as owner/repo (or set GOGS_DEFAULT_REPO env var)"
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
          "description": "Target repository as owner/repo (or set GOGS_DEFAULT_REPO env var)"
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
        "base",
        "body",
        "assignee"
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
          "description": "Target repository as owner/repo (or set GOGS_DEFAULT_REPO env var)"
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
        "number",
        "strategy"
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
          "description": "Target repository as owner/repo (or set GOGS_DEFAULT_REPO env var)"
        },
        "number": {
          "type": "integer",
          "description": "PR number"
        },
        "format": {
          "type": "string",
          "description": "Output format: json, diff"
        }
      },
      "required": [
        "number",
        "format"
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
          "description": "Target repository as owner/repo (or set GOGS_DEFAULT_REPO env var)"
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
          "description": "Target repository as owner/repo (or set GOGS_DEFAULT_REPO env var)"
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
          "description": "Target repository as owner/repo (or set GOGS_DEFAULT_REPO env var)"
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
  }
]
```
