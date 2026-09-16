# `.ai/`

Canonical agent instructions start at the root `AGENTS.md`; this folder holds what it links to.

- `core/conventions.md` — engineering conventions and the validation enforcement map
- `tasks/*.md` — task playbooks (`build`, `review`, `document`, `release`); frontmatter feeds the generated client stubs
- `reference/` — `packages.md` (generated from manifests), `docs-template.md`, `readme-template.md`, `security-checklist.md`

`pnpm gen:ai-data` regenerates derived files; `pnpm check:ai-data` verifies them and every `.ai/...` cross-reference in the repo.
