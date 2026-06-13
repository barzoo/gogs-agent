import type { CliOutput } from "./types.js";

export function formatOutput(
  ok: boolean,
  dataOrError: unknown,
  format: "json" | "markdown" | "text"
): string {
  if (format === "markdown") {
    return formatMarkdown(ok, dataOrError);
  }
  const payload = ok ? { ok, data: dataOrError } : dataOrError;
  if (format === "text") {
    return JSON.stringify(payload, null, 2);
  }
  return JSON.stringify(payload);
}

function formatMarkdown(ok: boolean, payload: unknown): string {
  if (ok) {
    const data = payload as Record<string, unknown>;
    let md = `**Status**: ✅ Success\n\n`;

    if (typeof data === "object" && data !== null) {
      if ("html_url" in data && "title" in data && "number" in data) {
        md += `[#${data["number"]}](${data["html_url"]}) — **${data["title"]}**\n`;
      }
      if ("state" in data) {
        md += `- **State**: ${data["state"]}\n`;
      }
      if ("body" in data && data["body"]) {
        md += `\n${data["body"]}\n`;
      }
    }

    md += `\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``;
    return md;
  } else {
    const err = payload as CliOutput;
    let md = `**Status**: ❌ Failed\n\n`;
    md += `**Error**: ${err.error}\n`;
    if (err.code) md += `- **Code**: ${err.code}\n`;
    if (err.status) md += `- **HTTP Status**: ${err.status}\n`;
    return md;
  }
}
