#!/usr/bin/env node
import "dotenv/config";
import { Command } from "commander";
import { loadConfig, resolveRepo } from "./config.js";
import { createGogsClient } from "./client.js";
import { formatOutput } from "./formatters.js";
import { repoInfo } from "./commands/repo.js";
import { issueList, issueGet, issueCreate, issueCloseReopen, issueUpdate } from "./commands/issue.js";
import { prList, prGet, prCreate, prMerge, prDiff } from "./commands/pr.js";
import { commentList, commentCreate } from "./commands/comment.js";
import { labelList, labelCreate } from "./commands/label.js";
import { ConfigError, ValidationError, ApiError, NetworkError } from "./errors.js";

const program = new Command();

program
  .name("gogs")
  .description("CLI tool for operating Gogs repositories")
  .version("0.1.0")
  .option("--repo <owner/repo>", "Target repository (or set GOGS_DEFAULT_REPO)")
  .option("--format <fmt>", "Output format: json, markdown, text", "json")
  .option("--verbose", "Enable verbose logging to stderr", false);

// ── Issue commands ──

const issueCmd = program
  .command("issue")
  .description("Issue operations");

issueCmd
  .command("list")
  .description("List repository issues")
  .option("--state <state>", "Filter by state: open, closed, all")
  .option("--labels <labels>", "Filter by labels (comma-separated)")
  .option("--limit <n>", "Number of results per page", parseInt)
  .option("--page <n>", "Page number", parseInt)
  .action(async (options) => {
    await run(async (config, client) => {
      const repo = resolveRepo(config, config.repo);
      const result = await issueList(client, {
        repo,
        state: options.state,
        labels: options.labels,
        limit: options.limit,
        page: options.page,
      });
      console.log(formatOutput(true, result, config.format));
    });
  });

issueCmd
  .command("get")
  .description("Get a single issue")
  .requiredOption("--number <n>", "Issue number", parseInt)
  .action(async (options) => {
    await run(async (config, client) => {
      const repo = resolveRepo(config, config.repo);
      const result = await issueGet(client, { repo, number: options.number });
      console.log(formatOutput(true, result, config.format));
    });
  });

issueCmd
  .command("create")
  .description("Create a new issue")
  .requiredOption("--title <title>", "Issue title")
  .option("--body <body>", "Issue body/description")
  .option("--labels <labels>", "Comma-separated labels")
  .option("--assignee <user>", "Assignee username")
  .option("--milestone <id>", "Milestone ID", parseInt)
  .action(async (options) => {
    await run(async (config, client) => {
      const repo = resolveRepo(config, config.repo);
      const result = await issueCreate(client, {
        repo,
        title: options.title,
        body: options.body,
        labels: options.labels,
        assignee: options.assignee,
        milestone: options.milestone,
      });
      console.log(formatOutput(true, result, config.format));
    });
  });

issueCmd
  .command("close")
  .description("Close an issue")
  .requiredOption("--number <n>", "Issue number", parseInt)
  .action(async (options) => {
    await run(async (config, client) => {
      const repo = resolveRepo(config, config.repo);
      const result = await issueCloseReopen(client, { repo, number: options.number, action: "close" });
      console.log(formatOutput(true, result, config.format));
    });
  });

issueCmd
  .command("reopen")
  .description("Reopen a closed issue")
  .requiredOption("--number <n>", "Issue number", parseInt)
  .action(async (options) => {
    await run(async (config, client) => {
      const repo = resolveRepo(config, config.repo);
      const result = await issueCloseReopen(client, { repo, number: options.number, action: "reopen" });
      console.log(formatOutput(true, result, config.format));
    });
  });

issueCmd
  .command("update")
  .description("Update an issue")
  .requiredOption("--number <n>", "Issue number", parseInt)
  .option("--title <title>", "New title")
  .option("--body <body>", "New body")
  .option("--state <state>", "New state: open or closed")
  .option("--assignee <user>", "Assignee username")
  .option("--milestone <id>", "Milestone ID", parseInt)
  .option("--labels <labels>", "Comma-separated label names")
  .action(async (options) => {
    await run(async (config, client) => {
      const repo = resolveRepo(config, config.repo);
      const result = await issueUpdate(client, {
        repo,
        number: options.number,
        title: options.title,
        body: options.body,
        state: options.state,
        assignee: options.assignee,
        milestone: options.milestone,
        labels: options.labels,
      });
      console.log(formatOutput(true, result, config.format));
    });
  });

// ── PR commands ──

const prCmd = program
  .command("pr")
  .description("Pull request operations");

prCmd
  .command("list")
  .description("List repository pull requests")
  .option("--state <state>", "Filter by state: open, closed, all")
  .option("--limit <n>", "Results per page", parseInt)
  .option("--page <n>", "Page number", parseInt)
  .action(async (options) => {
    await run(async (config, client) => {
      const repo = resolveRepo(config, config.repo);
      const result = await prList(client, {
        repo,
        state: options.state,
        limit: options.limit,
        page: options.page,
      });
      console.log(formatOutput(true, result, config.format));
    });
  });

prCmd
  .command("get")
  .description("Get a single pull request")
  .requiredOption("--number <n>", "PR number", parseInt)
  .action(async (options) => {
    await run(async (config, client) => {
      const repo = resolveRepo(config, config.repo);
      const result = await prGet(client, { repo, number: options.number });
      console.log(formatOutput(true, result, config.format));
    });
  });

prCmd
  .command("create")
  .description("Create a new pull request")
  .requiredOption("--title <title>", "PR title")
  .requiredOption("--head <branch>", "Source branch with changes")
  .requiredOption("--base <branch>", "Target branch to merge into")
  .option("--body <body>", "PR description")
  .option("--assignee <user>", "Assignee username")
  .action(async (options) => {
    await run(async (config, client) => {
      const repo = resolveRepo(config, config.repo);
      const result = await prCreate(client, {
        repo,
        title: options.title,
        head: options.head,
        base: options.base,
        body: options.body,
        assignee: options.assignee,
      });
      console.log(formatOutput(true, result, config.format));
    });
  });

prCmd
  .command("merge")
  .description("Merge a pull request")
  .requiredOption("--number <n>", "PR number", parseInt)
  .option("--strategy <s>", "Merge strategy: merge, rebase, squash", "merge")
  .action(async (options) => {
    await run(async (config, client) => {
      const repo = resolveRepo(config, config.repo);
      const result = await prMerge(client, {
        repo,
        number: options.number,
        strategy: options.strategy,
      });
      console.log(formatOutput(true, result, config.format));
    });
  });

prCmd
  .command("diff")
  .description("Get pull request diff")
  .requiredOption("--number <n>", "PR number", parseInt)
  .option("--format <fmt>", "Output format: json, diff", "json")
  .action(async (options) => {
    await run(async (config, client) => {
      const repo = resolveRepo(config, config.repo);
      const result = await prDiff(client, { repo, number: options.number });
      console.log(formatOutput(true, result, config.format));
    });
  });

// ── Repo commands ──

const repoCmd = program
  .command("repo")
  .description("Repository operations");

repoCmd
  .command("info")
  .description("Get repository information")
  .action(async () => {
    await run(async (config, client) => {
      const repo = resolveRepo(config, config.repo);
      const result = await repoInfo(client, { repo });
      console.log(formatOutput(true, result, config.format));
    });
  });

// ── Comment commands ──

const commentCmd = program
  .command("comment")
  .description("Comment operations on issues and pull requests");

commentCmd
  .command("list")
  .description("List comments on an issue or PR")
  .requiredOption("--type <t>", "Type: issue or pr")
  .requiredOption("--number <n>", "Issue or PR number", parseInt)
  .action(async (options) => {
    await run(async (config, client) => {
      const repo = resolveRepo(config, config.repo);
      const result = await commentList(client, {
        repo,
        type: options.type,
        number: options.number,
      });
      console.log(formatOutput(true, result, config.format));
    });
  });

commentCmd
  .command("create")
  .description("Add a comment to an issue or PR")
  .requiredOption("--type <t>", "Type: issue or pr")
  .requiredOption("--number <n>", "Issue or PR number", parseInt)
  .requiredOption("--body <body>", "Comment text")
  .action(async (options) => {
    await run(async (config, client) => {
      const repo = resolveRepo(config, config.repo);
      const result = await commentCreate(client, {
        repo,
        type: options.type,
        number: options.number,
        body: options.body,
      });
      console.log(formatOutput(true, result, config.format));
    });
  });

// ── Label commands ──

const labelCmd = program
  .command("label")
  .description("Label operations");

labelCmd
  .command("list")
  .description("List all labels for a repository")
  .action(async () => {
    await run(async (config, client) => {
      const repo = resolveRepo(config, config.repo);
      const result = await labelList(client, { repo });
      console.log(formatOutput(true, result, config.format));
    });
  });

labelCmd
  .command("create")
  .description("Create a new label")
  .requiredOption("--name <name>", "Label name")
  .option("--color <hex>", "Hex color code (e.g. #ee0701)")
  .action(async (options) => {
    await run(async (config, client) => {
      const repo = resolveRepo(config, config.repo);
      const result = await labelCreate(client, {
        repo,
        name: options.name,
        color: options.color,
      });
      console.log(formatOutput(true, result, config.format));
    });
  });

// ── Main runner ──

async function run(fn: (config: ReturnType<typeof loadConfig>, client: ReturnType<typeof createGogsClient>) => Promise<void>) {
  try {
    const cliOpts = program.opts();
    const config = loadConfig({ repo: cliOpts.repo, format: cliOpts.format });
    const client = createGogsClient({
      baseUrl: config.baseUrl,
      apiKey: config.apiKey,
      timeout: config.timeout,
    });

    if (config.verbose) {
      console.error(`[verbose] Gogs API base: ${config.baseUrl}`);
    }

    await fn(config, client);
  } catch (err) {
    if (err instanceof ConfigError) {
      console.log(JSON.stringify({ ok: false, error: err.message, code: "CONFIG_ERROR" }));
      process.exit(1);
    }
    if (err instanceof ValidationError) {
      console.log(JSON.stringify({ ok: false, error: err.message, code: "VALIDATION_ERROR" }));
      process.exit(1);
    }
    if (err instanceof ApiError) {
      console.log(
        JSON.stringify({
          ok: false,
          error: err.message,
          code: "API_ERROR",
          status: err.status,
        })
      );
      process.exit(2);
    }
    if (err instanceof NetworkError) {
      console.log(JSON.stringify({ ok: false, error: err.message, code: "NETWORK_ERROR" }));
      process.exit(3);
    }
    console.log(
      JSON.stringify({
        ok: false,
        error: err instanceof Error ? err.message : "Unknown error",
        code: "INTERNAL_ERROR",
      })
    );
    process.exit(1);
  }
}

program.parse();
