# Junie Project Guidelines

Follow the root `AGENTS.md`; it is the canonical entrypoint for every AI client and is not restated here.

## IDE-first workflow

- Prefer Find Usages, symbol search, call hierarchy, type information, safe rename, and IDE inspections over broad text searches for code relationships.
- Use project-aware refactoring for public symbol renames, then inspect every changed consumer.
- Run the checked-in pnpm, Rush, Vitest, Biome, and validation scripts from the terminal. If the IDE launches a command with the wrong Node runtime, rerun it with the version selected by `.tool-versions`.
- Do not overwrite concurrent local edits or reformat unrelated files.
