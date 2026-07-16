# AGENTS.md — .ai/state

## Purpose

Ephemeral AI run state. This subtree is intentionally gitignored except for this contract file. This is the canonical contract — `.ai/core/policy.md` and `.ai/core/workspace.md` link here instead of restating it.

## Contract

- Store resumable scratch state only when a task genuinely needs it, under one directory per active scope: `.ai/state/<scope>/` (a package slug, or a short cross-package effort name).
- Two file shapes cover every real need — use either or both, never invent a third:
  - `.ai/state/<scope>/state.json` — structured resumable status (task, goal, step tracking). See the shape below.
  - `.ai/state/<scope>/report.md` — a prose artifact (an `analyze` plan, a `change` implementation note) when the output is naturally read as text. Overwrite it on each re-run against the same scope — it's a working snapshot, not a log.
- Do not treat this directory as project history — it's disposable working memory for the current effort.
- Delete stale state only when it is actively misleading tooling or agents.

## Recommended shape (`state.json`)

```json
{
  "scope": "orbit",
  "task": "change",
  "goal": "simplify positioning API",
  "status": "in_progress",
  "steps": {
    "baseline": "done",
    "implement": "done",
    "validate": "pending"
  },
  "notes": ["Fix downstream prism tests after API rename"]
}
```

