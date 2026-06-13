# Gogs Agent Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a TypeScript CLI tool (`gogs`) that enables Claude Code agents to operate Gogs repositories — issues, PRs, and comments — through structured commands.

**Architecture:** Single npm package. Commander.js CLI routes subcommands to pure command functions. A shared `GogsClient` wraps the Gogs REST API with auth, retries, and pagination. A build-time script auto-generates `skill.md` with JSON Schema tool definitions from CLI metadata, preventing drift.

**Tech Stack:** TypeScript 5.x, Node 18+ built-in `fetch`, Commander.js, dotenv, Vitest

**Source spec:** `docs/superpowers/specs/2026-06-13-gogs-agent-design.md`

---

### File Map

| File | Responsibility |
|------|---------------|
| `package.json` | Project metadata, scripts, dependencies |
| `tsconfig.json` | TypeScript compilation config |
| `src/types.ts` | All shared TypeScript interfaces and types |
| `src/errors.ts` | ConfigError, ValidationError, ApiError, NetworkError classes |
| `src/config.ts` | Config loader: CLI flags > env vars > .env > defaults |
| `src/client.ts` | GogsClient: HTTP wrapper with auth, retry, pagination |
| `src/formatters.ts` | Format results as JSON, markdown, or plain text |
| `src/commands/repo.ts` | repo info — pure function |
| `src/commands/issue.ts` | issue list, get, create, close, reopen — pure functions |
| `src/commands/comment.ts` | comment list, create — pure functions |
| `src/commands/pr.ts` | pr list, get, create, merge, diff — pure functions |
| `src/cli.ts` | Commander.js CLI entry point, wires commands to handlers |
| `scripts/generate-skill.ts` | Auto-generate skill.md from CLI metadata |
| `tests/config.test.ts` | Unit tests for config loader |
| `tests/client.test.ts` | Unit tests for client (mocked fetch) |
| `tests/formatters.test.ts` | Unit tests for formatters |
| `tests/commands/repo.test.ts` | Unit tests for repo command |
| `tests/commands/issue.test.ts` | Unit tests for issue commands |
| `tests/commands/comment.test.ts` | Unit tests for comment commands |
| `tests/commands/pr.test.ts` | Unit tests for PR commands |

---

### Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "gogs-agent",
  "version": "0.1.0",
  "description": "Claude Code Skill + CLI for operating Gogs repositories",
  "type": "module",
  "bin": {
    "gogs": "./dist/cli.js"
  },
  "scripts": {
    "build": "tsc && npm run generate-skill",
    "generate-skill": "tsx scripts/generate-skill.ts",
    "test": "vitest run",
    "test:watch": "vitest",
    "start": "node dist/cli.js"
  },
  "dependencies": {
    "commander": "^12.1.0",
    "dotenv": "^16.4.5"
  },
  "devDependencies": {
    "@types/node": "^20.14.0",
    "tsx": "^4.15.0",
    "typescript": "^5.5.0",
    "vitest": "^1.6.0"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "sourceMap": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist", "tests", "scripts"]
}
```

- [ ] **Step 3: Install dependencies and verify**

Run: `npm install`
Expected: Installs commander, dotenv, tsx, typescript, vitest, @types/node

- [ ] **Step 4: Commit**

```bash
git add package.json tsconfig.json package-lock.json .gitignore
git commit -m "chore: scaffold project with TypeScript, Commander, Vitest"
```

---

### Task 2: Core Types

**Files:**
- Create: `src/types.ts`

- [ ] **Step 1: Create `src/types.ts`**

```typescript
// ── Gogs API entity types ──

export interface User {
  id: number;
  login: string;
  full_name: string;
  avatar_url: string;
}

export interface Label {
  id: number;
  name: string;
  color: string;
}

export interface Milestone {
  id: number;
  title: string;
  state: string;
}

export interface Issue {
  id: number;
  number: number;
  title: string;
  body: string;
  state: "open" | "closed";
  labels: Label[];
  assignee: User | null;
  milestone: Milestone | null;
  created_at: string;
  updated_at: string;
  html_url: string;
}

export interface PullRequest {
  id: number;
  number: number;
  title: string;
  body: string;
  state: "open" | "closed";
  head: { label: string; ref: string; sha: string };
  base: { label: string; ref: string; sha: string };
  assignee: User | null;
  merged: boolean;
  merged_by: User | null;
  created_at: string;
  updated_at: string;
  html_url: string;
}

export interface Comment {
  id: number;
  body: string;
  user: User;
  created_at: string;
  updated_at: string;
}

export interface Repository {
  id: number;
  owner: User;
  name: string;
  full_name: string;
  description: string;
  private: boolean;
  html_url: string;
  clone_url: string;
  ssh_url: string;
  default_branch: string;
  created_at: string;
  updated_at: string;
}

// ── GogsClient types ──

export interface GogsClientConfig {
  baseUrl: string;
  apiKey: string;
  timeout: number;
}

export interface GogsRequestOpts {
  query?: Record<string, string | number>;
  body?: unknown;
}

export interface GogsResponse<T> {
  ok: boolean;
  data: T;
  pagination?: {
    total: number;
    page: number;
    pageSize: number;
  };
}

// ── Internal config type ──

export interface AppConfig {
  baseUrl: string;
  apiKey: string;
  defaultRepo?: string;
  verbose: boolean;
  timeout: number;
  format: "json" | "markdown" | "text";
  repo?: string;
}

// ── Command parameter types ──

export interface IssueListParams {
  repo: string;
  state?: "open" | "closed" | "all";
  labels?: string;
  limit?: number;
  page?: number;
}

export interface IssueGetParams {
  repo: string;
  number: number;
}

export interface IssueCreateParams {
  repo: string;
  title: string;
  body?: string;
  labels?: string;
  assignee?: string;
  milestone?: number;
}

export interface IssueCloseReopenParams {
  repo: string;
  number: number;
  action: "close" | "reopen";
}

export interface PrListParams {
  repo: string;
  state?: "open" | "closed" | "all";
  limit?: number;
  page?: number;
}

export interface PrGetParams {
  repo: string;
  number: number;
}

export interface PrCreateParams {
  repo: string;
  title: string;
  head: string;
  base: string;
  body?: string;
  assignee?: string;
}

export interface PrMergeParams {
  repo: string;
  number: number;
  strategy?: "merge" | "rebase" | "squash";
}

export interface PrDiffParams {
  repo: string;
  number: number;
  format?: "json" | "diff";
}

export interface CommentListParams {
  repo: string;
  type: "issue" | "pr";
  number: number;
}

export interface CommentCreateParams {
  repo: string;
  type: "issue" | "pr";
  number: number;
  body: string;
}

// ── Output type ──

export interface CliOutput {
  ok: boolean;
  data?: unknown;
  error?: string;
  code?: string;
  status?: number;
}
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat: add all shared TypeScript types and interfaces"
```

---

### Task 3: Error Classes

**Files:**
- Create: `src/errors.ts`

- [ ] **Step 1: Create `src/errors.ts`**

```typescript
export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class ApiError extends Error {
  public status: number;
  public body: string;

  constructor(message: string, status: number, body: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NetworkError";
  }
}
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/errors.ts
git commit -m "feat: add typed error classes with exit code semantics"
```

---

### Task 4: Configuration Loader

**Files:**
- Create: `src/config.ts`
- Create: `tests/config.test.ts`

- [ ] **Step 1: Create vitest config**

Add to `package.json`:
```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

Already in package.json from Task 1. Create `vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: false,
    include: ["tests/**/*.test.ts"],
  },
});
```

- [ ] **Step 2: Write failing tests for config loader**

Create `tests/config.test.ts`:

```typescript
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
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run tests/config.test.ts`
Expected: FAIL — `Cannot find module '../src/config.js'`

- [ ] **Step 4: Implement `src/config.ts`**

```typescript
import { ConfigError } from "./errors.js";
import type { AppConfig } from "./types.js";

export function loadConfig(cliOpts: {
  repo?: string;
  format?: "json" | "markdown" | "text";
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
    timeout: process.env.GOGS_TIMEOUT ? parseInt(process.env.GOGS_TIMEOUT, 10) : 30000,
    repo: cliOpts.repo,
    format: cliOpts.format || "json",
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
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/config.test.ts`
Expected: All 12 tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/config.ts tests/config.test.ts vitest.config.ts
git commit -m "feat: add config loader with priority chain and tests"
```

---

### Task 5: Gogs HTTP Client

**Files:**
- Create: `src/client.ts`
- Create: `tests/client.test.ts`

- [ ] **Step 1: Write failing tests for client**

Create `tests/client.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createGogsClient } from "../src/client.js";
import type { Issue } from "../src/types.js";

describe("createGogsClient", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("sends correct Authorization header", async () => {
    let capturedHeaders: HeadersInit | undefined;

    globalThis.fetch = vi.fn().mockImplementation(
      (_url: string | URL | Request, init?: RequestInit) => {
        capturedHeaders = init?.headers;
        return Promise.resolve(
          new Response(JSON.stringify([{ id: 1, number: 1, title: "test" }]), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        );
      }
    ) as any;

    const client = createGogsClient({ baseUrl: "https://example.com/api/v1", apiKey: "secret", timeout: 30000 });
    await client.request<Issue[]>("GET", "/repos/owner/repo/issues");

    expect(capturedHeaders).toBeDefined();
    const headers = capturedHeaders as Record<string, string>;
    expect(headers["Authorization"]).toBe("token secret");
    expect(headers["Content-Type"]).toBe("application/json");
  });

  it("constructs URL from baseUrl and path", async () => {
    let capturedUrl: string | undefined;

    globalThis.fetch = vi.fn().mockImplementation(
      (url: string | URL | Request, _init?: RequestInit) => {
        capturedUrl = url.toString();
        return Promise.resolve(
          new Response(JSON.stringify([]), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        );
      }
    ) as any;

    const client = createGogsClient({ baseUrl: "https://example.com/api/v1", apiKey: "key", timeout: 30000 });
    await client.request("GET", "/repos/owner/repo/issues");

    expect(capturedUrl).toBe("https://example.com/api/v1/repos/owner/repo/issues");
  });

  it("appends query parameters to URL", async () => {
    let capturedUrl: string | undefined;

    globalThis.fetch = vi.fn().mockImplementation(
      (url: string | URL | Request, _init?: RequestInit) => {
        capturedUrl = url.toString();
        return Promise.resolve(
          new Response(JSON.stringify([]), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        );
      }
    ) as any;

    const client = createGogsClient({ baseUrl: "https://example.com/api/v1", apiKey: "key", timeout: 30000 });
    await client.request("GET", "/repos/owner/repo/issues", {
      query: { state: "open", labels: "bug,urgent", limit: 20 },
    });

    expect(capturedUrl).toContain("state=open");
    expect(capturedUrl).toContain("labels=bug%2Curgent");
    expect(capturedUrl).toContain("limit=20");
  });

  it("sends body as JSON string", async () => {
    let capturedBody: string | undefined;

    globalThis.fetch = vi.fn().mockImplementation(
      (_url: string | URL | Request, init?: RequestInit) => {
        capturedBody = init?.body as string;
        return Promise.resolve(
          new Response(JSON.stringify({ id: 1, number: 1, title: "test" }), {
            status: 201,
            headers: { "Content-Type": "application/json" },
          })
        );
      }
    ) as any;

    const client = createGogsClient({ baseUrl: "https://example.com/api/v1", apiKey: "key", timeout: 30000 });
    await client.request("POST", "/repos/owner/repo/issues", {
      body: { title: "hello", body: "world" },
    });

    expect(JSON.parse(capturedBody!)).toEqual({ title: "hello", body: "world" });
  });

  it("parses pagination from X-Total and X-Page headers", async () => {
    globalThis.fetch = vi.fn().mockImplementation(
      (_url: string | URL | Request, _init?: RequestInit) => {
        return Promise.resolve(
          new Response(JSON.stringify([{ id: 1, number: 1 }]), {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "X-Total": "42",
              "X-Page": "2",
            },
          })
        );
      }
    ) as any;

    const client = createGogsClient({ baseUrl: "https://example.com/api/v1", apiKey: "key", timeout: 30000 });
    const result = await client.request("GET", "/repos/owner/repo/issues");

    expect(result.pagination).toEqual({ total: 42, page: 2, pageSize: 0 });
  });

  it("throws NetworkError on fetch failure", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("connect ECONNREFUSED"));

    const client = createGogsClient({ baseUrl: "https://example.com/api/v1", apiKey: "key", timeout: 30000 });
    await expect(
      client.request("GET", "/repos/owner/repo/issues")
    ).rejects.toThrow("Request to /repos/owner/repo/issues failed: connect ECONNREFUSED");
  });

  it("throws ApiError on non-2xx response", async () => {
    globalThis.fetch = vi.fn().mockImplementation(
      (_url: string | URL | Request, _init?: RequestInit) => {
        return Promise.resolve(
          new Response(JSON.stringify({ message: "Not Found" }), {
            status: 404,
            statusText: "Not Found",
          })
        );
      }
    ) as any;

    const client = createGogsClient({ baseUrl: "https://example.com/api/v1", apiKey: "key", timeout: 30000 });
    await expect(
      client.request("GET", "/repos/owner/repo/issues/999")
    ).rejects.toThrow(
      'Gogs API error: GET /repos/owner/repo/issues/999 returned 404'
    );
  });

  it("retries on 429 with exponential backoff, succeeds on 3rd try", async () => {
    let callCount = 0;
    globalThis.fetch = vi.fn().mockImplementation(
      (_url: string | URL | Request, _init?: RequestInit) => {
        callCount++;
        if (callCount < 3) {
          return Promise.resolve(
            new Response(JSON.stringify({ message: "Rate limited" }), { status: 429 })
          );
        }
        return Promise.resolve(
          new Response(JSON.stringify([{ id: 1, number: 1 }]), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        );
      }
    ) as any;

    // Silence the retry delay by mocking setTimeout
    vi.useFakeTimers();
    const client = createGogsClient({ baseUrl: "https://example.com/api/v1", apiKey: "key", timeout: 30000 });
    const promise = client.request("GET", "/repos/o/r/issues");
    await vi.runAllTimersAsync();
    vi.useRealTimers();

    const result = await promise;
    expect(callCount).toBe(3);
    expect(result.ok).toBe(true);
  });

  it("retries once on 5xx error", async () => {
    let callCount = 0;
    globalThis.fetch = vi.fn().mockImplementation(
      (_url: string | URL | Request, _init?: RequestInit) => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve(
            new Response("Server Error", { status: 502 })
          );
        }
        return Promise.resolve(
          new Response(JSON.stringify([{ id: 1, number: 1 }]), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        );
      }
    ) as any;

    vi.useFakeTimers();
    const client = createGogsClient({ baseUrl: "https://example.com/api/v1", apiKey: "key", timeout: 30000 });
    const promise = client.request("GET", "/repos/o/r/issues");
    await vi.runAllTimersAsync();
    vi.useRealTimers();

    const result = await promise;
    expect(callCount).toBe(2);
    expect(result.ok).toBe(true);
  });

  it("gives up after max retries on 429", async () => {
    globalThis.fetch = vi.fn().mockImplementation(
      (_url: string | URL | Request, _init?: RequestInit) => {
        return Promise.resolve(
          new Response("Rate limited", { status: 429 })
        );
      }
    ) as any;

    vi.useFakeTimers();
    const client = createGogsClient({ baseUrl: "https://example.com/api/v1", apiKey: "key", timeout: 30000 });
    const promise = client.request("GET", "/repos/o/r/issues");
    await vi.runAllTimersAsync();
    vi.useRealTimers();

    await expect(promise).rejects.toThrow(
      "Gogs API error: GET /repos/o/r/issues returned 429"
    );
  });

  it("does not retry on 4xx (except 429)", async () => {
    let callCount = 0;
    globalThis.fetch = vi.fn().mockImplementation(
      (_url: string | URL | Request, _init?: RequestInit) => {
        callCount++;
        return Promise.resolve(
          new Response(JSON.stringify({ message: "Not Found" }), { status: 404 })
        );
      }
    ) as any;

    const client = createGogsClient({ baseUrl: "https://example.com/api/v1", apiKey: "key", timeout: 30000 });
    await expect(
      client.request("GET", "/repos/o/r/issues/999")
    ).rejects.toThrow();

    expect(callCount).toBe(1); // No retry
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/client.test.ts`
Expected: FAIL — `Cannot find module '../src/client.js'`

- [ ] **Step 3: Implement `src/client.ts`**

```typescript
import { ApiError, NetworkError } from "./errors.js";
import type { GogsClientConfig, GogsRequestOpts, GogsResponse } from "./types.js";

export interface GogsClient {
  request<T>(
    method: string,
    path: string,
    opts?: GogsRequestOpts
  ): Promise<GogsResponse<T>>;
}

export function createGogsClient(config: GogsClientConfig): GogsClient {
  const { baseUrl, apiKey, timeout } = config;

  async function request<T>(
    method: string,
    path: string,
    opts?: GogsRequestOpts
  ): Promise<GogsResponse<T>> {
    let url = `${baseUrl}${path}`;
    if (opts?.query) {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(opts.query)) {
        params.append(key, String(value));
      }
      url += `?${params.toString()}`;
    }

    const headers: Record<string, string> = {
      "Authorization": `token ${apiKey}`,
      "Content-Type": "application/json",
    };

    const fetchOpts: RequestInit = {
      method,
      headers,
      signal: AbortSignal.timeout(timeout),
    };

    if (opts?.body && method !== "GET") {
      fetchOpts.body = JSON.stringify(opts.body);
    }

    let lastError: Error | null = null;
    let retryCount = 0;
    const maxRetries = method === "GET" ? 3 : 0; // Only retry idempotent GETs

    while (retryCount <= maxRetries) {
      let response: Response;
      try {
        response = await fetch(url, fetchOpts);
      } catch (err) {
        throw new NetworkError(
          `Request to ${path} failed: ${err instanceof Error ? err.message : String(err)}`
        );
      }

      // Success — return immediately
      if (response.ok) {
        const data = await response.json() as T;
        const total = response.headers.get("X-Total");
        const page = response.headers.get("X-Page");

        return {
          ok: true,
          data,
          pagination: total ? {
            total: parseInt(total, 10),
            page: page ? parseInt(page, 10) : 1,
            pageSize: 0,
          } : undefined,
        };
      }

      // Rate limited (429) — exponential backoff
      if (response.status === 429 && retryCount < maxRetries) {
        const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
        await new Promise(resolve => setTimeout(resolve, delay));
        retryCount++;
        continue;
      }

      // Server error (5xx) — single retry
      if (response.status >= 500 && retryCount < 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        retryCount++;
        continue;
      }

      // All other errors — no retry
      const bodyText = await response.text();
      throw new ApiError(
        `Gogs API error: ${method} ${path} returned ${response.status}`,
        response.status,
        bodyText
      );
    }

    // Should not reach here unless max retries exhausted on 429
    throw lastError || new ApiError(
      `Gogs API error: ${method} ${path} max retries exhausted`,
      429,
      ""
    );
  }

  return { request };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/client.test.ts`
Expected: All 6 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/client.ts tests/client.test.ts
git commit -m "feat: add GogsClient with auth, query params, pagination, retry, and tests"
```

---

### Task 6: Output Formatters

**Files:**
- Create: `src/formatters.ts`
- Create: `tests/formatters.test.ts`

- [ ] **Step 1: Write failing tests for formatters**

Create `tests/formatters.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { formatOutput } from "../src/formatters.js";

const sampleData = {
  id: 1,
  number: 42,
  title: "Fix login bug",
  state: "open",
  html_url: "https://git.desiyi.com/xing/repo/issues/42",
};

const sampleError = {
  ok: false,
  error: "Issue #42 not found",
  code: "API_ERROR",
  status: 404,
};

describe("formatOutput", () => {
  it("formats success as JSON by default", () => {
    const result = formatOutput(true, sampleData, "json");
    const parsed = JSON.parse(result);
    expect(parsed).toEqual({ ok: true, data: sampleData });
  });

  it("formats error as JSON", () => {
    const result = formatOutput(false, sampleError as any, "json");
    const parsed = JSON.parse(result);
    expect(parsed).toEqual(sampleError);
  });

  it("formats success as markdown", () => {
    const result = formatOutput(true, sampleData, "markdown");
    expect(result).toContain("**Status**: ✅ Success");
    expect(result).toContain("[#42](https://git.desiyi.com/xing/repo/issues/42)");
  });

  it("formats error as markdown", () => {
    const result = formatOutput(false, sampleError as any, "markdown");
    expect(result).toContain("**Error**: Issue #42 not found");
    expect(result).toContain("- **Code**: API_ERROR");
    expect(result).toContain("- **HTTP Status**: 404");
    expect(result).toContain("**Status**: ❌ Failed");
  });

  it("formats success as plain text", () => {
    const result = formatOutput(true, sampleData, "text");
    expect(result).toBe(JSON.stringify({ ok: true, data: sampleData }, null, 2));
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/formatters.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `src/formatters.ts`**

```typescript
import type { CliOutput } from "./types.js";

export function formatOutput(
  ok: boolean,
  dataOrError: unknown,
  format: "json" | "markdown" | "text"
): string {
  if (format === "markdown") {
    return formatMarkdown(ok, dataOrError);
  }
  if (format === "text") {
    return JSON.stringify({ ok, ...(dataOrError as object) }, null, 2);
  }
  // json
  return JSON.stringify({ ok, ...(dataOrError as object) });
}

function formatMarkdown(ok: boolean, payload: unknown): string {
  if (ok) {
    const data = payload as Record<string, unknown>;
    let md = `**Status**: ✅ Success\n\n`;

    // Format entities for human readability
    if (typeof data === "object" && data !== null) {
      if ("html_url" in data && "title" in data && "number" in data) {
        md += `[#${data["number"]}](${data["html_url"]}) — **${data["title"]}**\n`;
      }
      if ("state" in data) {
        md += `- **State**: ${data["state"]}\n`;
      }
      if ("body" in data && data["body"]) {
        md += `\n${data["body"]}\n`;
      }
    }

    md += `\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``;
    return md;
  } else {
    const err = payload as CliOutput;
    let md = `**Status**: ❌ Failed\n\n`;
    md += `**Error**: ${err.error}\n`;
    if (err.code) md += `- **Code**: ${err.code}\n`;
    if (err.status) md += `- **HTTP Status**: ${err.status}\n`;
    return md;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/formatters.test.ts`
Expected: All 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/formatters.ts tests/formatters.test.ts
git commit -m "feat: add output formatters for JSON, markdown, text with tests"
```

---

### Task 7: Repo Command

**Files:**
- Create: `src/commands/repo.ts`
- Create: `tests/commands/repo.test.ts`

- [ ] **Step 1: Write failing tests for repo info**

Create `tests/commands/repo.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { repoInfo } from "../../src/commands/repo.js";
import type { GogsClient } from "../../src/client.js";
import type { Repository } from "../../src/types.js";

describe("repoInfo", () => {
  it("calls GET /repos/{owner}/{repo} and returns repository", async () => {
    const mockRepo: Repository = {
      id: 1,
      owner: { id: 1, login: "xing", full_name: "Xing", avatar_url: "" },
      name: "ctrlx-AI-Agent",
      full_name: "xing/ctrlx-AI-Agent",
      description: "Test repo",
      private: false,
      html_url: "https://git.desiyi.com/xing/ctrlx-AI-Agent",
      clone_url: "https://git.desiyi.com/xing/ctrlx-AI-Agent.git",
      ssh_url: "",
      default_branch: "main",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    };

    const mockClient: GogsClient = {
      request: vi.fn().mockResolvedValue({ ok: true, data: mockRepo }),
    };

    const result = await repoInfo(mockClient, { repo: "xing/ctrlx-AI-Agent" });
    expect(mockClient.request).toHaveBeenCalledWith(
      "GET",
      "/repos/xing/ctrlx-AI-Agent"
    );
    expect(result).toEqual(mockRepo);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/commands/repo.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `src/commands/repo.ts`**

```typescript
import type { GogsClient } from "../client.js";
import type { Repository } from "../types.js";

export interface RepoInfoParams {
  repo: string;
}

export async function repoInfo(
  client: GogsClient,
  params: RepoInfoParams
): Promise<Repository> {
  const res = await client.request<Repository>(
    "GET",
    `/repos/${params.repo}`
  );
  return res.data;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/commands/repo.test.ts`
Expected: 1 test PASS

- [ ] **Step 5: Commit**

```bash
git add src/commands/repo.ts tests/commands/repo.test.ts
git commit -m "feat: add repo info command with unit test"
```

---

### Task 8: Issue Commands

**Files:**
- Create: `src/commands/issue.ts`
- Create: `tests/commands/issue.test.ts`

- [ ] **Step 1: Write failing tests for issue commands**

Create `tests/commands/issue.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { issueList, issueGet, issueCreate, issueCloseReopen } from "../../src/commands/issue.js";
import type { GogsClient } from "../../src/client.js";
import type { Issue } from "../../src/types.js";

const makeMockIssue = (n: number, title: string, state: "open" | "closed" = "open"): Issue => ({
  id: n, number: n, title, body: "", state,
  labels: [], assignee: null, milestone: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  html_url: `https://git.desiyi.com/xing/test/issues/${n}`,
});

describe("issueList", () => {
  it("calls GET /repos/{repo}/issues with no query params by default", async () => {
    const mockIssues = [makeMockIssue(1, "First")];
    const mockClient: GogsClient = {
      request: vi.fn().mockResolvedValue({ ok: true, data: mockIssues }),
    };

    const result = await issueList(mockClient, { repo: "xing/test" });
    expect(mockClient.request).toHaveBeenCalledWith("GET", "/repos/xing/test/issues", { query: {} });
    expect(result).toEqual(mockIssues);
  });

  it("passes state, labels, limit, page as query params", async () => {
    const mockClient: GogsClient = {
      request: vi.fn().mockResolvedValue({ ok: true, data: [] }),
    };

    await issueList(mockClient, {
      repo: "xing/test",
      state: "closed",
      labels: "bug,urgent",
      limit: 10,
      page: 2,
    });

    expect(mockClient.request).toHaveBeenCalledWith("GET", "/repos/xing/test/issues", {
      query: { state: "closed", labels: "bug,urgent", limit: 10, page: 2 },
    });
  });
});

describe("issueGet", () => {
  it("calls GET /repos/{repo}/issues/{number}", async () => {
    const mockIssue = makeMockIssue(42, "Answer");
    const mockClient: GogsClient = {
      request: vi.fn().mockResolvedValue({ ok: true, data: mockIssue }),
    };

    const result = await issueGet(mockClient, { repo: "xing/test", number: 42 });
    expect(mockClient.request).toHaveBeenCalledWith("GET", "/repos/xing/test/issues/42");
    expect(result).toEqual(mockIssue);
  });
});

describe("issueCreate", () => {
  it("calls POST /repos/{repo}/issues with required fields", async () => {
    const mockIssue = makeMockIssue(100, "New bug");
    const mockClient: GogsClient = {
      request: vi.fn().mockResolvedValue({ ok: true, data: mockIssue }),
    };

    const result = await issueCreate(mockClient, {
      repo: "xing/test",
      title: "New bug",
    });

    expect(mockClient.request).toHaveBeenCalledWith("POST", "/repos/xing/test/issues", {
      body: { title: "New bug" },
    });
    expect(result).toEqual(mockIssue);
  });

  it("includes optional body, labels, assignee, milestone", async () => {
    const mockClient: GogsClient = {
      request: vi.fn().mockResolvedValue({ ok: true, data: makeMockIssue(101, "Full") }),
    };

    await issueCreate(mockClient, {
      repo: "xing/test",
      title: "Full",
      body: "Description",
      labels: "bug,urgent",
      assignee: "xing",
      milestone: 3,
    });

    expect(mockClient.request).toHaveBeenCalledWith("POST", "/repos/xing/test/issues", {
      body: {
        title: "Full",
        body: "Description",
        labels: "bug,urgent",
        assignee: "xing",
        milestone: 3,
      },
    });
  });
});

describe("issueCloseReopen", () => {
  it("calls PATCH to close an issue", async () => {
    const mockIssue = makeMockIssue(1, "Done", "closed");
    const mockClient: GogsClient = {
      request: vi.fn().mockResolvedValue({ ok: true, data: mockIssue }),
    };

    const result = await issueCloseReopen(mockClient, { repo: "xing/test", number: 1, action: "close" });
    expect(mockClient.request).toHaveBeenCalledWith("PATCH", "/repos/xing/test/issues/1", {
      body: { state: "closed" },
    });
    expect(result.state).toBe("closed");
  });

  it("calls PATCH to reopen an issue", async () => {
    const mockIssue = makeMockIssue(1, "Reopened", "open");
    const mockClient: GogsClient = {
      request: vi.fn().mockResolvedValue({ ok: true, data: mockIssue }),
    };

    const result = await issueCloseReopen(mockClient, { repo: "xing/test", number: 1, action: "reopen" });
    expect(mockClient.request).toHaveBeenCalledWith("PATCH", "/repos/xing/test/issues/1", {
      body: { state: "open" },
    });
    expect(result.state).toBe("open");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/commands/issue.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `src/commands/issue.ts`**

```typescript
import type { GogsClient } from "../client.js";
import type {
  Issue,
  IssueListParams,
  IssueGetParams,
  IssueCreateParams,
  IssueCloseReopenParams,
} from "../types.js";

export async function issueList(
  client: GogsClient,
  params: IssueListParams
): Promise<Issue[]> {
  const query: Record<string, string | number> = {};
  if (params.state) query.state = params.state;
  if (params.labels) query.labels = params.labels;
  if (params.limit) query.limit = params.limit;
  if (params.page) query.page = params.page;

  const res = await client.request<Issue[]>(
    "GET",
    `/repos/${params.repo}/issues`,
    { query }
  );
  return res.data;
}

export async function issueGet(
  client: GogsClient,
  params: IssueGetParams
): Promise<Issue> {
  const res = await client.request<Issue>(
    "GET",
    `/repos/${params.repo}/issues/${params.number}`
  );
  return res.data;
}

export async function issueCreate(
  client: GogsClient,
  params: IssueCreateParams
): Promise<Issue> {
  const body: Record<string, unknown> = { title: params.title };
  if (params.body) body.body = params.body;
  if (params.labels) body.labels = params.labels;
  if (params.assignee) body.assignee = params.assignee;
  if (params.milestone) body.milestone = params.milestone;

  const res = await client.request<Issue>(
    "POST",
    `/repos/${params.repo}/issues`,
    { body }
  );
  return res.data;
}

export async function issueCloseReopen(
  client: GogsClient,
  params: IssueCloseReopenParams
): Promise<Issue> {
  const res = await client.request<Issue>(
    "PATCH",
    `/repos/${params.repo}/issues/${params.number}`,
    { body: { state: params.action === "close" ? "closed" : "open" } }
  );
  return res.data;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/commands/issue.test.ts`
Expected: All 6 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/commands/issue.ts tests/commands/issue.test.ts
git commit -m "feat: add issue list, get, create, close, reopen commands with tests"
```

---

### Task 9: Comment Commands

**Files:**
- Create: `src/commands/comment.ts`
- Create: `tests/commands/comment.test.ts`

- [ ] **Step 1: Write failing tests for comment commands**

Create `tests/commands/comment.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { commentList, commentCreate } from "../../src/commands/comment.js";
import type { GogsClient } from "../../src/client.js";
import type { Comment } from "../../src/types.js";

const makeMockComment = (id: number, body: string): Comment => ({
  id,
  body,
  user: { id: 1, login: "xing", full_name: "Xing", avatar_url: "" },
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
});

describe("commentList", () => {
  it("calls GET /repos/{repo}/issues/{number}/comments for an issue", async () => {
    const mockComments = [makeMockComment(1, "Looks good")];
    const mockClient: GogsClient = {
      request: vi.fn().mockResolvedValue({ ok: true, data: mockComments }),
    };

    const result = await commentList(mockClient, { repo: "xing/test", type: "issue", number: 42 });
    expect(mockClient.request).toHaveBeenCalledWith(
      "GET",
      "/repos/xing/test/issues/42/comments"
    );
    expect(result).toEqual(mockComments);
  });

  it("calls same endpoint for PR comments (Gogs models PRs as issues)", async () => {
    const mockClient: GogsClient = {
      request: vi.fn().mockResolvedValue({ ok: true, data: [] }),
    };

    await commentList(mockClient, { repo: "xing/test", type: "pr", number: 5 });
    expect(mockClient.request).toHaveBeenCalledWith(
      "GET",
      "/repos/xing/test/issues/5/comments"
    );
  });
});

describe("commentCreate", () => {
  it("calls POST /repos/{repo}/issues/{number}/comments with body", async () => {
    const mockComment = makeMockComment(2, "Nice work!");
    const mockClient: GogsClient = {
      request: vi.fn().mockResolvedValue({ ok: true, data: mockComment }),
    };

    const result = await commentCreate(mockClient, {
      repo: "xing/test",
      type: "pr",
      number: 5,
      body: "Nice work!",
    });

    expect(mockClient.request).toHaveBeenCalledWith(
      "POST",
      "/repos/xing/test/issues/5/comments",
      { body: { body: "Nice work!" } }
    );
    expect(result).toEqual(mockComment);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/commands/comment.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `src/commands/comment.ts`**

```typescript
import type { GogsClient } from "../client.js";
import type { Comment, CommentListParams, CommentCreateParams } from "../types.js";

export async function commentList(
  client: GogsClient,
  params: CommentListParams
): Promise<Comment[]> {
  // Gogs uses the same endpoint for both issues and PRs
  const res = await client.request<Comment[]>(
    "GET",
    `/repos/${params.repo}/issues/${params.number}/comments`
  );
  return res.data;
}

export async function commentCreate(
  client: GogsClient,
  params: CommentCreateParams
): Promise<Comment> {
  const res = await client.request<Comment>(
    "POST",
    `/repos/${params.repo}/issues/${params.number}/comments`,
    { body: { body: params.body } }
  );
  return res.data;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/commands/comment.test.ts`
Expected: All 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/commands/comment.ts tests/commands/comment.test.ts
git commit -m "feat: add comment list and create commands with tests"
```

---

### Task 10: PR Commands

**Files:**
- Create: `src/commands/pr.ts`
- Create: `tests/commands/pr.test.ts`

- [ ] **Step 1: Write failing tests for PR commands**

Create `tests/commands/pr.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { prList, prGet, prCreate, prMerge, prDiff } from "../../src/commands/pr.js";
import type { GogsClient } from "../../src/client.js";
import type { PullRequest } from "../../src/types.js";

const makeMockPR = (n: number, title: string, state: "open" | "closed" = "open"): PullRequest => ({
  id: n, number: n, title, body: "", state,
  head: { label: "fix", ref: "fix-branch", sha: "abc123" },
  base: { label: "", ref: "main", sha: "def456" },
  assignee: null,
  merged: false,
  merged_by: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  html_url: `https://git.desiyi.com/xing/test/pulls/${n}`,
});

const makeMergedPR = (n: number): PullRequest => ({
  ...makeMockPR(n, "Merged", "closed"),
  merged: true,
  merged_by: { id: 1, login: "xing", full_name: "Xing", avatar_url: "" },
});

describe("prList", () => {
  it("calls GET /repos/{repo}/pulls with no query params by default", async () => {
    const mockList = [makeMockPR(1, "First PR")];
    const mockClient: GogsClient = {
      request: vi.fn().mockResolvedValue({ ok: true, data: mockList }),
    };

    const result = await prList(mockClient, { repo: "xing/test" });
    expect(mockClient.request).toHaveBeenCalledWith("GET", "/repos/xing/test/pulls", { query: {} });
    expect(result).toEqual(mockList);
  });

  it("passes state, limit, page as query params", async () => {
    const mockClient: GogsClient = {
      request: vi.fn().mockResolvedValue({ ok: true, data: [] }),
    };

    await prList(mockClient, { repo: "xing/test", state: "closed", limit: 5, page: 3 });
    expect(mockClient.request).toHaveBeenCalledWith("GET", "/repos/xing/test/pulls", {
      query: { state: "closed", limit: 5, page: 3 },
    });
  });
});

describe("prGet", () => {
  it("calls GET /repos/{repo}/pulls/{number}", async () => {
    const mockPR = makeMockPR(1, "A PR");
    const mockClient: GogsClient = {
      request: vi.fn().mockResolvedValue({ ok: true, data: mockPR }),
    };

    const result = await prGet(mockClient, { repo: "xing/test", number: 1 });
    expect(mockClient.request).toHaveBeenCalledWith("GET", "/repos/xing/test/pulls/1");
    expect(result).toEqual(mockPR);
  });
});

describe("prCreate", () => {
  it("calls POST /repos/{repo}/pulls with required fields", async () => {
    const mockPR = makeMockPR(10, "New feature");
    const mockClient: GogsClient = {
      request: vi.fn().mockResolvedValue({ ok: true, data: mockPR }),
    };

    const result = await prCreate(mockClient, {
      repo: "xing/test",
      title: "New feature",
      head: "feature-branch",
      base: "main",
    });

    expect(mockClient.request).toHaveBeenCalledWith("POST", "/repos/xing/test/pulls", {
      body: { title: "New feature", head: "feature-branch", base: "main" },
    });
    expect(result).toEqual(mockPR);
  });

  it("includes optional body and assignee", async () => {
    const mockClient: GogsClient = {
      request: vi.fn().mockResolvedValue({ ok: true, data: makeMockPR(11, "Full") }),
    };

    await prCreate(mockClient, {
      repo: "xing/test",
      title: "Full",
      head: "fix",
      base: "main",
      body: "Fixes the thing",
      assignee: "xing",
    });

    expect(mockClient.request).toHaveBeenCalledWith("POST", "/repos/xing/test/pulls", {
      body: {
        title: "Full",
        head: "fix",
        base: "main",
        body: "Fixes the thing",
        assignee: "xing",
      },
    });
  });
});

describe("prMerge", () => {
  it("calls POST /repos/{repo}/pulls/{number}/merge", async () => {
    const mockPR = makeMergedPR(1);
    const mockClient: GogsClient = {
      request: vi.fn().mockResolvedValue({ ok: true, data: mockPR }),
    };

    const result = await prMerge(mockClient, { repo: "xing/test", number: 1 });
    expect(mockClient.request).toHaveBeenCalledWith(
      "POST",
      "/repos/xing/test/pulls/1/merge",
      { body: { Do: "merge" } }
    );
    expect(result.merged).toBe(true);
  });

  it("passes merge strategy", async () => {
    const mockClient: GogsClient = {
      request: vi.fn().mockResolvedValue({ ok: true, data: makeMergedPR(1) }),
    };

    await prMerge(mockClient, { repo: "xing/test", number: 1, strategy: "squash" });
    expect(mockClient.request).toHaveBeenCalledWith(
      "POST",
      "/repos/xing/test/pulls/1/merge",
      { body: { Do: "squash" } }
    );
  });
});

describe("prDiff", () => {
  it("calls GET .../pulls/{number}.diff and returns raw diff string", async () => {
    const diffText = "diff --git a/file b/file\n+added line";
    const mockClient: GogsClient = {
      request: vi.fn().mockResolvedValue({ ok: true, data: diffText }),
    };

    const result = await prDiff(mockClient, { repo: "xing/test", number: 1 });
    expect(mockClient.request).toHaveBeenCalledWith(
      "GET",
      "/repos/xing/test/pulls/1.diff"
    );
    expect(result).toBe(diffText);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/commands/pr.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `src/commands/pr.ts`**

```typescript
import type { GogsClient } from "../client.js";
import type {
  PullRequest,
  PrListParams,
  PrGetParams,
  PrCreateParams,
  PrMergeParams,
  PrDiffParams,
} from "../types.js";

export async function prList(
  client: GogsClient,
  params: PrListParams
): Promise<PullRequest[]> {
  const query: Record<string, string | number> = {};
  if (params.state) query.state = params.state;
  if (params.limit) query.limit = params.limit;
  if (params.page) query.page = params.page;

  const res = await client.request<PullRequest[]>(
    "GET",
    `/repos/${params.repo}/pulls`,
    { query }
  );
  return res.data;
}

export async function prGet(
  client: GogsClient,
  params: PrGetParams
): Promise<PullRequest> {
  const res = await client.request<PullRequest>(
    "GET",
    `/repos/${params.repo}/pulls/${params.number}`
  );
  return res.data;
}

export async function prCreate(
  client: GogsClient,
  params: PrCreateParams
): Promise<PullRequest> {
  const body: Record<string, unknown> = {
    title: params.title,
    head: params.head,
    base: params.base,
  };
  if (params.body) body.body = params.body;
  if (params.assignee) body.assignee = params.assignee;

  const res = await client.request<PullRequest>(
    "POST",
    `/repos/${params.repo}/pulls`,
    { body }
  );
  return res.data;
}

export async function prMerge(
  client: GogsClient,
  params: PrMergeParams
): Promise<PullRequest> {
  const res = await client.request<PullRequest>(
    "POST",
    `/repos/${params.repo}/pulls/${params.number}/merge`,
    { body: { Do: params.strategy || "merge" } }
  );
  return res.data;
}

export async function prDiff(
  client: GogsClient,
  params: PrDiffParams
): Promise<string> {
  const res = await client.request<string>(
    "GET",
    `/repos/${params.repo}/pulls/${params.number}.diff`
  );
  return res.data;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/commands/pr.test.ts`
Expected: All 7 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/commands/pr.ts tests/commands/pr.test.ts
git commit -m "feat: add pr list, get, create, merge, diff commands with tests"
```

---

### Task 11: CLI Entry Point

**Files:**
- Create: `src/cli.ts`

- [ ] **Step 1: Implement `src/cli.ts`**

```typescript
#!/usr/bin/env node
import "dotenv/config";
import { Command } from "commander";
import { loadConfig, resolveRepo } from "./config.js";
import { createGogsClient } from "./client.js";
import { formatOutput } from "./formatters.js";
import { repoInfo } from "./commands/repo.js";
import { issueList, issueGet, issueCreate, issueCloseReopen } from "./commands/issue.js";
import { prList, prGet, prCreate, prMerge, prDiff } from "./commands/pr.js";
import { commentList, commentCreate } from "./commands/comment.js";
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

program
  .command("issue")
  .description("Issue operations");

program.commands.find(c => c.name() === "issue")!
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

program.commands.find(c => c.name() === "issue")!
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

program.commands.find(c => c.name() === "issue")!
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

program.commands.find(c => c.name() === "issue")!
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

program.commands.find(c => c.name() === "issue")!
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

// ── PR commands ──

program
  .command("pr")
  .description("Pull request operations");

program.commands.find(c => c.name() === "pr")!
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

program.commands.find(c => c.name() === "pr")!
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

program.commands.find(c => c.name() === "pr")!
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

program.commands.find(c => c.name() === "pr")!
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

program.commands.find(c => c.name() === "pr")!
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

program
  .command("repo")
  .description("Repository operations");

program.commands.find(c => c.name() === "repo")!
  .command("info")
  .description("Get repository information")
  .action(async (options) => {
    await run(async (config, client) => {
      const repo = resolveRepo(config, config.repo);
      const result = await repoInfo(client, { repo });
      console.log(formatOutput(true, result, config.format));
    });
  });

// ── Comment commands ──

program
  .command("comment")
  .description("Comment operations on issues and pull requests");

program.commands.find(c => c.name() === "comment")!
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

program.commands.find(c => c.name() === "comment")!
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
    // Unexpected error
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
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Full build**

Run: `npx tsc`
Expected: Compiles cleanly, produces `dist/cli.js`

- [ ] **Step 4: Quick smoke test (dry-run with no args)**

Run: `node dist/cli.js --help`
Expected: Prints help text with issue, pr, repo, comment subcommands

- [ ] **Step 5: Commit**

```bash
git add src/cli.ts
git commit -m "feat: add CLI entry point with all Phase 1 commands wired"
```

---

### Task 12: Skill Generator

**Files:**
- Create: `scripts/generate-skill.ts`
- Create: `skill.md` (auto-generated output)

- [ ] **Step 1: Implement `scripts/generate-skill.ts`**

```typescript
/**
 * Auto-generates skill.md from CLI metadata.
 * Reads the Commander program definition and produces Claude Code tool schemas.
 */
import { Command } from "commander";
import { writeFileSync } from "fs";

// Mirror CLI definition minimally for generation
const program = new Command();
program.name("gogs").description("CLI tool for operating Gogs repositories").version("0.1.0");

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

function commanderToJsonSchemaType(cmdType: string): string {
  // Commander: value is parsed as string unless a custom parser is set
  // We treat parseInt options as "integer", others as "string"
  return "string"; // Simplified for Phase 1 — all inputs are strings
}

function buildTools(): ToolDef[] {
  const tools: ToolDef[] = [];

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

      for (const opt of actionCmd.options) {
        const name = opt.long!.replace(/^--/, "");
        const type = name.includes("number") || name.includes("limit") || name.includes("page") || name.includes("milestone")
          ? "integer"
          : "string";

        properties[name] = {
          type,
          description: opt.description,
        };

        if (opt.required) {
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

const skillMarkdown = `# Gogs Agent Skill

Operate Gogs repositories directly from Claude Code — create and manage issues, pull requests, and comments.

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
`;

writeFileSync("skill.md", skillMarkdown);
console.log("Generated skill.md with", tools.length, "tools");
```

- [ ] **Step 2: Run generator**

Run: `npx tsx scripts/generate-skill.ts`
Expected: `Generated skill.md with 13 tools`

- [ ] **Step 3: Verify skill.md was created**

Run: `node -e "const fs = require('fs'); const content = fs.readFileSync('skill.md', 'utf-8'); console.log('File size:', content.length, 'chars'); console.log('Contains tools:', content.includes('gogs_issue_create') && content.includes('gogs_pr_merge') && content.includes('gogs_repo_info'))"`
Expected: File size > 0, Contains tools: true

- [ ] **Step 4: Commit**

```bash
git add scripts/generate-skill.ts skill.md
git commit -m "feat: add skill generator script and generated skill.md"
```

---

### Task 13: Run All Tests & Final Verification

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run`
Expected: All tests PASS (config: 12, client: 6, formatters: 5, repo: 1, issue: 6, comment: 3, pr: 7 = ~40 tests)

- [ ] **Step 2: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Full build**

Run: `npm run build`
Expected: Compiles + generates skill.md

- [ ] **Step 4: Smoke test against real Gogs API (if configured)**

Run:
```
node dist/cli.js repo info --repo xing/ctrlx-AI-Agent --format json
```
Expected: JSON with repo metadata, exit 0

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: add final test and verification results"
```

---

### Summary

**Total tasks:** 13
**Total files created:** ~22 (source + test + config)
**Phase 1 commands:** 13 (issue × 5, pr × 5, repo × 1, comment × 2)
**Tests:** ~44 unit tests across 7 test files (config: 12, client: 10, formatters: 5, repo: 1, issue: 6, comment: 3, pr: 7)

### Spec Coverage Check

| Spec Requirement | Task(s) |
|-----------------|---------|
| Types & interfaces | Task 2 |
| Error classes | Task 3 |
| Config loader with priority | Task 4 |
| GogsClient with auth, retry, pagination | Task 5 |
| Output formatters (json/markdown/text) | Task 6 |
| repo info command | Task 7 |
| issue list/get/create/close/reopen | Task 8 |
| comment list/create | Task 9 |
| pr list/get/create/merge/diff | Task 10 |
| CLI entry point | Task 11 |
| Auto-generated skill.md | Task 12 |
| Output contract (JSON stdout) | Tasks 6, 11 |
| Error handling (exit codes) | Task 11 |
| .env support | Task 4 |
| Zero runtime deps beyond stdlib | Task 1 (only commander + dotenv runtime) |
| Node 18+ fetch | Task 5 |
