# Configuration

`gogs-agent` loads configuration from multiple sources, merged in priority order.

## Priority Chain

```
CLI --flags  >  Environment variables  >  Project .env  >  User ~/.gogs/config.json  >  Defaults
```

A value set closer to the left always wins.

User-level config sets your personal defaults (API key, server URL), project `.env` overrides for special cases, and CLI flags have the final say.

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GOGS_API_KEY` | **Yes** | — | Gogs API token. Generate at `https://<your-gogs>/user/settings/applications` |
| `GOGS_BASE_URL` | No | `https://git.desiyi.com/api/v1` | Base URL of your Gogs instance's API |
| `GOGS_DEFAULT_REPO` | No | — | Default repository as `owner/repo`. Removes the need for `--repo` on every command |
| `GOGS_TIMEOUT` | No | `30000` | HTTP request timeout in milliseconds |
| `GOGS_VERBOSE` | No | `false` | Enable diagnostic logging to stderr (set to `true`) |
| `GOGS_OUTPUT` | No | — | Default output file path (overridable with `--output`) |

## .env File

Place a `.env` file in your working directory:

```bash
GOGS_API_KEY=abc123your_token_here
GOGS_BASE_URL=https://git.desiyi.com/api/v1
GOGS_DEFAULT_REPO=myorg/myrepo
```

Or copy the template:

```bash
cp .env.example .env
# edit .env with your values
```

## User Config (`~/.gogs/config.json`)

For settings that are the same across all your projects (API key, server URL), create a one-time user-level config:

```json
{
  "apiKey": "abc123your_token_here",
  "baseUrl": "https://git.desiyi.com/api/v1"
}
```

Place this file at `~/.gogs/config.json` (i.e., `<HOME>/.gogs/config.json` on all platforms).

**Why this exists:** `GOGS_API_KEY` and `GOGS_BASE_URL` are personal — they don't change between projects. Set them once here and skip creating `.env` files in every repository. Project `.env` still works and takes precedence when you need a per-project override.

| Field | Type | Description |
|-------|------|-------------|
| `apiKey` | string | Your Gogs API token |
| `baseUrl` | string | Base URL of your Gogs instance's API |

Both fields are optional — any field left out falls through to the next priority level.

## CLI Flags

Global flags available on every command:

| Flag | Description |
|------|-------------|
| `--repo <owner/repo>` | Target repository (overrides `GOGS_DEFAULT_REPO`) |
| `--format <fmt>` | Output format: `json` (default), `markdown`, or `text` |
| `--output <path>` | Write output to file instead of stdout |
| `--verbose` | Enable diagnostic logging to stderr |

The `--repo` flag accepts the URL-encoded form `owner/repo` (e.g., `xing/gogs-agent`). For repositories under organizations, use the full path (e.g., `myorg/backend`).

## Output Format Inference

When `--output` specifies a file path, the format is **inferred from the file extension**:

| Extension | Format |
|-----------|--------|
| `.json` | `json` |
| `.md`, `.markdown` | `markdown` |
| `.txt`, `.text` | `text` |
| (any other) | Falls back to `--format` or default `json` |

Example:

```bash
# Writes markdown to issues.md (format inferred from extension)
gogs issue list --repo myorg/myrepo --output issues.md
```

## Validation

On startup, `gogs-agent` validates:

- **Missing `GOGS_API_KEY`** → exit 1: `"GOGS_API_KEY is required. Set it via ~/.gogs/config.json, project .env, or environment variable."`
- **Missing `--repo` (and no `GOGS_DEFAULT_REPO`)** → exit 1: `"--repo <owner/repo> is required."`

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Configuration or validation error |
| 2 | Gogs API error (non-2xx HTTP response) |
| 3 | Network error (timeout, DNS failure, connection refused) |

When scripting, always check the exit code:

```bash
if gogs issue list --repo myorg/myrepo --state open > issues.json; then
    echo "OK"
else
    echo "Failed (code $?)"
fi
```

## API Authentication

`gogs-agent` authenticates via Gogs API tokens:

1. Log into your Gogs instance
2. Go to **Settings → Applications**
3. Generate a new token with appropriate scopes (read/write for full functionality)
4. Set `GOGS_API_KEY=<token>` in your environment, `~/.gogs/config.json`, or project `.env`

The token is sent as `Authorization: token <apiKey>` header on every API request.

## HTTP Client Behavior

The internal HTTP client includes:

- **Timeout**: Configurable via `GOGS_TIMEOUT` (default 30s). Requests that exceed the timeout abort with a `NetworkError`.
- **Retries**: GET requests automatically retry on transient failures:
  - `429 Too Many Requests` — exponential backoff (1s, 2s, 4s), up to 3 retries
  - `5xx Server Error` — single retry after 1s
  - `4xx Client Error` (except 429) — no retry
- **Pagination**: The client parses `X-Total` and `X-Page` response headers and surfaces them in `GogsResponse.pagination`.
- **Logging**: When `--verbose` is set, each request logs method, path, status, and duration to stderr.
