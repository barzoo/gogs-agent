import type { GogsClient } from "../client.js";
import { resolveLabels } from "../labels.js";
import { ValidationError } from "../errors.js";
import type {
  Issue,
  IssueListParams,
  IssueGetParams,
  IssueCreateParams,
  IssueCloseReopenParams,
  IssueUpdateParams,
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

  // Resolve label names → label IDs (auto-creates missing labels)
  if (params.labels) {
    const names = params.labels
      .split(",")
      .map((l) => l.trim())
      .filter(Boolean);
    if (names.length) {
      body.labels = await resolveLabels(client, params.repo, names);
    }
  }

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

export async function issueUpdate(
  client: GogsClient,
  params: IssueUpdateParams
): Promise<Issue> {
  const body: Record<string, unknown> = {};

  if (params.title !== undefined) body.title = params.title;
  if (params.body !== undefined) body.body = params.body;
  if (params.state !== undefined) body.state = params.state;
  if (params.assignee !== undefined) body.assignee = params.assignee;
  if (params.milestone !== undefined) body.milestone = params.milestone;

  if (params.labels) {
    const names = params.labels.split(",").map((l) => l.trim()).filter(Boolean);
    if (names.length) {
      body.labels = await resolveLabels(client, params.repo, names);
    }
  }

  if (Object.keys(body).length === 0) {
    throw new ValidationError("At least one field to update is required");
  }

  const res = await client.request<Issue>(
    "PATCH",
    `/repos/${params.repo}/issues/${params.number}`,
    { body }
  );
  return res.data;
}
