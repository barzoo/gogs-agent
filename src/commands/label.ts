import type { GogsClient } from "../client.js";
import type { Label, LabelListParams, LabelCreateParams } from "../types.js";
import { PRESET_COLORS } from "../labels.js";

export async function labelList(
  client: GogsClient,
  params: LabelListParams
): Promise<Label[]> {
  const res = await client.request<Label[]>(
    "GET",
    `/repos/${params.repo}/labels`
  );
  return res.data;
}

export async function labelCreate(
  client: GogsClient,
  params: LabelCreateParams
): Promise<Label> {
  const res = await client.request<Label>(
    "POST",
    `/repos/${params.repo}/labels`,
    { body: { name: params.name, color: params.color || PRESET_COLORS[0] } }
  );
  return res.data;
}
