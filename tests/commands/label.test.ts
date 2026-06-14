import { describe, it, expect, vi } from "vitest";
import { labelList, labelGet, labelCreate, labelUpdate, labelDelete } from "../../src/commands/label.js";
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

describe("labelGet", () => {
  it("calls GET /repos/{repo}/labels/{id}", async () => {
    const mockLabel = makeLabel(1, "bug", "#ee0701");
    const mockClient: GogsClient = {
      request: vi.fn().mockResolvedValue({ ok: true, data: mockLabel }),
    };

    const result = await labelGet(mockClient, { repo: "xing/test", id: 1 });
    expect(mockClient.request).toHaveBeenCalledWith(
      "GET", "/repos/xing/test/labels/1"
    );
    expect(result).toEqual(mockLabel);
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

describe("labelUpdate", () => {
  it("calls PATCH /repos/{repo}/labels/{id} with new name", async () => {
    const updatedLabel = makeLabel(1, "bugfix", "#ee0701");
    const mockClient: GogsClient = {
      request: vi.fn().mockResolvedValue({ ok: true, data: updatedLabel }),
    };

    const result = await labelUpdate(mockClient, {
      repo: "xing/test",
      id: 1,
      name: "bugfix",
    });

    expect(mockClient.request).toHaveBeenCalledWith(
      "PATCH", "/repos/xing/test/labels/1",
      { body: { name: "bugfix" } }
    );
    expect(result).toEqual(updatedLabel);
  });

  it("calls PATCH with new color", async () => {
    const updatedLabel = makeLabel(1, "bug", "#ff0000");
    const mockClient: GogsClient = {
      request: vi.fn().mockResolvedValue({ ok: true, data: updatedLabel }),
    };

    const result = await labelUpdate(mockClient, {
      repo: "xing/test",
      id: 1,
      color: "#ff0000",
    });

    expect(mockClient.request).toHaveBeenCalledWith(
      "PATCH", "/repos/xing/test/labels/1",
      { body: { color: "#ff0000" } }
    );
    expect(result).toEqual(updatedLabel);
  });

  it("calls PATCH with both name and color", async () => {
    const updatedLabel = makeLabel(1, "bugfix", "#ff0000");
    const mockClient: GogsClient = {
      request: vi.fn().mockResolvedValue({ ok: true, data: updatedLabel }),
    };

    const result = await labelUpdate(mockClient, {
      repo: "xing/test",
      id: 1,
      name: "bugfix",
      color: "#ff0000",
    });

    expect(mockClient.request).toHaveBeenCalledWith(
      "PATCH", "/repos/xing/test/labels/1",
      { body: { name: "bugfix", color: "#ff0000" } }
    );
    expect(result).toEqual(updatedLabel);
  });

  it("throws ValidationError when no fields provided", async () => {
    const mockClient: GogsClient = { request: vi.fn() };

    await expect(
      labelUpdate(mockClient, { repo: "xing/test", id: 1 })
    ).rejects.toThrow("At least one field to update is required");

    expect(mockClient.request).not.toHaveBeenCalled();
  });
});

describe("labelDelete", () => {
  it("calls DELETE /repos/{repo}/labels/{id}", async () => {
    const mockClient: GogsClient = {
      request: vi.fn().mockResolvedValue({ ok: true, data: null }),
    };

    await labelDelete(mockClient, { repo: "xing/test", id: 1 });

    expect(mockClient.request).toHaveBeenCalledWith(
      "DELETE", "/repos/xing/test/labels/1"
    );
  });
});
