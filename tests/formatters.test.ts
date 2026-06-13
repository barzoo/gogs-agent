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
