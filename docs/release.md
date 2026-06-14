# Release Process

This document describes how to package and publish a new release of `gogs-agent`.

## Prerequisites

- All changes committed and pushed
- `npm run build` passes cleanly
- `npm test` passes (83+ tests)
- Git tags are synced between remotes

## Step-by-Step

### 1. Bump Version

Edit `package.json` and update the `version` field. Follow [Semantic Versioning](https://semver.org/):

```json
{
  "version": "0.2.3"
}
```

Commit:

```powershell
git add package.json
git commit -m "chore: bump version to 0.2.3"
```

### 2. Build

```bash
npm run build
```

This compiles TypeScript and regenerates `skill.md`.

### 3. Tag

```bash
VERSION="0.2.3"
git tag "v$VERSION" -m "v$VERSION: <short summary of changes>"
```

### 4. Push

```bash
git push origin master
git push origin "v$VERSION"
git push github master
git push github "v$VERSION"
```

### 5. Package ZIP

Run the packaging script:

```powershell
.\scripts\package-release.ps1
```

This produces `gogs-agent-v<version>.zip` with the following structure:

```
gogs-agent-v0.2.3/
├── .env.example
├── package.json
├── README.md
├── README.zh-CN.md
├── skill.md
├── dist/
│   ├── cli.js
│   ├── client.js
│   ├── config.js
│   ├── errors.js
│   ├── formatters.js
│   ├── git.js
│   ├── labels.js
│   ├── output.js
│   ├── types.js
│   ├── user-config.js
│   └── commands/
│       ├── comment.js
│       ├── issue.js
│       ├── label.js
│       ├── pr.js
│       └── repo.js
└── docs/
    ├── commands.md
    ├── commands.zh-CN.md
    ├── configuration.md
    └── configuration.zh-CN.md
```

### 6. Create GitHub Release

1. Open https://github.com/barzoo/gogs-agent/releases/new?tag=v<VERSION>
2. Set **Title**: `v<VERSION>`
3. Write release notes (see template below)
4. Attach `gogs-agent-v<VERSION>.zip`
5. Click **Publish release**

### 7. Verify

```bash
# Fresh install test
npm install -g gogs-agent
gogs --version
gogs issue list --repo <test-repo> --state open
```

## Release Notes Template

```markdown
## What's New

### 🏷️ Feature 1
- Bullet points

### 🔧 Feature 2
- Bullet points

### 📚 Documentation
- Bullet points

---

**Full Changelog**: https://github.com/barzoo/gogs-agent/compare/v<PREV_VERSION>...v<VERSION>
```

## ZIP Package Rules

| Include | Exclude | Reason |
|---------|---------|--------|
| `dist/*.js` | `dist/*.d.ts` | Type declarations not needed at runtime |
| `dist/*.js` | `dist/*.js.map` | Source maps not needed at runtime |
| `docs/commands.*` | `docs/superpowers/` | Internal dev docs, not for users |
| `docs/configuration.*` | | |
| `package.json` | `package-lock.json` | Dev lock file |
| `.env.example` | `.env` | Template, not actual secrets |
| `README.*`, `skill.md` | | |
