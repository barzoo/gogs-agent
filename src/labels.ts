import type { GogsClient } from "./client.js";
import type { Label } from "./types.js";

/** Preset color table for auto-created labels. */
export const PRESET_COLORS = [
  "#0052cc", "#ee0701", "#d93f0b",
  "#0e8a16", "#fbca04", "#5319e7",
];

/** Parse a comma-separated CLI label string into a trimmed array. */
export function parseLabelNames(raw: string): string[] {
  return raw.split(",").map((l) => l.trim()).filter(Boolean);
}

/**
 * Resolve label names to label IDs.
 * Looks up existing labels (case-insensitive).
 * Auto-creates labels not found, using the preset color table.
 * Duplicates in the input are handled gracefully.
 */
export async function resolveLabels(
  client: GogsClient,
  repo: string,
  names: string[]
): Promise<number[]> {
  if (!names.length) return [];

  const existing = await client.request<Label[]>(
    "GET",
    `/repos/${repo}/labels`
  );

  const nameToId = new Map<string, number>();
  for (const label of existing.data) {
    nameToId.set(label.name.toLowerCase(), label.id);
  }

  // Auto-create labels that don't already exist
  const missing = names.filter((n) => !nameToId.has(n.toLowerCase()));
  if (missing.length) {
    const created = await Promise.all(
      missing.map((name, i) => {
        const color = PRESET_COLORS[i % PRESET_COLORS.length];
        return client.request<Label>(
          "POST",
          `/repos/${repo}/labels`,
          { body: { name, color } }
        );
      })
    );
    for (const { data } of created) {
      nameToId.set(data.name.toLowerCase(), data.id);
    }
  }

  return names.map((n) => nameToId.get(n.toLowerCase())!);
}
