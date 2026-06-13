import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { loadConfig, resolveRepo } from "../src/config.js";

// Mock user config module — tests control the return value per case
vi.mock("../src/user-config.js", () => ({
  loadUserConfig: vi.fn(),
}));

// Mock git detection — returns undefined unless overridden per test
vi.mock("../src/git.js", () => ({
  detectRepoFromGit: vi.fn(),
}));

import { loadUserConfig } from "../src/user-config.js";
import { detectRepoFromGit } from "../src/git.js";

const mockedLoadUserConfig = vi.mocked(loadUserConfig);
const mockedDetectRepo = vi.mocked(detectRepoFromGit);

describe("loadConfig", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    delete process.env.GOGS_API_KEY;
    delete process.env.GOGS_BASE_URL;
    delete process.env.GOGS_DEFAULT_REPO;
    delete process.env.GOGS_TIMEOUT;
    delete process.env.GOGS_VERBOSE;
    delete process.env.GOGS_OUTPUT;
    // Default: no user config file present
    mockedLoadUserConfig.mockReturnValue({});
    // Default: not in a git repo
    mockedDetectRepo.mockReturnValue(undefined);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // ── API key ──

  it("throws ConfigError when neither env var nor user config provides apiKey", () => {
    mockedLoadUserConfig.mockReturnValue({});
    expect(() => loadConfig({})).toThrow(
      "GOGS_API_KEY is required. Set it via ~/.gogs/config.json, project .env, or environment variable."
    );
  });

  it("reads apiKey from environment variable", () => {
    process.env.GOGS_API_KEY = "env-key";
    const config = loadConfig({});
    expect(config.apiKey).toBe("env-key");
  });

  it("reads apiKey from user config when env var is not set", () => {
    mockedLoadUserConfig.mockReturnValue({ apiKey: "user-key" });
    const config = loadConfig({});
    expect(config.apiKey).toBe("user-key");
  });

  it("env var apiKey takes precedence over user config apiKey", () => {
    process.env.GOGS_API_KEY = "env-key";
    mockedLoadUserConfig.mockReturnValue({ apiKey: "user-key" });
    const config = loadConfig({});
    expect(config.apiKey).toBe("env-key");
  });

  // ── baseUrl ──

  it("reads baseUrl from environment variable", () => {
    process.env.GOGS_API_KEY = "test-key";
    process.env.GOGS_BASE_URL = "https://env.example.com/api/v1";
    const config = loadConfig({});
    expect(config.baseUrl).toBe("https://env.example.com/api/v1");
  });

  it("reads baseUrl from user config when env var is not set", () => {
    process.env.GOGS_API_KEY = "test-key";
    mockedLoadUserConfig.mockReturnValue({ baseUrl: "https://user.example.com/api/v1" });
    const config = loadConfig({});
    expect(config.baseUrl).toBe("https://user.example.com/api/v1");
  });

  it("env var baseUrl takes precedence over user config baseUrl", () => {
    process.env.GOGS_API_KEY = "test-key";
    process.env.GOGS_BASE_URL = "https://env.example.com/api/v1";
    mockedLoadUserConfig.mockReturnValue({ baseUrl: "https://user.example.com/api/v1" });
    const config = loadConfig({});
    expect(config.baseUrl).toBe("https://env.example.com/api/v1");
  });

  it("uses default baseUrl when neither env nor user config provides one", () => {
    process.env.GOGS_API_KEY = "test-key";
    mockedLoadUserConfig.mockReturnValue({});
    const config = loadConfig({});
    expect(config.baseUrl).toBe("https://git.desiyi.com/api/v1");
  });

  // ── Other env vars (unchanged behavior) ──

  it("reads GOGS_DEFAULT_REPO from environment", () => {
    process.env.GOGS_API_KEY = "test-key";
    process.env.GOGS_DEFAULT_REPO = "myorg/myrepo";
    const config = loadConfig({});
    expect(config.defaultRepo).toBe("myorg/myrepo");
  });

  it("reads GOGS_TIMEOUT as number", () => {
    process.env.GOGS_API_KEY = "test-key";
    process.env.GOGS_TIMEOUT = "15000";
    const config = loadConfig({});
    expect(config.timeout).toBe(15000);
  });

  it("defaults timeout to 30000", () => {
    process.env.GOGS_API_KEY = "test-key";
    const config = loadConfig({});
    expect(config.timeout).toBe(30000);
  });

  it("reads GOGS_VERBOSE boolean", () => {
    process.env.GOGS_API_KEY = "test-key";
    process.env.GOGS_VERBOSE = "true";
    const config = loadConfig({});
    expect(config.verbose).toBe(true);
  });

  it("CLI --repo flag overrides GOGS_DEFAULT_REPO", () => {
    process.env.GOGS_API_KEY = "test-key";
    process.env.GOGS_DEFAULT_REPO = "default/repo";
    const config = loadConfig({ repo: "cli/repo" });
    expect(config.repo).toBe("cli/repo");
  });

  it("reads --format flag from CLI opts", () => {
    process.env.GOGS_API_KEY = "test-key";
    const config = loadConfig({ format: "markdown" } as any);
    expect(config.format).toBe("markdown");
  });

  it("defaults format to json", () => {
    process.env.GOGS_API_KEY = "test-key";
    const config = loadConfig({});
    expect(config.format).toBe("json");
  });
});

describe("resolveRepo", () => {
  it("returns repo from --repo flag (highest priority)", () => {
    const config = { defaultRepo: "env/repo", baseUrl: "https://git.example.com/api/v1" } as any;
    expect(resolveRepo(config, "flag/repo")).toBe("flag/repo");
  });

  it("falls back to defaultRepo (GOGS_DEFAULT_REPO)", () => {
    const config = { defaultRepo: "env/repo", baseUrl: "https://git.example.com/api/v1" } as any;
    expect(resolveRepo(config, undefined)).toBe("env/repo");
  });

  it("falls back to git remote detection when no flag or env var", () => {
    mockedDetectRepo.mockReturnValue("git/repo");
    const config = { baseUrl: "https://git.example.com/api/v1" } as any;
    expect(resolveRepo(config, undefined)).toBe("git/repo");
    // Should pass the configured baseUrl for host cross-check
    expect(mockedDetectRepo).toHaveBeenCalledWith("https://git.example.com/api/v1");
  });

  it("--repo flag overrides both defaultRepo and git detection", () => {
    mockedDetectRepo.mockReturnValue("git/repo");
    const config = { defaultRepo: "env/repo", baseUrl: "https://git.example.com/api/v1" } as any;
    expect(resolveRepo(config, "flag/repo")).toBe("flag/repo");
  });

  it("throws ConfigError when all sources are empty", () => {
    mockedDetectRepo.mockReturnValue(undefined);
    const config = {} as any;
    expect(() => resolveRepo(config, undefined)).toThrow(
      "--repo <owner/repo> is required (or run inside a git clone with an origin remote)."
    );
  });
});
