#!/usr/bin/env node
import "dotenv/config";
import { Command } from "commander";
import { loadConfig, resolveRepo } from "./config.js";
import { createGogsClient } from "./client.js";
import { formatOutput } from "./formatters.js";
import { inferFormatFromPath, writeOutput } from "./output.js";
import type { AppConfig } from "./types.js";
import { repoInfo, repoCreate } from "./commands/repo.js";
import { issueList, issueGet, issueCreate, issueCloseReopen, issueUpdate } from "./commands/issue.js";
import { prList, prGet, prCreate, prMerge, prDiff } from "./commands/pr.js";
import { commentList, commentCreate } from "./commands/comment.js";
import { labelList, labelGet, labelCreate, labelUpdate, labelDelete } from "./commands/label.js";
import { ConfigError, ValidationError, ApiError, NetworkError } from "./errors.js";

const program = new Command();

async function printResult(result: unknown, config: AppConfig): Promise<void> {
  const text = formatOutput(true, result, config.format);
  await writeOutput(text, config.output);
}

program
  .name("gogs")
  .description("CLI tool for operating Gogs repositories")
  .version("0.2.1")
  .option("--repo <owner/repo>", "Target repository (or set GOGS_DEFAULT_REPO)")
  .option("--format <fmt>", "Output format: json, markdown, text", "json")
  .option("--output <path>", "Write output to file instead of stdout")
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
      await printResult(result, config);
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
      await printResult(result, config);
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
      await printResult(result, config);
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
      await printResult(result, config);
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
      await printResult(result, config);
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
      await printResult(result, config);
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
      await printResult(result, config);
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
      await printResult(result, config);
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
      await printResult(result, config);
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
      await printResult(result, config);
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
      await printResult(result, config);
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
      await printResult(result, config);
    });
  });

repoCmd
  .command("create")
  .description("Create a new repository")
  .requiredOption("--name <name>", "Repository name")
  .option("--description <desc>", "Repository description")
  .option("--private", "Make repository private", false)
  .action(async (options) => {
    await run(async (config, client) => {
      const result = await repoCreate(client, {
        name: options.name,
        description: options.description,
        private: options.private,
      });
      await printResult(result, config);
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
      await printResult(result, config);
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
      await printResult(result, config);
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
      await printResult(result, config);
    });
  });

labelCmd
  .command("get")
  .description("Get a single label")
  .requiredOption("--id <n>", "Label ID", parseInt)
  .action(async (options) => {
    await run(async (config, client) => {
      const repo = resolveRepo(config, config.repo);
      const result = await labelGet(client, { repo, id: options.id });
      await printResult(result, config);
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
      await printResult(result, config);
    });
  });

labelCmd
  .command("update")
  .description("Update a label")
  .requiredOption("--id <n>", "Label ID", parseInt)
  .option("--name <name>", "New label name")
  .option("--color <hex>", "New hex color code")
  .action(async (options) => {
    await run(async (config, client) => {
      const repo = resolveRepo(config, config.repo);
      const result = await labelUpdate(client, {
        repo,
        id: options.id,
        name: options.name,
        color: options.color,
      });
      await printResult(result, config);
    });
  });

labelCmd
  .command("delete")
  .description("Delete a label")
  .requiredOption("--id <n>", "Label ID", parseInt)
  .action(async (options) => {
    await run(async (config, client) => {
      const repo = resolveRepo(config, config.repo);
      const result = await labelDelete(client, { repo, id: options.id });
      await printResult(result, config);
    });
  });

// ── Main runner ──

async function run(fn: (config: ReturnType<typeof loadConfig>, client: ReturnType<typeof createGogsClient>) => Promise<void>) {
  try {
    const cliOpts = program.opts();
    const outputPath = cliOpts.output as string | undefined;
    const effectiveFormat = inferFormatFromPath(outputPath || "") || cliOpts.format;

    const config = loadConfig({
      repo: cliOpts.repo,
      format: effectiveFormat,
      output: outputPath,
    });

    const client = createGogsClient({
      baseUrl: config.baseUrl,
      apiKey: config.apiKey,
      timeout: config.timeout,
    });

    if (config.verbose) {
      console.error(`[verbose] Gogs API base: ${config.baseUrl}`);
      if (config.output) {
        console.error(`[verbose] Output file: ${config.output}`);
      }
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
