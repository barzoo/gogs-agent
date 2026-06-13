import type { GogsClient } from "../client.js";
import type { Comment, CommentListParams, CommentCreateParams } from "../types.js";

export async function commentList(
  client: GogsClient,
  params: CommentListParams
): Promise<Comment[]> {
  const res = await client.request<Comment[]>(
    "GET",
    `/repos/${params.repo}/issues/${params.number}/comments`
  );
  return res.data;
}

export async function commentCreate(
  client: GogsClient,
  params: CommentCreateParams
): Promise<Comment> {
  const res = await client.request<Comment>(
    "POST",
    `/repos/${params.repo}/issues/${params.number}/comments`,
    { body: { body: params.body } }
  );
  return res.data;
}
