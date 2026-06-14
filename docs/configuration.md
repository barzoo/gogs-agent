# Configuration

`gogs-agent` loads configuration from several places, merging them in priority order. You set your personal defaults once, override per project when needed, and use CLI flags for one-off changes.

## How Configuration Works

```
CLI --flags  >  Environment variables  >  Project .env  >  User ~/.gogs/config.json  >  Built-in defaults
```

A value set further left always wins. If you set `GOGS_API_KEY` in `~/.gogs/config.json` and also pass `--repo` on the command line, the CLI flag takes effect while the API key still comes from your user config. Each setting resolves independently.

This layered approach means you can:

- **Set once** — put your API token and server URL in `~/.gogs/config.json`, never think about them again
- **Override per project** — drop a `.env` file when a specific project needs different values
- **Override on the fly** — use CLI flags for one-off changes like `--format markdown`

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GOGS_API_KEY` | **Yes** | — | Your Gogs API token. Generate at `https://<your-gogs>/user/settings/applications` |
| `GOGS_BASE_URL` | No | `https://git.desiyi.com/api/v1` | Base URL of your Gogs instance's API |
| `GOGS_DEFAULT_REPO` | No | — | Default repository as `owner/repo`. Set this once and skip `--repo` on every command |
| `GOGS_TIMEOUT` | No | `30000` | HTTP request timeout in milliseconds |
| `GOGS_VERBOSE` | No | `false` | Enable diagnostic logging to stderr (set to `true`) |
| `GOGS_OUTPUT` | No | — | Default output file path. Overridable per-command with `--output` |

---

## User Config (`~/.gogs/config.json`)

For settings that are personal and rarely change — your API key and server URL — use a one-time user-level config file:

```json
{
  "apiKey": "abc123your_token_here",
  "baseUrl": "https://git.desiyi.com/api/v1"
}
```

Place this at `~/.gogs/config.json`. On any platform, `~` means your home directory.

**Why bother?** `GOGS_API_KEY` and `GOGS_BASE_URL` are about you, not your project. Set them once here and you won't need to create `.env` files in every repository. For project-specific overrides (like `GOGS_DEFAULT_REPO`), use a `.env` file — it will take precedence.

| Field | Type | Description |
|-------|------|-------------|
| `apiKey` | string | Your Gogs API token |
| `baseUrl` | string | Base URL of your Gogs instance's API |

Both fields are optional — anything you leave out falls through to the next priority level.

---

## Project `.env` File

Drop a `.env` file in your working directory for project-specific settings:

```bash
GOGS_DEFAULT_REPO=myorg/myrepo
# You can also override the API key or base URL here if needed:
# GOGS_API_KEY=another_token_for_this_project
# GOGS_BASE_URL=https://other-gogs.example.com/api/v1
```

If you're starting fresh, there's a template you can copy:

```bash
cp .env.example .env
# edit .env with your values
```

`.env` values override `~/.gogs/config.json` but can themselves be overridden by environment variables and CLI flags.

---

## CLI Flags

These global flags are available on every command:

| Flag | Description |
|------|-------------|
| `--repo <owner/repo>` | Target repository (overrides `GOGS_DEFAULT_REPO`) |
| `--format <fmt>` | Output format: `json` (default), `markdown`, or `text` |
| `--output <path>` | Write output to file instead of stdout |
| `--verbose` | Enable diagnostic logging to stderr |

The `--repo` flag uses the `owner/repo` format — for example, `xing/gogs-agent` or `myorg/backend`.

---

## Output Format Inference

When you use `--output`, the output format is automatically inferred from the file extension:

| Extension | Format |
|-----------|--------|
| `.json` | `json` |
| `.md`, `.markdown` | `markdown` |
| `.txt`, `.text` | `text` |
| (anything else) | Falls back to `--format` or default `json` |

This means the extension wins over `--format`. If you write:

```bash
gogs issue list --repo myorg/myrepo --format json --output issues.md
```

The file `issues.md` will contain Markdown — because `.md` takes priority over `--format json`.

---

## Validation

On startup, `gogs-agent` checks two things:

- **Missing `GOGS_API_KEY`** → exit 1: `"GOGS_API_KEY is required. Set it via ~/.gogs/config.json, project .env, or environment variable."`
- **Missing `--repo` (and no `GOGS_DEFAULT_REPO`)** → exit 1: `"--repo <owner/repo> is required."`

---

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | Configuration or validation error |
| `2` | Gogs API error (non-2xx HTTP response) |
| `3` | Network error (timeout, DNS failure, connection refused) |

When scripting, always check the exit code:

```bash
if gogs issue list --repo myorg/myrepo --state open > issues.json; then
    echo "OK"
else
    echo "Failed (code $?)"
fi
```

---

## API Authentication

`gogs-agent` authenticates using Gogs API tokens:

1. Log into your Gogs instance
2. Go to **Settings → Applications**
3. Generate a new token — give it read/write scopes for full functionality
4. Set it via one of: `~/.gogs/config.json`, environment variable, or project `.env`

The token is sent as `Authorization: token <apiKey>` on every API request.

---

## API Compatibility

`gogs-agent` targets **Gogs REST API v1**, which is stable since Gogs v0.12. If you're running a modern version of Gogs (v0.12 or later, up to the [latest release](https://github.com/gogs/gogs/releases)), everything should work out of the box.

| What | Version |
|------|---------|
| [Gogs](https://gogs.io) ([GitHub](https://github.com/gogs/gogs)) | ≥ v0.12 (API v1 stabilized) |
| API base path | `/api/v1` (set via `GOGS_BASE_URL`) |
| This tool tested against | Gogs v0.13+ |

If you're running an older Gogs instance (pre-v0.12), some endpoints may not exist or may behave differently. The API v1 was introduced in Gogs v0.11 but didn't fully stabilize until v0.12 — if you hit unexpected errors, check your Gogs version first.

---

## HTTP Client Behavior

Under the hood, the client handles a few things automatically:

- **Timeout:** Configurable via `GOGS_TIMEOUT` (default 30 seconds). Requests that exceed the timeout are aborted as a `NetworkError`.
- **Retries:** GET requests automatically retry on transient failures:
  - `429 Too Many Requests` — exponential backoff (1s, 2s, 4s), up to 3 retries
  - `5xx Server Error` — one retry after 1 second
  - `4xx Client Error` (except 429) — no retry, fails immediately
- **Pagination:** The client reads `X-Total` and `X-Page` response headers and exposes them in `GogsResponse.pagination`.
- **Logging:** When `--verbose` is set, each request logs its method, path, status, and duration to stderr.
