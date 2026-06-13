// ── Gogs API entity types ──

export interface User {
  id: number;
  login: string;
  full_name: string;
  avatar_url: string;
}

export interface Label {
  id: number;
  name: string;
  color: string;
}

export interface Milestone {
  id: number;
  title: string;
  state: "open" | "closed";
}

export interface Issue {
  id: number;
  number: number;
  title: string;
  body: string;
  state: "open" | "closed";
  labels: Label[];
  assignee: User | null;
  milestone: Milestone | null;
  created_at: string;
  updated_at: string;
  html_url: string;
}

export interface PullRequest {
  id: number;
  number: number;
  title: string;
  body: string;
  state: "open" | "closed";
  head: { label: string; ref: string; sha: string };
  base: { label: string; ref: string; sha: string };
  assignee: User | null;
  merged: boolean;
  merged_by: User | null;
  created_at: string;
  updated_at: string;
  html_url: string;
}

export interface Comment {
  id: number;
  body: string;
  user: User;
  created_at: string;
  updated_at: string;
}

export interface Repository {
  id: number;
  owner: User;
  name: string;
  full_name: string;
  description: string;
  private: boolean;
  html_url: string;
  clone_url: string;
  ssh_url: string;
  default_branch: string;
  created_at: string;
  updated_at: string;
}

// ── GogsClient types ──

export interface GogsClientConfig {
  baseUrl: string;
  apiKey: string;
  timeout: number;
}

export interface GogsRequestOpts {
  query?: Record<string, string | number>;
  body?: unknown;
}

export interface GogsResponse<T> {
  ok: boolean;
  data: T;
  pagination?: {
    total: number;
    page: number;
    pageSize: number;
  };
}

// ── Internal config type ──

export interface AppConfig {
  baseUrl: string;
  apiKey: string;
  defaultRepo?: string;
  verbose: boolean;
  timeout: number;
  format: "json" | "markdown" | "text";
  repo?: string;
  output?: string;  // NEW
}

// ── Command parameter types ──

export interface IssueListParams {
  repo: string;
  state?: "open" | "closed" | "all";
  labels?: string;
  limit?: number;
  page?: number;
}

export interface IssueGetParams {
  repo: string;
  number: number;
}

export interface IssueCreateParams {
  repo: string;
  title: string;
  body?: string;
  labels?: string;
  assignee?: string;
  milestone?: number;
}

export interface IssueCloseReopenParams {
  repo: string;
  number: number;
  action: "close" | "reopen";
}

export interface IssueUpdateParams {
  repo: string;
  number: number;
  title?: string;
  body?: string;
  state?: "open" | "closed";
  assignee?: string;
  milestone?: number;
  labels?: string;
}

export interface LabelListParams {
  repo: string;
}

export interface LabelCreateParams {
  repo: string;
  name: string;
  color?: string;
}

export interface PrListParams {
  repo: string;
  state?: "open" | "closed" | "all";
  limit?: number;
  page?: number;
}

export interface PrGetParams {
  repo: string;
  number: number;
}

export interface PrCreateParams {
  repo: string;
  title: string;
  head: string;
  base: string;
  body?: string;
  assignee?: string;
}

export interface PrMergeParams {
  repo: string;
  number: number;
  strategy?: "merge" | "rebase" | "squash";
}

export interface PrDiffParams {
  repo: string;
  number: number;
  format?: "json" | "diff";
}

export interface CommentListParams {
  repo: string;
  type: "issue" | "pr";
  number: number;
}

export interface CommentCreateParams {
  repo: string;
  type: "issue" | "pr";
  number: number;
  body: string;
}

// ── Output type ──

export interface CliOutput {
  ok: boolean;
  data?: unknown;
  error?: string;
  code?: string;
  status?: number;
}
