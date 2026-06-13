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
    if (Array.isArray(payload)) {
      return formatArrayMarkdown(payload);
    }
    return formatObjectMarkdown(payload as Record<string, unknown>);
  } else {
    const err = payload as CliOutput;
    let md = `**Status**: ❌ Failed\n\n`;
    md += `**Error**: ${err.error}\n`;
    if (err.code) md += `- **Code**: ${err.code}\n`;
    if (err.status) md += `- **HTTP Status**: ${err.status}\n`;
    return md;
  }
}

function formatObjectMarkdown(data: Record<string, unknown>): string {
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
}

function formatArrayMarkdown(items: unknown[]): string {
  if (items.length === 0) {
    return `**Status**: ✅ Success\n\nNo results.\n\n\`\`\`json\n[]\n\`\`\``;
  }

  const first = items[0] as Record<string, unknown>;

  if ("html_url" in first && "title" in first && "number" in first && "comments" in first) {
    return formatIssueListMarkdown(items as Array<Record<string, unknown>>);
  }

  if ("html_url" in first && "title" in first && "number" in first && "merged" in first) {
    return formatPRListMarkdown(items as Array<Record<string, unknown>>);
  }

  if ("user" in first && "body" in first) {
    return formatCommentListMarkdown(items as Array<Record<string, unknown>>);
  }

  if ("color" in first && "name" in first && "id" in first) {
    return formatLabelListMarkdown(items as Array<Record<string, unknown>>);
  }

  return formatGenericListMarkdown(items);
}

function formatIssueListMarkdown(issues: Array<Record<string, unknown>>): string {
  let md = `**Status**: ✅ Success\n\n`;
  md += "| # | Title | State | Labels | Comments |\n";
  md += "|---|-------|-------|--------|----------|\n";

  for (const item of issues) {
    const number = item["number"];
    const title = item["title"];
    const htmlUrl = item["html_url"];
    const state = item["state"];
    const labels = ((item["labels"] as Array<{ name: string }>) || []).map((l) => l.name).join(", ") || "-";
    const comments = item["comments"] ?? 0;

    md += `| ${number} | [${title}](${htmlUrl}) | ${state} | ${labels} | ${comments} |\n`;
  }

  md += `\n\`\`\`json\n${JSON.stringify(issues, null, 2)}\n\`\`\``;
  return md;
}

function formatPRListMarkdown(prs: Array<Record<string, unknown>>): string {
  let md = `**Status**: ✅ Success\n\n`;
  md += "| # | Title | State | Source → Target | Merged |\n";
  md += "|---|-------|-------|-----------------|--------|\n";

  for (const item of prs) {
    const number = item["number"];
    const title = item["title"];
    const htmlUrl = item["html_url"];
    const state = item["state"];
    const head = (item["head"] as { ref: string })?.ref;
    const base = (item["base"] as { ref: string })?.ref;
    const merged = item["merged"] ? "Yes" : "No";

    md += `| ${number} | [${title}](${htmlUrl}) | ${state} | ${head} → ${base} | ${merged} |\n`;
  }

  md += `\n\`\`\`json\n${JSON.stringify(prs, null, 2)}\n\`\`\``;
  return md;
}

function formatCommentListMarkdown(comments: Array<Record<string, unknown>>): string {
  let md = `**Status**: ✅ Success\n\n`;
  md += "| User | Created | Body |\n";
  md += "|------|---------|------|\n";

  for (const item of comments) {
    const user = (item["user"] as { login: string })?.login;
    const created = item["created_at"];
    const body = String(item["body"] || "").replace(/\|/g, "\\|").replace(/\n/g, " ");

    md += `| ${user} | ${created} | ${body} |\n`;
  }

  md += `\n\`\`\`json\n${JSON.stringify(comments, null, 2)}\n\`\`\``;
  return md;
}

function formatLabelListMarkdown(labels: Array<Record<string, unknown>>): string {
  let md = `**Status**: ✅ Success\n\n`;
  md += "| ID | Name | Color |\n";
  md += "|----|------|-------|\n";

  for (const item of labels) {
    const id = item["id"];
    const name = item["name"];
    const color = item["color"];

    md += `| ${id} | ${name} | \`${color}\` |\n`;
  }

  md += `\n\`\`\`json\n${JSON.stringify(labels, null, 2)}\n\`\`\``;
  return md;
}

function formatGenericListMarkdown(items: unknown[]): string {
  let md = `**Status**: ✅ Success\n\n`;
  md += "| Item |\n";
  md += "|------|\n";

  for (const item of items) {
    md += `| ${JSON.stringify(item).slice(0, 80)} |\n`;
  }

  md += `\n\`\`\`json\n${JSON.stringify(items, null, 2)}\n\`\`\``;
  return md;
}
