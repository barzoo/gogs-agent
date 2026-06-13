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
