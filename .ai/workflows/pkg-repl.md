# pkg-repl — REPL / Playground Examples Update

> **Canonical source:** This file is the single source of truth for all AI tools. Generated, gitignored stubs in `.claude/commands/` and `.devin/workflows/` delegate here (see `.ai/workflows/manifest.json` + `pnpm gen:workflow-docs`); `.junie/guidelines.md` links here directly with no stub file.

You are updating the interactive playground examples for a **Vielzeug** package.

## 0. Agent execution model

Follow `.ai/rules/process/agent-execution.md` — universal principles, decision framework, anti-patterns, markers, and convergence rules.

### Workflow-specific markers

| Marker      | Meaning                                 |
| ----------- | --------------------------------------- |
| `[STALE]`   | Example uses a removed or renamed API   |
| `[UPDATED]` | Example fixed or improved               |
| `[ADDED]`   | New example created                     |
| `[REMOVED]` | Example deleted (always include reason) |

### Execution checkpoints

After each step, output a checkpoint before proceeding:

```
✅ CHECKPOINT: Step N — <Name> complete
- <step-specific fields (see below)>
- Proceeding to Step N+1
```

## 1. Context

See `.ai/rules/process/agent-execution.md § Context pointers` and `§ DOX chain` (docs variant).

**DOM-output packages are excluded from the REPL** — the REPL has no preview container. The authoritative list is the `DOM-output` column in `.ai/rules/data/catalogue.md § Package metadata` (kept in sync with `REPL_EXCLUDED_PACKAGES` in `scripts/vielzeug-packages.ts`). If asked to add REPL examples for a DOM-output package, emit `[SKIP]` and explain.

**`code` strings should stay plain JavaScript by convention** — not a technical requirement (the editor transpiles real TypeScript via Monaco's TS worker before running), but plain JS keeps shipped examples maximally copy-pasteable outside the REPL too. Write `code` as a real multi-line template literal (`` code: `...` ``), never a single-line string with escaped `\n` — the latter is unreadable in diffs and gets no editor syntax highlighting.

Prefer the `@vielzeug` MCP's source/docs lookup tools for current API data before reading source file-by-file (resolve exact tool names from your client's MCP tool list, don't assume a fixed prefix).

### REPL structure

- Public REPL page: `docs/repl.md`
- Package example data: `docs/.vitepress/theme/components/repl/examples/<name>/`
- Each example module exports an object with at least `name` (picker label) and `code` (runnable plain JS template literal)
- Package folder has an `index.ts` that imports and registers its example modules
- Root registry: `docs/.vitepress/theme/components/repl/examples/index.ts`
- Sandbox execution engine (Monaco loading/transpile, import rewriting, `@vielzeug/sandbox`-based iframe execution): `docs/.vitepress/theme/components/repl/execution/`
- Library metadata (description, global name, dependency order, `apiExports`, Monaco types, sandbox IIFE bundle) is **generated, not authored** — see the net-new-package steps under § Step 3 below.

## 2. Style & quality

- Explain intent before implementation: a one-line comment at the top of each snippet.
- Prefer **real-world-flavoured demos** over contrived toys.
- **One concept per snippet**, between **10–40 lines** of runnable code.
- Align examples with patterns shown in `docs/<name>/usage.md` and `docs/<name>/examples/*.md`.
- Examples must use only top-level `@vielzeug/<name>` imports — no external dependencies, no non-browser APIs.
- Each example should produce visible console output or a final returned value.

## 3. Process

### Step 1 — Audit current examples

**Goal:** Build a complete inventory of existing examples and their accuracy against the current API.

Read:

- `docs/.vitepress/theme/components/repl/examples/index.ts`
- `docs/.vitepress/theme/components/repl/examples/<name>/index.ts`
- Every example module in `docs/.vitepress/theme/components/repl/examples/<name>/`
- `packages/<name>/src/index.ts`

For each example module, note: the file name, registry key, picker category implied by the key prefix, which public exports it demonstrates, whether the `code` string matches the current API, and whether it demonstrates idiomatic browser-REPL usage.

Emit `[STALE]` for any example using a removed or renamed export.

```
✅ CHECKPOINT: Step 1 — Audit complete
- Examples found: N modules, K categories
- Exports demonstrated: [list]
- Exports with no example: [list or "none"]
- [STALE] examples: [list or "none"]
- Proceeding to Step 2
```

### Step 2 — Identify stale or missing examples

**Goal:** Produce a concrete change plan before touching any files.

Cross-reference against `packages/<name>/src/index.ts`:

- Are there new exports with no REPL example?
- Do any examples use removed or renamed APIs?
- Are any examples demonstrating antipatterns the current docs discourage?
- Is the package correctly registered in the root `examples/index.ts`?

Monaco typings, `apiExports`, the sandbox IIFE bundle, and dependency load order are all generated by `pnpm gen:repl-registry` (see `scripts/generate-repl-registry.ts`) straight from each package's build output (`dist/index.d.ts`, `dist/<name>.iife.js`, `vite.bundle.config.ts`) — there is nothing to hand-audit here. If generated types look stale, the fix is rebuilding the package (`pnpm --filter @vielzeug/<name> build`) and regenerating, not hand-editing a types file.

```
✅ CHECKPOINT: Step 2 — Gap analysis complete
- Stale examples (removed/renamed API): [list or "none"]
- Missing examples (new exports): [list or "none"]
- Antipattern examples: [list or "none"]
- Proceeding to Step 3
```

### Step 3 — Update / Remove / Create examples

**Goal:** Implement all changes identified in Step 2.

For each existing example:

- Fix stale API usage inside the `code` string.
- Add or update a one-line comment header.
- Keep examples focused — one concept, 10–40 lines.
- Use descriptive variable names; avoid `x`, `y`, `tmp`.
- Ensure the snippet logs or returns something useful.
- **Write plain JavaScript by convention** — see § Context above.
- Remove duplicated, outdated, or no-longer-demonstrative examples.

For new examples:

- Create a new `.ts` example module in `docs/.vitepress/theme/components/repl/examples/<name>/`.
- Export a descriptive object with `name` and `code`.
- Register it in `docs/.vitepress/theme/components/repl/examples/<name>/index.ts`.
- Use a kebab-case registry key whose prefix produces the desired selector category.

**Net-new package (no `examples/<name>/` folder yet):**

Read an existing package as a structural reference (e.g. `docs/.vitepress/theme/components/repl/examples/ripple/`). Then:

1. Create `docs/.vitepress/theme/components/repl/examples/<name>/` with at least one example module and an `index.ts` exporting a `Record<string, ExampleModule>`.
2. Register the package in the root `docs/.vitepress/theme/components/repl/examples/index.ts` — follow the exact pattern of the reference package.
3. Add a one-line `description` for the package to the `DESCRIPTIONS` map in `scripts/generate-repl-registry.ts` — this is the only hand-curated metadata left; everything else (global name, dependency order, `apiExports`, Monaco types, sandbox bundle) is derived automatically from `packages/<name>/`'s `vite.bundle.config.ts` and build output.
4. Ensure the package is actually built (`pnpm --filter @vielzeug/<name> build` — needs `dist/index.d.ts` and `dist/<name>.iife.js` to exist).
5. Run `pnpm gen:repl-registry` to regenerate `docs/.vitepress/theme/components/repl/registry.generated.ts`.

   **Do not edit `REPL.vue`, `REPLEditor.vue`, or the generated registry file by hand** — the registry is regenerated from source on every `docs:dev` / `docs:build` / `docs:preview` and any manual edits are silently overwritten.

No alias registration is needed for `docs/.vitepress/config.ts` or `scripts/vitest.repl.config.ts` — both derive their `@vielzeug/*` alias maps from the `packages/` directory listing (`scripts/vielzeug-packages.ts`) automatically. The only remaining exclusion list to update, if the new package is DOM-output, is `REPL_EXCLUDED_PACKAGES` in that same file.

```
✅ CHECKPOINT: Step 3 — Examples updated
- Updated: N ([UPDATED] list)
- Added: N ([ADDED] list)
- Removed: N ([REMOVED] list with reasons)
- Registry regenerated (net-new package only): YES / N/A
- Proceeding to Step 4
```

### Step 4 — Verify examples compile and run

**Goal:** Confirm all examples execute without errors and produce useful output.

1. Run the REPL example validator:

   ```bash
   pnpm validate:repl -- --package <name>
   ```

   Fix any failures before proceeding. Common causes: removed or renamed exports, missing top-level `await`, unhandled promise rejections at module scope.

2. Run the docs build:

   ```bash
   pnpm docs:build
   ```

3. Confirm each passing snippet produces meaningful console output or a final returned value.

```
✅ CHECKPOINT: Step 4 — Verification complete
- validate:repl: PASS / ❌ FAIL (describe failures)
- docs:build: PASS / ❌ FAIL
- Runtime sanity: all examples produce output / [exceptions]
- Proceeding to Step 5
```

### Step 5 — Report

Output using **exactly this format**:

```
## REPL Examples Report

### Baseline
- Examples before: N modules, K categories
- Package registered: YES / NO (net-new)

### Changes

| Category | Count | Details |
|----------|-------|---------|
| [UPDATED] | N | <list> |
| [ADDED] | N | <list> |
| [REMOVED] | N | <list with reasons> |

### Final State
- Examples after: N modules, K categories
- Registry regenerated: YES / N/A
- validate:repl: PASS
- docs:build: PASS
```

Write this report to `.ai/workflows/runs/<name>/repl-report.md`, overwriting any prior contents (see `.ai/rules/process/agent-execution.md § Run artifacts`). Present the same content in chat.

## 4. Quick reference — execution flow

```
Step 1: Audit examples         → Checkpoint (inventory + [STALE] markers)
    ↓
Step 2: Identify stale/missing → Checkpoint (gap list)
    ↓
Step 3: Update/Remove/Create   → Checkpoint ([UPDATED]/[ADDED]/[REMOVED])
    ↓
Step 4: Verify                 → validate:repl + docs:build → Checkpoint
    ↓
Step 5: Report                 → Structured summary
```
