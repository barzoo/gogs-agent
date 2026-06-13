import type { GogsClient } from "../client.js";
import type { Repository } from "../types.js";

export interface RepoInfoParams {
  repo: string;
}

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
