import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { loadConfig, resolveRepo } from "../src/config.js";

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
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("throws ConfigError when GOGS_API_KEY is missing", () => {
    expect(() => loadConfig({})).toThrow(
      "GOGS_API_KEY is required. Set it in .env or as environment variable."
    );
  });

  it("reads GOGS_API_KEY from environment", () => {
    process.env.GOGS_API_KEY = "test-key";
    const config = loadConfig({});
    expect(config.apiKey).toBe("test-key");
  });

  it("reads GOGS_BASE_URL from environment", () => {
    process.env.GOGS_API_KEY = "test-key";
    process.env.GOGS_BASE_URL = "https://example.com/api/v1";
    const config = loadConfig({});
    expect(config.baseUrl).toBe("https://example.com/api/v1");
  });

  it("uses default baseUrl when not set", () => {
    process.env.GOGS_API_KEY = "test-key";
    const config = loadConfig({});
    expect(config.baseUrl).toBe("https://git.desiyi.com/api/v1");
  });

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
  it("returns repo from params if provided", () => {
    const config = { defaultRepo: "default/repo" } as any;
    expect(resolveRepo(config, "param/repo")).toBe("param/repo");
  });

  it("falls back to defaultRepo if params repo is undefined", () => {
    const config = { defaultRepo: "default/repo" } as any;
    expect(resolveRepo(config, undefined)).toBe("default/repo");
  });

  it("throws ConfigError if neither repo param nor defaultRepo is set", () => {
    const config = {} as any;
    expect(() => resolveRepo(config, undefined)).toThrow(
      "--repo <owner/repo> is required."
    );
  });
});
