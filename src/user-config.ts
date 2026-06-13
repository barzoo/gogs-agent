import { homedir } from "os";
import { join } from "path";
import { readFileSync } from "fs";

export const USER_CONFIG_DIR = ".gogs";
export const USER_CONFIG_FILENAME = "config.json";

export interface UserConfig {
  apiKey?: string;
  baseUrl?: string;
}

let cached: UserConfig | undefined;

/**
 * Load user-level configuration from ~/.gogs/config.json.
 * Returns an empty object if the file does not exist or is malformed.
 *
 * The result is memoized — the file is read at most once per process,
 * since machine-wide settings don't change while the CLI is running.
 *
 * The user config stores machine-wide, rarely-changing settings
 * (Gogs server URL, personal API key) so they don't need to be
 * repeated in every project's .env file.
 */
export function loadUserConfig(): UserConfig {
  if (cached) return cached;

  try {
    const configPath = join(homedir(), USER_CONFIG_DIR, USER_CONFIG_FILENAME);
    const raw = readFileSync(configPath, "utf-8");
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) {
      cached = {};
      return cached;
    }
    const cfg: UserConfig = {};
    if (typeof parsed.apiKey === "string") cfg.apiKey = parsed.apiKey;
    if (typeof parsed.baseUrl === "string") cfg.baseUrl = parsed.baseUrl;
    cached = cfg;
    return cached;
  } catch {
    cached = {};
    return cached;
  }
}
