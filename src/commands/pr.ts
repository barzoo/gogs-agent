import type { GogsClient } from "../client.js";
import type {
  PullRequest,
  PrListParams,
  PrGetParams,
  PrCreateParams,
  PrMergeParams,
  PrDiffParams,
} from "../types.js";

export async function prList(
  client: GogsClient,
  params: PrListParams
): Promise<PullRequest[]> {
  const query: Record<string, string | number> = {};
  if (params.state) query.state = params.state;
  if (params.limit) query.limit = params.limit;
  if (params.page) query.page = params.page;

  const res = await client.request<PullRequest[]>(
    "GET",
    `/repos/${params.repo}/pulls`,
    { query }
  );
  return res.data;
}

export async function prGet(
  client: GogsClient,
  params: PrGetParams
): Promise<PullRequest> {
  const res = await client.request<PullRequest>(
    "GET",
    `/repos/${params.repo}/pulls/${params.number}`
  );
  return res.data;
}

export async function prCreate(
  client: GogsClient,
  params: PrCreateParams
): Promise<PullRequest> {
  const body: Record<string, unknown> = {
    title: params.title,
    head: params.head,
    base: params.base,
  };
  if (params.body) body.body = params.body;
  if (params.assignee) body.assignee = params.assignee;

  const res = await client.request<PullRequest>(
    "POST",
    `/repos/${params.repo}/pulls`,
    { body }
  );
  return res.data;
}

export async function prMerge(
  client: GogsClient,
  params: PrMergeParams
): Promise<PullRequest> {
  const res = await client.request<PullRequest>(
    "POST",
    `/repos/${params.repo}/pulls/${params.number}/merge`,
    { body: { Do: params.strategy || "merge" } }
  );
  return res.data;
}

export async function prDiff(
  client: GogsClient,
  params: PrDiffParams
): Promise<string> {
  const res = await client.request<string>(
    "GET",
    `/repos/${params.repo}/pulls/${params.number}.diff`
  );
  return res.data;
}
