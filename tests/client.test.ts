import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createGogsClient } from "../src/client.js";
import type { Issue } from "../src/types.js";

describe("createGogsClient", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("sends correct Authorization header", async () => {
    let capturedHeaders: HeadersInit | undefined;

    globalThis.fetch = vi.fn().mockImplementation(
      (_url: string | URL | Request, init?: RequestInit) => {
        capturedHeaders = init?.headers;
        return Promise.resolve(
          new Response(JSON.stringify([{ id: 1, number: 1, title: "test" }]), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        );
      }
    ) as any;

    const client = createGogsClient({ baseUrl: "https://example.com/api/v1", apiKey: "secret", timeout: 30000 });
    await client.request<Issue[]>("GET", "/repos/owner/repo/issues");

    expect(capturedHeaders).toBeDefined();
    const headers = capturedHeaders as Record<string, string>;
    expect(headers["Authorization"]).toBe("token secret");
    expect(headers["Content-Type"]).toBe("application/json");
  });

  it("constructs URL from baseUrl and path", async () => {
    let capturedUrl: string | undefined;

    globalThis.fetch = vi.fn().mockImplementation(
      (url: string | URL | Request, _init?: RequestInit) => {
        capturedUrl = url.toString();
        return Promise.resolve(
          new Response(JSON.stringify([]), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        );
      }
    ) as any;

    const client = createGogsClient({ baseUrl: "https://example.com/api/v1", apiKey: "key", timeout: 30000 });
    await client.request("GET", "/repos/owner/repo/issues");

    expect(capturedUrl).toBe("https://example.com/api/v1/repos/owner/repo/issues");
  });

  it("appends query parameters to URL", async () => {
    let capturedUrl: string | undefined;

    globalThis.fetch = vi.fn().mockImplementation(
      (url: string | URL | Request, _init?: RequestInit) => {
        capturedUrl = url.toString();
        return Promise.resolve(
          new Response(JSON.stringify([]), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        );
      }
    ) as any;

    const client = createGogsClient({ baseUrl: "https://example.com/api/v1", apiKey: "key", timeout: 30000 });
    await client.request("GET", "/repos/owner/repo/issues", {
      query: { state: "open", labels: "bug,urgent", limit: 20 },
    });

    expect(capturedUrl).toContain("state=open");
    expect(capturedUrl).toContain("labels=bug%2Curgent");
    expect(capturedUrl).toContain("limit=20");
  });

  it("sends body as JSON string", async () => {
    let capturedBody: string | undefined;

    globalThis.fetch = vi.fn().mockImplementation(
      (_url: string | URL | Request, init?: RequestInit) => {
        capturedBody = init?.body as string;
        return Promise.resolve(
          new Response(JSON.stringify({ id: 1, number: 1, title: "test" }), {
            status: 201,
            headers: { "Content-Type": "application/json" },
          })
        );
      }
    ) as any;

    const client = createGogsClient({ baseUrl: "https://example.com/api/v1", apiKey: "key", timeout: 30000 });
    await client.request("POST", "/repos/owner/repo/issues", {
      body: { title: "hello", body: "world" },
    });

    expect(JSON.parse(capturedBody!)).toEqual({ title: "hello", body: "world" });
  });

  it("parses pagination from X-Total and X-Page headers", async () => {
    globalThis.fetch = vi.fn().mockImplementation(
      (_url: string | URL | Request, _init?: RequestInit) => {
        return Promise.resolve(
          new Response(JSON.stringify([{ id: 1, number: 1 }]), {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "X-Total": "42",
              "X-Page": "2",
            },
          })
        );
      }
    ) as any;

    const client = createGogsClient({ baseUrl: "https://example.com/api/v1", apiKey: "key", timeout: 30000 });
    const result = await client.request("GET", "/repos/owner/repo/issues");

    expect(result.pagination).toEqual({ total: 42, page: 2, pageSize: 0 });
  });

  it("throws NetworkError on fetch failure", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("connect ECONNREFUSED"));

    const client = createGogsClient({ baseUrl: "https://example.com/api/v1", apiKey: "key", timeout: 30000 });
    await expect(
      client.request("GET", "/repos/owner/repo/issues")
    ).rejects.toThrow("Request to /repos/owner/repo/issues failed: connect ECONNREFUSED");
  });

  it("throws ApiError on non-2xx response", async () => {
    globalThis.fetch = vi.fn().mockImplementation(
      (_url: string | URL | Request, _init?: RequestInit) => {
        return Promise.resolve(
          new Response(JSON.stringify({ message: "Not Found" }), {
            status: 404,
            statusText: "Not Found",
          })
        );
      }
    ) as any;

    const client = createGogsClient({ baseUrl: "https://example.com/api/v1", apiKey: "key", timeout: 30000 });
    await expect(
      client.request("GET", "/repos/owner/repo/issues/999")
    ).rejects.toThrow(
      'Gogs API error: GET /repos/owner/repo/issues/999 returned 404'
    );
  });

  it("retries on 429 with exponential backoff, succeeds on 3rd try", async () => {
    let callCount = 0;
    globalThis.fetch = vi.fn().mockImplementation(
      (_url: string | URL | Request, _init?: RequestInit) => {
        callCount++;
        if (callCount < 3) {
          return Promise.resolve(
            new Response(JSON.stringify({ message: "Rate limited" }), { status: 429 })
          );
        }
        return Promise.resolve(
          new Response(JSON.stringify([{ id: 1, number: 1 }]), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        );
      }
    ) as any;

    vi.useFakeTimers();
    const client = createGogsClient({ baseUrl: "https://example.com/api/v1", apiKey: "key", timeout: 30000 });
    const requestPromise = client.request("GET", "/repos/o/r/issues");
    vi.advanceTimersByTime(10000);
    vi.useRealTimers();

    const result = await requestPromise;
    expect(callCount).toBe(3);
    expect(result.ok).toBe(true);
  });

  it("retries once on 5xx error", async () => {
    let callCount = 0;
    globalThis.fetch = vi.fn().mockImplementation(
      (_url: string | URL | Request, _init?: RequestInit) => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve(
            new Response("Server Error", { status: 502 })
          );
        }
        return Promise.resolve(
          new Response(JSON.stringify([{ id: 1, number: 1 }]), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        );
      }
    ) as any;

    vi.useFakeTimers();
    const client = createGogsClient({ baseUrl: "https://example.com/api/v1", apiKey: "key", timeout: 30000 });
    const requestPromise = client.request("GET", "/repos/o/r/issues");
    vi.advanceTimersByTime(5000);
    vi.useRealTimers();

    const result = await requestPromise;
    expect(callCount).toBe(2);
    expect(result.ok).toBe(true);
  });

  it("gives up after max retries on 429", async () => {
    let callCount = 0;
    globalThis.fetch = vi.fn().mockImplementation(
      (_url: string | URL | Request, _init?: RequestInit) => {
        callCount++;
        return Promise.resolve(
          new Response("Rate limited", { status: 429 })
        );
      }
    ) as any;

    const client = createGogsClient({ baseUrl: "https://example.com/api/v1", apiKey: "key", timeout: 30000 });

    await expect(
      client.request("GET", "/repos/o/r/issues")
    ).rejects.toThrow(
      "Gogs API error: GET /repos/o/r/issues returned 429"
    );

    expect(callCount).toBe(4);
  }, 15000);

  it("does not retry on 4xx (except 429)", async () => {
    let callCount = 0;
    globalThis.fetch = vi.fn().mockImplementation(
      (_url: string | URL | Request, _init?: RequestInit) => {
        callCount++;
        return Promise.resolve(
          new Response(JSON.stringify({ message: "Not Found" }), { status: 404 })
        );
      }
    ) as any;

    const client = createGogsClient({ baseUrl: "https://example.com/api/v1", apiKey: "key", timeout: 30000 });
    await expect(
      client.request("GET", "/repos/o/r/issues/999")
    ).rejects.toThrow();

    expect(callCount).toBe(1); // No retry
  });
});
