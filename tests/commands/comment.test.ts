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
