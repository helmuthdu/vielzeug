# pkg-repl — REPL / Playground Examples Update

> **Canonical source:** This file is the single source of truth for all AI tools. Tool-specific stubs in `.claude/commands/`, `.devin/workflows/`, and `.junie/workflows/` delegate here.

You are updating the interactive playground examples for a **Vielzeug** package.

## 0. Agent execution model

Follow `.ai/rules/agent-execution.md` — universal principles, decision framework, anti-patterns, markers, and convergence rules.

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

Monorepo conventions → `.ai/rules/conventions.md`
Package catalogue and dependency graph → `.ai/rules/catalogue.md`
Toolchain commands → `.ai/rules/workspace.md`

Read the DOX chain before starting: root `AGENTS.md` → `docs/AGENTS.md` → `packages/<name>/AGENTS.md`.

**DOM-output packages are excluded from the REPL** — the REPL has no preview container. The authoritative list is the `DOM-output` column in `.ai/rules/catalogue.md § Package metadata`. If asked to add REPL examples for a DOM-output package, emit `[SKIP]` and explain.

**`code` strings must be plain JavaScript — no TypeScript syntax.** The browser REPL does not transpile. TypeScript annotations (`type`, `interface`, `: Type`, `<T>`, `as Type`, `!`) will cause syntax errors at runtime.

Prefer `mcp0_get-source` and `mcp0_get-docs` for current API data before reading source file-by-file.

### REPL structure

- Public REPL page: `docs/repl.md`
- Package example data: `docs/.vitepress/theme/components/repl/examples/<name>/`
- Each example module exports an object with at least `name` (picker label) and `code` (runnable plain JS string)
- Package folder has an `index.ts` that imports and registers its example modules
- Root registry: `docs/.vitepress/theme/components/repl/examples/index.ts`
- Monaco type support: `docs/.vitepress/theme/components/repl/types/`

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
- If the package has Monaco typings, do `types/index.ts` and `types/<name>.ts` still reflect the demonstrated API?

```
✅ CHECKPOINT: Step 2 — Gap analysis complete
- Stale examples (removed/renamed API): [list or "none"]
- Missing examples (new exports): [list or "none"]
- Antipattern examples: [list or "none"]
- Monaco types up to date: YES / NO
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
- **Write plain JavaScript only** — strip all TypeScript syntax from `code` strings.
- Remove duplicated, outdated, or no-longer-demonstrative examples.

For new examples:

- Create a new `.ts` example module in `docs/.vitepress/theme/components/repl/examples/<name>/`.
- Export a descriptive object with `name` and `code`.
- Register it in `docs/.vitepress/theme/components/repl/examples/<name>/index.ts`.
- Use a kebab-case registry key whose prefix produces the desired selector category.

**Net-new package (no `examples/<name>/` folder yet):**

Read an existing package as a structural reference (e.g. `docs/.vitepress/theme/components/repl/examples/ripple/`). Then:

1. Create `docs/.vitepress/theme/components/repl/examples/<name>/` with at least one example module and an `index.ts` exporting a `Record<string, ExampleModule>`.
2. Create `docs/.vitepress/theme/components/repl/types/<name>.ts` with Monaco type declarations for the package's public API.
3. Register the package in the root `docs/.vitepress/theme/components/repl/examples/index.ts` and `docs/.vitepress/theme/components/repl/types/index.ts` — follow the exact pattern of the reference package.
4. Create `docs/.vitepress/theme/components/repl/libraries/<name>.ts` with three named exports:
   - `description` — one-line string describing the package
   - `loader` — `() => import('@vielzeug/<name>')` (or a custom async function if multiple sub-paths are needed)
   - `apiExports` — `as const` array of every **runtime-value** export from `src/index.ts` (omit type-only exports)

   Register in `docs/.vitepress/theme/components/repl/libraries/index.ts` — **two additions required**, sorted alphabetically:
   - Add `import * as <name> from './<name>';` with the other imports
   - Add `<name>,` to the `ALL` object

   **Do not edit `REPL.vue`** — it imports everything from `repl/libraries/index.ts`.

5. Add the source alias to `scripts/vitest.repl.config.ts` (sorted alphabetically):
   ```ts
   '@vielzeug/<name>': path.resolve(ROOT, 'packages/<name>/src/index.ts'),
   ```
6. Add the Vite resolve alias to `docs/.vitepress/config.ts` (sorted alphabetically):
   ```ts
   '@vielzeug/<name>': resolve(__dirname, '../../packages/<name>/src'),
   ```
   Both aliases are required — omitting step 5 causes `validate:repl` to fail; omitting step 6 causes `docs:build` to fail.

```
✅ CHECKPOINT: Step 3 — Examples updated
- Updated: N ([UPDATED] list)
- Added: N ([ADDED] list)
- Removed: N ([REMOVED] list with reasons)
- Monaco types changed: YES / NO
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
- Monaco types: updated / unchanged
- validate:repl: PASS
- docs:build: PASS
```

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
