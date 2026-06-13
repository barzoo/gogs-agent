# CLAUDE.md

Gogs Agent — TypeScript CLI + Claude Code Skill for operating self-hosted Gogs repositories.

## Commands

```bash
npm test          # 77 tests, vitest
npm run build     # tsc + generate-skill
npm start         # node dist/cli.js --help
```

## Architecture

```
src/cli.ts              Commander entry point (side effects live here only)
src/client.ts           GogsClient: fetch wrapper with auth, retry, pagination
src/config.ts           Config loader (CLI > env > .env > defaults)
src/types.ts            All shared interfaces
src/errors.ts           ConfigError, ValidationError, ApiError, NetworkError
src/formatters.ts       JSON / markdown / text output formatters
src/output.ts           File output + extension-based format inference
src/labels.ts           Label resolution helpers (lookup + auto-create)
src/commands/*.ts       Pure functions: (client, params) => data
scripts/generate-skill.ts  Build-time: reads Commander tree → writes skill.md
```

### Key invariants

- **Command functions are pure** — receive `(client, params)`, return `data`. No `process.env`, `fs`, or `console`.
- **CLI boundary owns side effects** — `cli.ts` is the only file that reads config, calls commands, and writes output.
- **JSON stdout is the API** — every command produces `{ ok, data }` or `{ ok, error, code, status }` to stdout. stderr is empty unless `--verbose`.
- **Exit codes** — 0 (ok), 1 (config/validation), 2 (API error), 3 (network error).

### Adding a new command

1. Define the command handler in `src/commands/<resource>.ts` (pure function)
2. Add params interface to `src/types.ts`
3. Wire into `src/cli.ts` (Commander sub-command + `run()` wrapper)
4. Mirror the Commander definition in `scripts/generate-skill.ts` so `skill.md` stays in sync
5. Add tests in `tests/commands/<resource>.test.ts`

### Skill generation

`scripts/generate-skill.ts` duplicates the Commander tree from `cli.ts` because:
- `cli.ts` has module-level `dotenv/config` and `program.parse()` side effects
- The generator must run at build time without triggering those
- Keep the two trees in sync manually

`inferType()` uses a hybrid approach: checks `opt.parseArg` first, falls back to `NUMERIC_OPTION_NAMES` Set (matching `src/cli.ts` naming conventions for `--number`, `--limit`, `--page`, `--milestone`).

### Testing conventions

- Unit tests mock `GogsClient` (never real HTTP)
- Test the API shape: method, path, query params, body
- Formatter tests cover all three formats with real output assertions
- Config tests reset `process.env` in `beforeEach`/`afterEach`
