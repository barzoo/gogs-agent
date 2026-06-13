import { ApiError, NetworkError } from "./errors.js";
import type { GogsClientConfig, GogsRequestOpts, GogsResponse } from "./types.js";

export interface GogsClient {
  request<T>(
    method: string,
    path: string,
    opts?: GogsRequestOpts
  ): Promise<GogsResponse<T>>;
}

export function createGogsClient(config: GogsClientConfig): GogsClient {
  const { baseUrl, apiKey, timeout } = config;

  async function request<T>(
    method: string,
    path: string,
    opts?: GogsRequestOpts
  ): Promise<GogsResponse<T>> {
    let url = `${baseUrl}${path}`;
    if (opts?.query) {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(opts.query)) {
        params.append(key, String(value));
      }
      url += `?${params.toString()}`;
    }

    const headers: Record<string, string> = {
      "Authorization": `token ${apiKey}`,
      "Content-Type": "application/json",
    };

    const fetchOpts: RequestInit = {
      method,
      headers,
      signal: AbortSignal.timeout(timeout),
    };

    if (opts?.body && method !== "GET") {
      fetchOpts.body = JSON.stringify(opts.body);
    }

    let retryCount = 0;
    const maxRetries = method === "GET" ? 3 : 0;

    while (retryCount <= maxRetries) {
      let response: Response;
      try {
        response = await fetch(url, fetchOpts);
      } catch (err) {
        throw new NetworkError(
          `Request to ${path} failed: ${err instanceof Error ? err.message : String(err)}`
        );
      }

      if (response.ok) {
        const data = await response.json() as T;
        const total = response.headers.get("X-Total");
        const page = response.headers.get("X-Page");

        return {
          ok: true,
          data,
          pagination: total ? {
            total: parseInt(total, 10),
            page: page ? parseInt(page, 10) : 1,
            pageSize: 0,
          } : undefined,
        };
      }

      // Rate limited (429) — exponential backoff
      if (response.status === 429) {
        if (retryCount < maxRetries) {
          const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
          await new Promise(resolve => setTimeout(resolve, delay));
          retryCount++;
          continue;
        }
        // Max retries exhausted on 429 — throw immediately
        throw new ApiError(
          `Gogs API error: ${method} ${path} returned ${response.status}`,
          response.status,
          "Rate limited"
        );
      }

      // Server error (5xx) — single retry
      if (response.status >= 500 && retryCount < 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        retryCount++;
        continue;
      }

      // All other errors — no retry
      const bodyText = await response.text();
      throw new ApiError(
        `Gogs API error: ${method} ${path} returned ${response.status}`,
        response.status,
        bodyText
      );
    }
  }

  return { request };
}
