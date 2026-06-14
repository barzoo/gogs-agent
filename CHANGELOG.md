# Changelog

## 0.2.2

### Added
- `gogs label get --id <n>` — get a single label by ID
- `gogs label update --id <n> [--name] [--color]` — update a label's name or color
- `gogs label delete --id <n>` — delete a label

### Fixed
- `gogs issue update --labels` now uses the correct PUT /issues/{n}/labels endpoint (Gogs PATCH does not support labels)
- Empty response body handling (204 No Content from DELETE) in the HTTP client
- Empty `--labels ""` now correctly clears all labels on an issue

### Changed
- Extracted shared `parseLabelNames()` helper to `src/labels.ts`
- `resolveLabels()` now creates missing labels in parallel via `Promise.all`
- `issueUpdate` skips the final GET request when only non-label fields change (saves 1 round-trip)
- Added `DeleteResult` type in `src/types.ts` for standardized delete responses
