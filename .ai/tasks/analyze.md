# Analyze Task

Use this when the goal is to understand, review, redesign, or plan work on a package or subsystem.

## Load first

- `.ai/core/policy.md`
- `.ai/core/workspace.md`
- `.ai/core/conventions.md` when package source is in scope
- relevant `AGENTS.md` chain

## Goal

Produce a concrete, prioritized view of what should change.

## Rigor

Default is `full` — each of the four steps below gets its own dedicated pass; for a large package, review one area (architecture, DX, types) per pass rather than the whole tree at once. Use `quick` (see `.ai/core/policy.md`) to combine steps 1–3 into a single read-and-assess pass — still produce the same output shape.

## Default flow

1. Read the source and public API.
2. Read tests and docs only where they clarify the intended behavior.
3. Review architecture, API ergonomics, DX, maintainability, simplicity, and unnecessary complexity.
4. Produce a short plan with concrete changes, not vague investigations.

## Output shape

A good analysis includes:

- current-state summary
- prioritized findings — use `[FINDING]` for raw observations and `[DEFERRED]` for ones intentionally pushed out of scope (see `.ai/core/policy.md`'s Structured markers)
- concrete proposed changes
- validation implications
- follow-up ideas kept out of immediate scope

If the result needs to drive a later implementation pass, persist it as a report under `.ai/state/<scope>/` instead of inventing a custom markdown state machine.

