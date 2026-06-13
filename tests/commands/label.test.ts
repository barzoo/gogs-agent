import { describe, it, expect, vi } from "vitest";
import { labelList, labelCreate } from "../../src/commands/label.js";
import type { GogsClient } from "../../src/client.js";
import type { Label } from "../../src/types.js";

const makeLabel = (id: number, name: string, color: string): Label => ({
  id, name, color,
});

describe("labelList", () => {
  it("calls GET /repos/{repo}/labels", async () => {
    const mockLabels: Label[] = [
      makeLabel(1, "bug", "#ee0701"),
      makeLabel(2, "enhancement", "#0052cc"),
    ];
    const mockClient: GogsClient = {
      request: vi.fn().mockResolvedValue({ ok: true, data: mockLabels }),
    };

    const result = await labelList(mockClient, { repo: "xing/test" });
    expect(mockClient.request).toHaveBeenCalledWith(
      "GET", "/repos/xing/test/labels"
    );
    expect(result).toEqual(mockLabels);
  });
});

describe("labelCreate", () => {
  it("calls POST /repos/{repo}/labels with name and color", async () => {
    const createdLabel = makeLabel(3, "test", "#0052cc");
    const mockClient: GogsClient = {
      request: vi.fn().mockResolvedValue({ ok: true, data: createdLabel }),
    };

    const result = await labelCreate(mockClient, {
      repo: "xing/test",
      name: "test",
      color: "#0052cc",
    });

    expect(mockClient.request).toHaveBeenCalledWith(
      "POST", "/repos/xing/test/labels",
      { body: { name: "test", color: "#0052cc" } }
    );
    expect(result).toEqual(createdLabel);
  });

  it("uses first preset color as default when color is omitted", async () => {
    const createdLabel = makeLabel(4, "new", "#0052cc");
    const mockClient: GogsClient = {
      request: vi.fn().mockResolvedValue({ ok: true, data: createdLabel }),
    };

    const result = await labelCreate(mockClient, {
      repo: "xing/test",
      name: "new",
    });

    expect(mockClient.request).toHaveBeenCalledWith(
      "POST", "/repos/xing/test/labels",
      { body: { name: "new", color: "#0052cc" } }
    );
    expect(result).toEqual(createdLabel);
  });
});
