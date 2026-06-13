import { describe, it, expect, vi } from "vitest";
import { issueList, issueGet, issueCreate, issueCloseReopen, issueUpdate } from "../../src/commands/issue.js";
import type { GogsClient } from "../../src/client.js";
import type { Issue, Label } from "../../src/types.js";

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
    const mockLabelsList: Label[] = [
      { id: 1, name: "bug", color: "#ee0701" },
      { id: 2, name: "urgent", color: "#d93f0b" },
    ];
    const mockClient: GogsClient = {
      request: vi.fn()
        .mockResolvedValueOnce({ ok: true, data: mockLabelsList })
        .mockResolvedValueOnce({ ok: true, data: makeMockIssue(101, "Full") }),
    };

    await issueCreate(mockClient, {
      repo: "xing/test",
      title: "Full",
      body: "Description",
      labels: "bug,urgent",
      assignee: "xing",
      milestone: 3,
    });

    expect(mockClient.request).toHaveBeenNthCalledWith(1,
      "GET", "/repos/xing/test/labels"
    );
    expect(mockClient.request).toHaveBeenNthCalledWith(2,
      "POST", "/repos/xing/test/issues",
      {
        body: {
          title: "Full",
          body: "Description",
          labels: [1, 2],
          assignee: "xing",
          milestone: 3,
        },
      }
    );
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

describe("issueUpdate", () => {
  it("updates title only", async () => {
    const updatedIssue = makeMockIssue(1, "New Title");
    const mockClient: GogsClient = {
      request: vi.fn().mockResolvedValue({ ok: true, data: updatedIssue }),
    };

    const result = await issueUpdate(mockClient, {
      repo: "xing/test", number: 1, title: "New Title",
    });

    expect(mockClient.request).toHaveBeenCalledWith(
      "PATCH", "/repos/xing/test/issues/1",
      { body: { title: "New Title" } }
    );
    expect(result).toEqual(updatedIssue);
  });

  it("updates body only", async () => {
    const updatedIssue = makeMockIssue(1, "Old", "open");
    const mockClient: GogsClient = {
      request: vi.fn().mockResolvedValue({ ok: true, data: updatedIssue }),
    };

    await issueUpdate(mockClient, {
      repo: "xing/test", number: 1, body: "New body text",
    });

    expect(mockClient.request).toHaveBeenCalledWith(
      "PATCH", "/repos/xing/test/issues/1",
      { body: { body: "New body text" } }
    );
  });

  it("updates state only", async () => {
    const updatedIssue = makeMockIssue(1, "Old", "closed");
    const mockClient: GogsClient = {
      request: vi.fn().mockResolvedValue({ ok: true, data: updatedIssue }),
    };

    await issueUpdate(mockClient, {
      repo: "xing/test", number: 1, state: "closed",
    });

    expect(mockClient.request).toHaveBeenCalledWith(
      "PATCH", "/repos/xing/test/issues/1",
      { body: { state: "closed" } }
    );
  });

  it("updates multiple fields at once", async () => {
    const updatedIssue = makeMockIssue(1, "New Title", "closed");
    const mockClient: GogsClient = {
      request: vi.fn().mockResolvedValue({ ok: true, data: updatedIssue }),
    };

    await issueUpdate(mockClient, {
      repo: "xing/test", number: 1,
      title: "New Title",
      state: "closed",
      assignee: "xing",
    });

    expect(mockClient.request).toHaveBeenCalledWith(
      "PATCH", "/repos/xing/test/issues/1",
      { body: { title: "New Title", state: "closed", assignee: "xing" } }
    );
  });

  it("updates with labels (resolves names to IDs)", async () => {
    const mockLabels: Label[] = [
      { id: 1, name: "bug", color: "#ee0701" },
      { id: 2, name: "urgent", color: "#d93f0b" },
    ];
    const updatedIssue = makeMockIssue(1, "Old");
    const mockClient: GogsClient = {
      request: vi.fn()
        .mockResolvedValueOnce({ ok: true, data: mockLabels })
        .mockResolvedValueOnce({ ok: true, data: updatedIssue }),
    };

    await issueUpdate(mockClient, {
      repo: "xing/test", number: 1, labels: "bug,urgent",
    });

    expect(mockClient.request).toHaveBeenNthCalledWith(1,
      "GET", "/repos/xing/test/labels"
    );
    expect(mockClient.request).toHaveBeenNthCalledWith(2,
      "PATCH", "/repos/xing/test/issues/1",
      { body: { labels: [1, 2] } }
    );
  });

  it("updates all fields at once", async () => {
    const mockLabels: Label[] = [{ id: 1, name: "bug", color: "#ee0701" }];
    const updatedIssue = makeMockIssue(1, "All Fields", "open");
    const mockClient: GogsClient = {
      request: vi.fn()
        .mockResolvedValueOnce({ ok: true, data: mockLabels })
        .mockResolvedValueOnce({ ok: true, data: updatedIssue }),
    };

    await issueUpdate(mockClient, {
      repo: "xing/test", number: 1,
      title: "All Fields",
      body: "New body",
      state: "open",
      assignee: "xing",
      milestone: 2,
      labels: "bug",
    });

    expect(mockClient.request).toHaveBeenNthCalledWith(2,
      "PATCH", "/repos/xing/test/issues/1",
      { body: { title: "All Fields", body: "New body", state: "open", assignee: "xing", milestone: 2, labels: [1] } }
    );
  });

  it("throws ValidationError when no fields provided", async () => {
    const mockClient: GogsClient = { request: vi.fn() };

    await expect(
      issueUpdate(mockClient, { repo: "xing/test", number: 1 })
    ).rejects.toThrow("At least one field to update is required");

    expect(mockClient.request).not.toHaveBeenCalled();
  });
});
