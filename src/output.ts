import { writeFile } from "fs/promises";

export function inferFormatFromPath(
  path: string
): "json" | "markdown" | "text" | null {
  const lower = path.toLowerCase();
  if (lower.endsWith(".json")) return "json";
  if (lower.endsWith(".md") || lower.endsWith(".markdown")) return "markdown";
  if (lower.endsWith(".txt") || lower.endsWith(".text")) return "text";
  return null;
}

export async function writeOutput(
  text: string,
  outputPath?: string
): Promise<void> {
  if (!outputPath) {
    process.stdout.write(text);
    if (!text.endsWith("\n")) process.stdout.write("\n");
    return;
  }
  await writeFile(outputPath, text, "utf-8");
}
