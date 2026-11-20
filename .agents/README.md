# `.agents/` in the Vielzeug repository

Agent-facing material that ships with the monorepo. Workflow procedure for implement, test, review, and deliver tasks lives in **klugzeug** on each machine, not in this directory.

## In this repository

| Path | Role |
| ---- | ---- |
| `README.md` | This index. |
| `conventions.md` | Engineering rules for `packages/**` source (API, disposal, errors, tests, layout). |
| `reference/docs-template.md` | Structural contract for `docs/<name>/` pages (`docs` skill uses it via the profile). |
| `reference/readme-template.md` | README shape enforced by `validate:readme`. |
| `reference/security-checklist.md` | Project security prompts for the `review` `security` lens. |
| `reference/packages.md` | Generated package tables (dependency graph + navigation) — edit manifests, then `bun run gen:ai-data`. |
| `reference/recipes.md` | Task recipes: task → files to touch → gate, for cross-cutting changes. |
| `reference/refine-design.md` | Refine design principles and improvement lenses (moved from `packages/refine/AGENTS.md`). |
| `skills/vielzeug` | Symlink to `packages/codex/skills/vielzeug/SKILL.md` — consumer skill for `@vielzeug/*` usage. |

Repo-wide policy, commands, and validation gates: root `AGENTS.md` → **Project profile**.

## Installed per machine (not in git)

| Path | Role |
| ---- | ---- |
| `~/.agents/skills/{plan,build,test,review,docs,deliver,pipeline,onboard}/` | Task procedure skills. |
| `~/.agents/klugzeug/contract.md` | Shared markers, findings format, plan structure, validation cadence, report. |
| `~/.agents/klugzeug/browser-verification.md` | Optional post-gate UI check referenced from the profile and `build` skill. |

Do not add workflow skill files under `.agents/skills/` in this repo: `bun run check:ai-data` validates every `.agents/...` path mentioned in committed files and would fail on missing skill paths. Document workflow skills with `~/.agents/skills/<name>/` paths instead.

## Subtree `AGENTS.md`

Local rules only when they are not already in root `AGENTS.md` or `conventions.md`. Each subtree file carries a `> Read when:` line; the authoritative index of every subtree file and its read condition is the generated **Subtree AGENTS.md index** at the end of root `AGENTS.md` (`bun run gen:ai-data` renders it, `check:ai-data` guards it). `.github/AGENTS.md` and `.junie/AGENTS.md` are client entrypoints their clients auto-load, not routed entries.