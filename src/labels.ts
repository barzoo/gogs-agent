import type { GogsClient } from "./client.js";
import type { Label } from "./types.js";

/** Preset color table for auto-created labels. */
export const PRESET_COLORS = [
  "#0052cc", "#ee0701", "#d93f0b",
  "#0e8a16", "#fbca04", "#5319e7",
];

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

  let colorIdx = 0;
  const ids: number[] = [];

  for (const rawName of names) {
    const name = rawName.trim();
    const key = name.toLowerCase();

    const existingId = nameToId.get(key);
    if (existingId !== undefined) {
      ids.push(existingId);
    } else {
      const color = PRESET_COLORS[colorIdx++ % PRESET_COLORS.length];
      const created = await client.request<Label>(
        "POST",
        `/repos/${repo}/labels`,
        { body: { name, color } }
      );
      ids.push(created.data.id);
      nameToId.set(key, created.data.id);
    }
  }

  return ids;
}
