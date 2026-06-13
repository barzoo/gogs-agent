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
