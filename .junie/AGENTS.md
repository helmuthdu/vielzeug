# Junie Project Guidelines

This file is loaded automatically by Junie. Use Junie's IDE project model, symbol navigation,
refactorings, inspections, and run configurations before falling back to broad text searches or
ad hoc shell commands.

## Start every task

1. Inspect local VCS changes and preserve edits you did not make.
2. Open `.ai/README.md`, then the smallest matching playbook in `.ai/tasks/`.
3. Open the playbook's `Load` references.
4. Read the root `AGENTS.md` and the nearest subtree `AGENTS.md` before editing.
5. Use `.tool-versions` and the checked-in package scripts rather than the IDE's bundled Node
   runtime or guessed commands.

Source code and package manifests override generated references or prose when they disagree.

## IDE-first workflow

- Prefer Find Usages, symbol search, call hierarchy, type information, safe rename, and IDE
  inspections for code relationships.
- Use project-aware refactoring for public symbol renames, then inspect every changed consumer.
- Use terminal commands for existing pnpm, Rush, Vitest, Biome, and validation scripts.
- Keep changes surgical. Do not reformat or rewrite unrelated files, and do not overwrite
  concurrent local edits.
- Act without asking for routine implementation details. Ask only when requirements permit
  materially different designs or an approval-gated operation is required.

## Engineering rules

- Packages are independent strict-TypeScript libraries targeting ES2022 and publishing ESM plus
  CJS. Do not use `any` or add JavaScript under package `src/`.
- Do not add dependencies, commit, push, publish, release, or perform irreversible operations
  without explicit approval.
- External runtime dependencies require explicit approval; workspace dependencies use
  `workspace:*`.
- Public root exports go through `packages/<name>/src/index.ts`.
- Keep source, types, exports, behavior tests, docs, and examples aligned.
- Do not add compatibility aliases or silent fallbacks for breaking changes unless requested.
- Follow `.ai/core/conventions.md` for disposal, typed errors, development diagnostics, tests,
  and file layout.
- Use Biome through existing scripts; do not hand-format.
- Never weaken or remove tests to hide a failure.

## Local commands

Run commands from the repository root unless a package script requires otherwise:

```bash
pnpm setup
pnpm vitest run packages/<name>/src/__tests__/
pnpm --filter @vielzeug/<name> lint
pnpm --filter @vielzeug/<name> build
pnpm validate:docs -- --package=<name>
pnpm validate:repl -- --package=<name>
pnpm check:ai-data
```

Use `pnpm build`, `pnpm test`, and `pnpm lint` only when the change requires workspace-wide
validation. If the IDE launches a command with the wrong Node runtime, rerun it with the Node
version selected by `.tool-versions`.

For AI metadata changes, edit canonical `.ai/` sources, run `pnpm gen:ai-data`, then
`pnpm check:ai-data`. Generated blocks and client adapters are outputs, not editing surfaces.

## Completion

Use the narrowest validation that covers the changed surface and every affected dependent.
Report commands that could not run and their exact failure; do not infer success from inspection
alone.
