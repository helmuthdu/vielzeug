# Docs Task

Use this when package documentation under `docs/<name>/` needs to match source.

## Load first

- `.ai/core/policy.md`
- `.ai/core/workspace.md`
- `.ai/reference/docs-template.md`
- `docs/AGENTS.md`
- package `AGENTS.md` if present

## Goal

Keep docs technically correct, concise, and aligned with the documented page structure.

## Default flow

1. Build an export inventory from `src/index.ts`.
2. Compare it with `docs/<name>/`.
3. Update `api.md` first, then `usage.md`, `index.md`, `examples.md`, and `examples/*.md`.
4. Rebuild docs.
5. Rebuild `codex` so the bundled MCP data matches the docs.

## Output shape

Report per file using `[ACTION] <file>: <summary>` (changed) or `[SKIP] <file>: <reason>` (already correct) — see `.ai/core/policy.md`'s Structured markers. Flag anything you couldn't verify from source with `[VERIFY]`.

## Required validation

```bash
pnpm docs:build
pnpm --filter @vielzeug/codex build
```

