# AGENTS.md — .ai/state

## Purpose

Ephemeral AI run state. This subtree is intentionally gitignored except for this contract file. This is the canonical contract — `.ai/core/policy.md` and `.ai/core/workspace.md` link here instead of restating it.

## Contract

- Store resumable scratch state only when a task genuinely needs it, under one directory per active scope: `.ai/state/<scope>/` (a package slug, or a short cross-package effort name).
- Two file shapes cover every real need — use either or both, never invent a third:
  - `.ai/state/<scope>/state.json` — structured resumable status (task, goal, step tracking, decision records). See the shape below.
  - `.ai/state/<scope>/report.md` — a prose artifact (a `review` report or `build` implementation note) when the output is naturally read as text. Overwrite it on each re-run against the same scope — it's a working snapshot, not a log.
- Record an `id`, `question`, `owner`, `outcome`, `status`, and `affected` array for each decision changing a public contract, architecture boundary, or multiple delegated scopes.
- Do not treat this directory as project history — it's disposable working memory for the current effort.
- `pnpm check:ai-data` validates this contract file but intentionally excludes `.ai/state/<scope>/` scratch files from canonical cross-reference checks.
- Delete stale state only when it is actively misleading tooling or agents.

## Recommended shape (`state.json`)

```json
{
  "scope": "orbit",
  "task": "build",
  "goal": "simplify positioning API",
  "status": "in_progress",
  "steps": {
    "baseline": "done",
    "implement": "done",
    "validate": "pending"
  },
  "decisions": [
    {
      "id": "orbit-positioning-api",
      "question": "Which API owns positioning configuration?",
      "owner": "primary-planner",
      "outcome": "Use one options object on createPositioner.",
      "status": "accepted",
      "affected": ["src/index.ts", "src/positioner.ts", "README.md"]
    }
  ],
  "notes": ["Fix downstream prism tests after API rename"]
}
```
