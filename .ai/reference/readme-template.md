# Vielzeug README Template

Shared structure for `packages/<name>/README.md`. A README is a package's npm landing page — short, scannable, and uniform across the monorepo. Depth lives in `docs/<name>/`, not in the README.

`pnpm validate:readme` enforces the structural rules below; it does not judge prose or code accuracy.

## Global rules

- One sentence describing what the package does, pulled from `.ai/data/packages.json`'s `description` field — never hand-maintained separately.
- Address the reader as "you". Active voice. No marketing language.
- Code first, prose second. The Quick Start snippet must be copy-paste runnable with all imports.
- No npm badges, no logos, no collapsible `<details>` blocks. The README is already short — folding content behind a toggle adds friction without saving space.
- Bespoke reference content (factory choosers, API tables, design notes) belongs in `docs/<name>/`, not the README. Link to it from the Documentation section.

## Required structure, in order

1. `# @vielzeug/<slug>` — package name as the sole `#` heading.
2. `> <description>` — one-line blockquote, immediately after the title, separated by a blank line. Matches `packages.json` `description`.
3. `## Installation` — fenced `sh` block with pnpm, npm, and yarn lines. CLI packages (codex) use `## Install and run` with an `npx` line instead.
4. `## Quick Start` — one fenced `ts` (or `sh` for CLI) block showing the minimal real usage, including imports and cleanup/dispose where applicable. One short paragraph after the block may clarify ownership boundaries.
5. `## Features` (optional) — bullet list, one line each, backtick-quoted API name first where applicable. Omit when the description + Quick Start already cover it.
6. `## Documentation` — link list to `https://vielzeug.dev/<slug>/` pages that exist (Overview, Usage, API, Examples, Migration). One bullet per page.
7. `## License` — exactly `MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.`

No other `##` sections are permitted. Package-specific guidance (testing setup, migration notes, design rationale) lives in `docs/<name>/` and is linked from the Documentation section.

## Archetype adaptations

Only one field changes by archetype: the Installation heading and its code block.

| Archetype | Installation heading | Code block |
| --- | --- | --- |
| **Library** (default) | `## Installation` | `pnpm add @vielzeug/<slug>` / `npm install` / `yarn add` |
| **CLI** (codex) | `## Install and run` | `npx -y @vielzeug/<slug>` |

Everything else is identical across all packages.

## Generated content

codex's tool tables are generated into `docs/codex/tools.md` by `packages/codex/scripts/generate-tool-docs.ts` (run as `postbuild`), never hand-edited. The README links to that page from its Documentation section. No other package has generated README content.

## Verification checklist

`pnpm validate:readme -- --package=<name>` checks objective structure. Run before declaring a README pass done:

- [ ] First line is `# @vielzeug/<slug>`
- [ ] Line 3 is `> <description>` (blockquote)
- [ ] `## Installation` (or `## Install and run` for codex) present
- [ ] `## Quick Start` present
- [ ] `## Documentation` present with at least one `https://vielzeug.dev/<slug>` link
- [ ] `## License` present and last section
- [ ] No npm badge images (`img.shields.io`)
- [ ] No `<details>` blocks
- [ ] No `##` sections outside the permitted set
