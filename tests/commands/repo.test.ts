import { describe, it, expect, vi } from "vitest";
import { repoInfo, repoCreate } from "../../src/commands/repo.js";
import type { GogsClient } from "../../src/client.js";
import type { Repository } from "../../src/types.js";

function mockRepo(overrides: Partial<Repository> = {}): Repository {
  return {
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
    ...overrides,
  };
}

describe("repoInfo", () => {
  it("calls GET /repos/{owner}/{repo} and returns repository", async () => {
    const repo = mockRepo();
    const mockClient: GogsClient = {
      request: vi.fn().mockResolvedValue({ ok: true, data: repo }),
    };

    const result = await repoInfo(mockClient, { repo: "xing/ctrlx-AI-Agent" });
    expect(mockClient.request).toHaveBeenCalledWith(
      "GET",
      "/repos/xing/ctrlx-AI-Agent"
    );
    expect(result).toEqual(repo);
  });
});

describe("repoCreate", () => {
  it.each([
    {
      params: { name: "new-repo" },
      expectedBody: { name: "new-repo", auto_init: true },
    },
    {
      params: { name: "private-repo", description: "Secret stuff", private: true },
      expectedBody: { name: "private-repo", description: "Secret stuff", private: true, auto_init: true },
    },
  ])("calls POST /user/repos with $params.name", async ({ params, expectedBody }) => {
    const repo = mockRepo({ name: params.name, full_name: `xing/${params.name}` });
    const mockClient: GogsClient = {
      request: vi.fn().mockResolvedValue({ ok: true, data: repo }),
    };

    const result = await repoCreate(mockClient, params);
    expect(mockClient.request).toHaveBeenCalledWith("POST", "/user/repos", { body: expectedBody });
    expect(result).toEqual(repo);
  });
});
