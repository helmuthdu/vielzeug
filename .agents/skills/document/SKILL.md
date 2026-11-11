---
name: document
description: Update package documentation pages, README content, docs recipes, or REPL examples against the validators and templates. Use when asked to document, write or fix docs, update a README, add a recipe or example, or fix a docs/REPL validation failure.
---

# Document

## Load

- root `AGENTS.md` (policy, safety, markers, commands)
- `.agents/reference/docs-template.md` for `docs/<name>/` pages
- `.agents/reference/readme-template.md` for `packages/<name>/README.md`
- `docs/AGENTS.md` for docs-site or REPL changes
- relevant package `AGENTS.md`

## Preconditions

Confirm the documentation surfaces and their owning source exist. For package docs, identify the package; for site-wide guides, identify the relevant source or configuration instead. Use `[BLOCKED]` for ambiguous scope or public behavior that source cannot confirm.

## Flow

1. Start from the selected page or example and read the source that controls its documented behavior. Read the package manifest and relevant entry points when package facts or API claims are affected; reuse evidence already in the task while its inputs remain unchanged.
2. Identify the package's documentation archetype and any validator contract (`.agents/reference/docs-template.md`) before applying the template.
3. For a full API documentation pass or export changes, inventory the affected public entry points, following re-export barrels. For a local correction, verify only the APIs and examples it touches.
4. Establish a pre-edit baseline only under the `build` skill's baseline preconditions; otherwise run the relevant structural validator after editing.
5. For API changes, update the API reference first, then propagate to affected overview, usage, README, recipes, and REPL examples. For local prose or example fixes, edit the affected surface without reopening unrelated pages.
6. Keep docs recipes (`docs/<name>/examples/`) distinct from REPL modules (`docs/.vitepress/theme/components/repl/`).
7. Update sidebar routes in `docs/.vitepress/config.ts` whenever a page is added, removed, or renamed: the build never catches a stale or missing sidebar link (`ignoreDeadLinks` is on). Verify with `bun run validate:sidebar -- --package=<name>`.
8. Run the validation row below for every touched surface.

## Surface rules

### Docs

Follow `.agents/reference/docs-template.md`. When a public export changed, inspect every recipe that names it; for a full documentation pass, inspect every recipe.

### REPL

Use plain JavaScript, one concept per snippet, top-level package imports only, visible output, and no DOM-output package examples. Rebuild package output before regenerating a stale REPL registry.

### README

Follow `.agents/reference/readme-template.md`. The description blockquote must equal `package.json#description`. Never hand-edit generated tool tables.

## Validation

Use focused source-backed or structural checks during iteration. Batch the final build gates below once after all docs changes, following root Build Scheduling; docs and REPL rows share the same Codex/site builds. For site-wide changes, omit the package filter instead of inventing a package scope. Structural validators do not prove example behavior: execute the affected example or relevant test when practical, otherwise report the runtime gap `[VERIFY]`.

| Surface                           | Run                                                                                                        |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Docs                              | `bun run validate:docs -- --package=<name>`, then `bun run --filter @vielzeug/codex build && bun run docs:build`    |
| Sidebar                           | `bun run validate:sidebar -- --package=<name>`                                                                |
| REPL                              | `bun run validate:repl -- --package=<name>`, then `bun run --filter @vielzeug/codex build && bun run docs:build`   |
| README structure                  | `bun run validate:readme -- --package=<name>`                                                                 |
