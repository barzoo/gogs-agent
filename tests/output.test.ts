import { describe, it, expect } from "vitest";
import { inferFormatFromPath, writeOutput } from "../src/output.js";
import { mkdtempSync, readFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

describe("inferFormatFromPath", () => {
  it("returns json for .json", () => {
    expect(inferFormatFromPath("out.json")).toBe("json");
  });

  it("returns markdown for .md", () => {
    expect(inferFormatFromPath("out.md")).toBe("markdown");
  });

  it("returns markdown for .markdown", () => {
    expect(inferFormatFromPath("out.markdown")).toBe("markdown");
  });

  it("returns text for .txt", () => {
    expect(inferFormatFromPath("out.txt")).toBe("text");
  });

  it("returns text for .text", () => {
    expect(inferFormatFromPath("out.text")).toBe("text");
  });

  it("returns null for unknown extension", () => {
    expect(inferFormatFromPath("out.xyz")).toBeNull();
  });

  it("is case-insensitive", () => {
    expect(inferFormatFromPath("out.JSON")).toBe("json");
    expect(inferFormatFromPath("out.MD")).toBe("markdown");
  });
});

describe("writeOutput", () => {
  it("writes to file when path provided", async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), "gogs-agent-test-"));
    const filePath = join(tmpDir, "output.json");

    await writeOutput("hello", filePath);
    const content = readFileSync(filePath, "utf-8");
    expect(content).toBe("hello");

    rmSync(tmpDir, { recursive: true, force: true });
  });
});
