import { ValidationError } from "../errors.js";
import type { GogsClient } from "../client.js";
import type {
  Label,
  LabelListParams,
  LabelGetParams,
  LabelCreateParams,
  LabelUpdateParams,
  LabelDeleteParams,
  DeleteResult,
} from "../types.js";
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

export async function labelGet(
  client: GogsClient,
  params: LabelGetParams
): Promise<Label> {
  const res = await client.request<Label>(
    "GET",
    `/repos/${params.repo}/labels/${params.id}`
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

export async function labelUpdate(
  client: GogsClient,
  params: LabelUpdateParams
): Promise<Label> {
  const body: Record<string, unknown> = {};

  if (params.name !== undefined) body.name = params.name;
  if (params.color !== undefined) body.color = params.color;

  if (Object.keys(body).length === 0) {
    throw new ValidationError("At least one field to update is required (name or color)");
  }

  const res = await client.request<Label>(
    "PATCH",
    `/repos/${params.repo}/labels/${params.id}`,
    { body }
  );
  return res.data;
}

export async function labelDelete(
  client: GogsClient,
  params: LabelDeleteParams
): Promise<DeleteResult> {
  await client.request<null>(
    "DELETE",
    `/repos/${params.repo}/labels/${params.id}`
  );
  return { deleted: true };
}
