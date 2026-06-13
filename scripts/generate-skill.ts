/**
 * Auto-generates skill.md from CLI metadata.
 */
import { Command } from "commander";
import { writeFileSync } from "fs";

const program = new Command();
program
  .name("gogs")
  .description("CLI tool for operating Gogs repositories")
  .version("0.1.0")
  .option("--repo <owner/repo>", "Target repository (or set GOGS_DEFAULT_REPO)")
  .option("--format <fmt>", "Output format: json, markdown, text", "json")
  .option("--output <path>", "Write output to file instead of stdout")
  .option("--verbose", "Enable verbose logging to stderr", false);

const issue = program.command("issue").description("Issue operations");
issue.command("list").description("List repository issues").option("--state <state>", "Filter by state: open, closed, all").option("--labels <labels>", "Filter by labels (comma-separated)").option("--limit <n>", "Number of results per page").option("--page <n>", "Page number");
issue.command("get").description("Get a single issue").requiredOption("--number <n>", "Issue number");
issue.command("create").description("Create a new issue").requiredOption("--title <title>", "Issue title").option("--body <body>", "Issue body/description").option("--labels <labels>", "Comma-separated labels").option("--assignee <user>", "Assignee username").option("--milestone <id>", "Milestone ID");
issue.command("close").description("Close an issue").requiredOption("--number <n>", "Issue number");
issue.command("reopen").description("Reopen a closed issue").requiredOption("--number <n>", "Issue number");

const pr = program.command("pr").description("Pull request operations");
pr.command("list").description("List repository pull requests").option("--state <state>", "Filter by state: open, closed, all").option("--limit <n>", "Results per page").option("--page <n>", "Page number");
pr.command("get").description("Get a single pull request").requiredOption("--number <n>", "PR number");
pr.command("create").description("Create a new pull request").requiredOption("--title <title>", "PR title").requiredOption("--head <branch>", "Source branch with changes").requiredOption("--base <branch>", "Target branch to merge into").option("--body <body>", "PR description").option("--assignee <user>", "Assignee username");
pr.command("merge").description("Merge a pull request").requiredOption("--number <n>", "PR number").option("--strategy <s>", "Merge strategy: merge, rebase, squash");
pr.command("diff").description("Get pull request diff").requiredOption("--number <n>", "PR number").option("--format <fmt>", "Output format: json, diff");

const repo = program.command("repo").description("Repository operations");
repo.command("info").description("Get repository information");

const comment = program.command("comment").description("Comment operations on issues and pull requests");
comment.command("list").description("List comments on an issue or PR").requiredOption("--type <t>", "Type: issue or pr").requiredOption("--number <n>", "Issue or PR number");
comment.command("create").description("Add a comment to an issue or PR").requiredOption("--type <t>", "Type: issue or pr").requiredOption("--number <n>", "Issue or PR number").requiredOption("--body <body>", "Comment text");

// ── Generate tool definitions ──

interface ToolDef {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, { type: string; description: string }>;
    required: string[];
  };
}

function buildTools(): ToolDef[] {
  const tools: ToolDef[] = [];

  // Global options defined on the root program (skip --version)
  const globalOptions = program.options
    .filter((opt) => opt.long !== "--version")
    .map((opt) => ({
      name: opt.long!.replace(/^--/, ""),
      description: opt.description,
      required: opt.required,
    }));

  for (const resourceCmd of program.commands) {
    const resource = resourceCmd.name();
    for (const actionCmd of resourceCmd.commands) {
      const action = actionCmd.name();
      const toolName = `gogs_${resource}_${action}`;

      const properties: Record<string, { type: string; description: string }> = {};
      const required: string[] = [];

      // Global --repo option
      properties["repo"] = {
        type: "string",
        description: "Target repository as owner/repo (or set GOGS_DEFAULT_REPO env var)",
      };

      // Add global options (--format, --output, --verbose) — all optional
      for (const opt of globalOptions) {
        const type = opt.name.includes("number") || opt.name.includes("limit") || opt.name.includes("page") || opt.name.includes("milestone")
          ? "integer"
          : "string";

        properties[opt.name] = {
          type,
          description: opt.description,
        };

        // Global options are never required
      }

      for (const opt of actionCmd.options) {
        const name = opt.long!.replace(/^--/, "");
        const type = name.includes("number") || name.includes("limit") || name.includes("page") || name.includes("milestone")
          ? "integer"
          : "string";

        properties[name] = {
          type,
          description: opt.description,
        };

        // Check if this is a requiredOption (mandatory=true) vs regular option
        // In Commander.js, both .option() and .requiredOption() have required=true,
        // but only requiredOption has mandatory=true
        if ((opt as any).mandatory) {
          required.push(name);
        }
      }

      tools.push({
        name: toolName,
        description: `${actionCmd.description()} (${resource} resource)`,
        inputSchema: {
          type: "object",
          properties,
          required,
        },
      });
    }
  }

  return tools;
}

const tools = buildTools();

const skillMarkdown = `---
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
- \`GOGS_API_KEY\` environment variable set (or in .env file)
- Optional: \`GOGS_BASE_URL\` (defaults to https://git.desiyi.com/api/v1)
- Optional: \`GOGS_DEFAULT_REPO\` as fallback for --repo

## Installation

\`\`\`bash
npm install -g gogs-agent
\`\`\`

## Usage

This skill provides the following tools. Call them with structured arguments to interact with Gogs.

## Tools

${tools.map(t => `### ${t.name}

${t.description}

**Parameters:**
${Object.entries(t.inputSchema.properties).map(([name, prop]) =>
  `- \`${name}\` (${prop.type}${t.inputSchema.required.includes(name) ? ", required" : ", optional"}): ${prop.description}`
).join("\n")}
`).join("\n")}

## Tool Schema (JSON)

\`\`\`json
${JSON.stringify(tools, null, 2)}
\`\`\`

## Output Format

All tools return structured JSON to stdout:

**Success:**
\`\`\`json
{ "ok": true, "data": { ... } }
\`\`\`

**Error:**
\`\`\`json
{ "ok": false, "error": "Human-readable message", "code": "API_ERROR", "status": 404 }
\`\`\`

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Configuration or validation error |
| 2 | Gogs API error (non-2xx response) |
| 3 | Network error (timeout, DNS, connection refused) |

## Examples

**List open issues:**
\`\`\`bash
gogs issue list --repo owner/repo --state open
\`\`\`

**Create an issue:**
\`\`\`bash
gogs issue create --repo owner/repo --title "Bug: crash on startup" --body "Steps to reproduce..."
\`\`\`

**Get PR diff:**
\`\`\`bash
gogs pr diff --repo owner/repo --number 42
\`\`\`

**Merge a PR:**
\`\`\`bash
gogs pr merge --repo owner/repo --number 42 --strategy squash
\`\`\`

**Add a comment:**
\`\`\`bash
gogs comment create --repo owner/repo --type issue --number 5 --body "LGTM!"
\`\`\`
`;

writeFileSync("skill.md", skillMarkdown);
console.log("Generated skill.md with", tools.length, "tools");
