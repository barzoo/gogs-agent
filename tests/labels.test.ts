import { describe, it, expect, vi } from "vitest";
import { resolveLabels, PRESET_COLORS } from "../src/labels.js";
import type { GogsClient } from "../src/client.js";
import type { Label } from "../src/types.js";

const makeLabel = (id: number, name: string): Label => ({
  id, name, color: "#000000",
});

describe("resolveLabels", () => {
  it("returns IDs for all found names, no POST calls", async () => {
    const existingLabels: Label[] = [
      makeLabel(1, "bug"),
      makeLabel(2, "enhancement"),
      makeLabel(3, "urgent"),
    ];

    const mockClient: GogsClient = {
      request: vi.fn().mockResolvedValueOnce({
        ok: true, data: existingLabels,
      }),
    };

    const ids = await resolveLabels(mockClient, "xing/test", ["bug", "urgent"]);
    expect(ids).toEqual([1, 3]);
    expect(mockClient.request).toHaveBeenCalledTimes(1);
    expect(mockClient.request).toHaveBeenCalledWith(
      "GET", "/repos/xing/test/labels"
    );
  });

  it("auto-creates missing labels with preset colors", async () => {
    const existingLabels: Label[] = [makeLabel(1, "bug")];
    const createdLabel: Label = makeLabel(5, "new-label");

    const mockClient: GogsClient = {
      request: vi.fn()
        .mockResolvedValueOnce({ ok: true, data: existingLabels })
        .mockResolvedValueOnce({ ok: true, data: createdLabel }),
    };

    const ids = await resolveLabels(mockClient, "xing/test", ["bug", "new-label"]);
    expect(ids).toEqual([1, 5]);
    expect(mockClient.request).toHaveBeenCalledTimes(2);
    expect(mockClient.request).toHaveBeenNthCalledWith(2,
      "POST", "/repos/xing/test/labels",
      { body: { name: "new-label", color: PRESET_COLORS[0] } }
    );
  });

  it("creates all labels when none exist", async () => {
    const created1: Label = makeLabel(10, "a");
    const created2: Label = makeLabel(11, "b");

    const mockClient: GogsClient = {
      request: vi.fn()
        .mockResolvedValueOnce({ ok: true, data: [] })
        .mockResolvedValueOnce({ ok: true, data: created1 })
        .mockResolvedValueOnce({ ok: true, data: created2 }),
    };

    const ids = await resolveLabels(mockClient, "xing/test", ["a", "b"]);
    expect(ids).toEqual([10, 11]);
    expect(mockClient.request).toHaveBeenCalledTimes(3);
  });

  it("returns empty array for empty input", async () => {
    const mockClient: GogsClient = {
      request: vi.fn(),
    };

    const ids = await resolveLabels(mockClient, "xing/test", []);
    expect(ids).toEqual([]);
    expect(mockClient.request).not.toHaveBeenCalled();
  });

  it("matches case-insensitively", async () => {
    const existingLabels: Label[] = [makeLabel(1, "Bug")];

    const mockClient: GogsClient = {
      request: vi.fn().mockResolvedValueOnce({
        ok: true, data: existingLabels,
      }),
    };

    const ids = await resolveLabels(mockClient, "xing/test", ["bug"]);
    expect(ids).toEqual([1]);
    expect(mockClient.request).toHaveBeenCalledTimes(1);
  });

  it("deduplicates same name appearing twice in input", async () => {
    const existingLabels: Label[] = [makeLabel(1, "bug")];

    const mockClient: GogsClient = {
      request: vi.fn().mockResolvedValueOnce({
        ok: true, data: existingLabels,
      }),
    };

    const ids = await resolveLabels(mockClient, "xing/test", ["bug", "bug"]);
    expect(ids).toEqual([1, 1]);
    expect(mockClient.request).toHaveBeenCalledTimes(1);
  });
});
