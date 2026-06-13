import { ConfigError } from "./errors.js";
import type { AppConfig } from "./types.js";

export function loadConfig(cliOpts: {
  repo?: string;
  format?: "json" | "markdown" | "text";
  output?: string;
}): AppConfig {
  const apiKey = process.env.GOGS_API_KEY;
  if (!apiKey) {
    throw new ConfigError(
      "GOGS_API_KEY is required. Set it in .env or as environment variable."
    );
  }

  return {
    baseUrl: process.env.GOGS_BASE_URL || "https://git.desiyi.com/api/v1",
    apiKey,
    defaultRepo: process.env.GOGS_DEFAULT_REPO || undefined,
    verbose: process.env.GOGS_VERBOSE === "true",
    timeout: process.env.GOGS_TIMEOUT
      ? parseInt(process.env.GOGS_TIMEOUT, 10)
      : 30000,
    repo: cliOpts.repo,
    format: cliOpts.format || "json",
    output: cliOpts.output || process.env.GOGS_OUTPUT || undefined,
  };
}

export function resolveRepo(
  config: AppConfig,
  paramRepo?: string
): string {
  const repo = paramRepo || config.defaultRepo;
  if (!repo) {
    throw new ConfigError("--repo <owner/repo> is required.");
  }
  return repo;
}
