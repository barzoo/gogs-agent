import type { GogsClient } from "../client.js";
import type {
  Issue,
  IssueListParams,
  IssueGetParams,
  IssueCreateParams,
  IssueCloseReopenParams,
} from "../types.js";

export async function issueList(
  client: GogsClient,
  params: IssueListParams
): Promise<Issue[]> {
  const query: Record<string, string | number> = {};
  if (params.state) query.state = params.state;
  if (params.labels) query.labels = params.labels;
  if (params.limit) query.limit = params.limit;
  if (params.page) query.page = params.page;

  const res = await client.request<Issue[]>(
    "GET",
    `/repos/${params.repo}/issues`,
    { query }
  );
  return res.data;
}

export async function issueGet(
  client: GogsClient,
  params: IssueGetParams
): Promise<Issue> {
  const res = await client.request<Issue>(
    "GET",
    `/repos/${params.repo}/issues/${params.number}`
  );
  return res.data;
}

export async function issueCreate(
  client: GogsClient,
  params: IssueCreateParams
): Promise<Issue> {
  const body: Record<string, unknown> = { title: params.title };
  if (params.body) body.body = params.body;
  if (params.labels) body.labels = params.labels;
  if (params.assignee) body.assignee = params.assignee;
  if (params.milestone) body.milestone = params.milestone;

  const res = await client.request<Issue>(
    "POST",
    `/repos/${params.repo}/issues`,
    { body }
  );
  return res.data;
}

export async function issueCloseReopen(
  client: GogsClient,
  params: IssueCloseReopenParams
): Promise<Issue> {
  const res = await client.request<Issue>(
    "PATCH",
    `/repos/${params.repo}/issues/${params.number}`,
    { body: { state: params.action === "close" ? "closed" : "open" } }
  );
  return res.data;
}
