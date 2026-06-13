import { ConfigError } from "./errors.js";
import type { AppConfig } from "./types.js";
import { loadUserConfig } from "./user-config.js";
import { detectRepoFromGit } from "./git.js";

/**
 * Load configuration with precedence:
 *   1. CLI flags (passed via cliOpts)
 *   2. Environment variables / project .env (loaded by dotenv)
 *   3. User ~/.gogs/config.json (machine-wide, set once)
 *   4. Built-in defaults
 */
export function loadConfig(cliOpts: {
  repo?: string;
  format?: "json" | "markdown" | "text";
  output?: string;
}): AppConfig {
  const user = loadUserConfig();

  const apiKey = process.env.GOGS_API_KEY || user.apiKey;
  if (!apiKey) {
    throw new ConfigError(
      "GOGS_API_KEY is required. Set it via ~/.gogs/config.json, project .env, or environment variable."
    );
  }

  return {
    baseUrl:
      process.env.GOGS_BASE_URL ||
      user.baseUrl ||
      "https://git.desiyi.com/api/v1",
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
  // 1. Explicit --repo flag
  if (paramRepo) return paramRepo;
  // 2. GOGS_DEFAULT_REPO env var
  if (config.defaultRepo) return config.defaultRepo;
  // 3. Auto-detect from local git remote
  const detected = detectRepoFromGit(config.baseUrl);
  if (detected) return detected;
  // 4. Bail
  throw new ConfigError(
    "--repo <owner/repo> is required (or run inside a git clone with an origin remote)."
  );
}
