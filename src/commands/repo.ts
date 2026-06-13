import type { GogsClient } from "../client.js";
import type { Repository, RepoInfoParams, RepoCreateParams } from "../types.js";

export { RepoInfoParams, RepoCreateParams };

export async function repoInfo(
  client: GogsClient,
  params: RepoInfoParams
): Promise<Repository> {
  const res = await client.request<Repository>(
    "GET",
    `/repos/${params.repo}`
  );
  return res.data;
}

export async function repoCreate(
  client: GogsClient,
  params: RepoCreateParams
): Promise<Repository> {
  const body: Record<string, unknown> = { name: params.name, auto_init: true };
  if (params.description) body.description = params.description;
  if (params.private) body.private = true;

  const res = await client.request<Repository>(
    "POST",
    "/user/repos",
    { body }
  );
  return res.data;
}
