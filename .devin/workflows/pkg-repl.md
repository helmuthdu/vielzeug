---
description: Update the interactive REPL / playground examples for a Vielzeug package so they reflect the current public API and recommended usage patterns.
---

# pkg-repl — REPL / Playground Examples Update

You are updating the interactive playground examples for a **Vielzeug** package.

## 0. Agent Execution Model

**This workflow is designed for autonomous agent execution across five sequential steps.** Follow these principles:

### Execution Checkpoints

After each step, **output a checkpoint summary** before proceeding:

```
✅ CHECKPOINT: Step N — <Name> complete
- <step-specific fields (see below)>
- Proceeding to Step N+1
```

### Decision Framework

When facing ambiguity, apply this priority order:

1. **Current API is truth** — use `mcp0_get-source` and `mcp0_get-docs` to verify the actual public API before writing or updating any `code` string. Never guess a function signature.
2. **Plain JavaScript only in `code` strings** — no TypeScript syntax whatsoever. When in doubt, strip it.
3. **One concept per example, 10–40 lines** — if a snippet covers two unrelated features, split it.
4. **Real-world over contrived** — demos should look like code a developer would actually write, not `x = foo(1, 2)`.
5. **DOM-output packages are excluded** — if asked to add REPL examples for `craft`, `sigil`, or `prism`, emit `[SKIP]` and explain.

### Anti-Patterns to Avoid

- ❌ **Do not** include TypeScript syntax (`type`, `interface`, `: Type`, `<T>`, `as Type`, `!`) in `code` strings — the browser REPL has no transpiler.
- ❌ **Do not** add REPL examples for DOM-output packages (`craft`, `sigil`, `prism`) — they have no preview container.
- ❌ **Do not** use external dependencies or non-browser APIs in `code` strings — only `@vielzeug/<name>` imports are allowed.
- ❌ **Do not** skip `pnpm validate:repl -- --package <name>` — a code string that crashes silently is worse than no example.
- ❌ **Do not** write abstract or toy examples (`add(1, 2)`, contrived math) — prefer realistic usage patterns.
- ❌ **Do not** update Monaco types without also updating the corresponding example code — they must stay in sync.

### Structured Output Markers

Use consistent markers throughout your output:

- `[STALE]` — example uses a removed or renamed API
- `[UPDATED]` — example fixed or improved
- `[ADDED]` — new example created
- `[REMOVED]` — example deleted (always include reason)
- `[SKIP]` — package is DOM-output or otherwise excluded from REPL
- `[VERIFY]` — requires manual browser test to confirm output

## 1. Context

- The public REPL page is `docs/repl.md`, which renders the custom Vue `<REPL />` component.
- The REPL implementation lives under `docs/.vitepress/theme/components/`, with package example data under `docs/.vitepress/theme/components/repl/examples/`.
- Each supported package has its own folder at `docs/.vitepress/theme/components/repl/examples/<name>/`.
- Each example is a TypeScript module that exports an object with at least:
  - `name`: the label shown in the example picker
  - `code`: a runnable **plain JavaScript** string executed by the browser REPL
- **`code` strings must be plain JavaScript — no TypeScript syntax.** The browser REPL does not transpile; TypeScript annotations (type parameters, type assertions, interface declarations, etc.) will cause a syntax error at runtime. Use JSDoc comments if type documentation is needed.
- Each package folder has an `index.ts` file that imports and registers its example modules.
- The root registry is `docs/.vitepress/theme/components/repl/examples/index.ts`.
- Example picker categories are inferred from the example key prefix in the package registry.
- Monaco type support for the REPL lives under `docs/.vitepress/theme/components/repl/types/`.
- Examples must use only top-level `@vielzeug/<name>` imports — no external dependencies and no non-browser APIs.
- Each example should be self-contained, produce visible output, and run quickly in the browser REPL.
- **DOM-producing packages are not supported in the REPL.** The REPL has no preview container, so packages whose primary output is a rendered DOM element or custom element (`craft`, `sigil`, `prism`) are intentionally excluded — they have no example folder or Monaco types. Do not add REPL examples for them unless a preview container is introduced.
- **Canonical context** — conventions, package catalogue, and the dependency graph live in `.devin/rules/conventions.md`. Consult it; do not duplicate or restate it.
- **Read the DOX chain first** — root `AGENTS.md` → `docs/AGENTS.md` (REPL ownership and the DOM-output exclusion list) → `packages/<name>/AGENTS.md`.
- **Prefer the `@vielzeug` MCP for current API data** so examples use real, current signatures. Use `get-docs` and `get-source` for most packages; for `sigil` use `list-components` / `get-component`.

## 2. Style & quality

- Direct and technical; avoid filler language in comments.
- Explain **intent before implementation**: a one-line comment at the top of each snippet.
- Prefer **real-world-flavoured demos** over contrived toys.
- Keep examples focused on **one concept per snippet** and between **10–40 lines** of runnable code.
- Align examples with the patterns shown in `docs/<name>/usage.md` and `docs/<name>/examples/*.md`.

## 3. Process

### Step 1 — Audit current examples

**Goal:** Build a complete inventory of existing examples and their accuracy against the current API. Emit `[STALE]` for any example using a removed or renamed export.

Before reading files, prefer `mcp0_get-source` and `mcp0_get-docs` for `<name>` to get the current API in a single call.

Read the following for the target package:

- `docs/.vitepress/theme/components/repl/examples/index.ts`
- `docs/.vitepress/theme/components/repl/examples/<name>/index.ts`
- Every example module in `docs/.vitepress/theme/components/repl/examples/<name>/`
- `packages/<name>/src/index.ts`

For each example module, note:

- The file name and exported example constant.
- The registry key used in `examples/<name>/index.ts`.
- The picker category implied by that key prefix.
- Which public exports it demonstrates.
- Whether the `code` string still matches the current public API.
- Whether it demonstrates good, idiomatic browser-REPL usage consistent with the docs.

**Checkpoint:**

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

Cross-reference against `packages/<name>/src/index.ts` and the REPL wiring:

- Are there new exports with no REPL example?
- Do any examples use removed or renamed APIs?
- Are any examples demonstrating antipatterns the current docs discourage?
- Is the package correctly registered in `docs/.vitepress/theme/components/repl/examples/index.ts`?
- If the package has REPL Monaco typings, do `types/index.ts` and `types/<name>.ts` still reflect the API being demonstrated?

**Checkpoint:**

```
✅ CHECKPOINT: Step 2 — Gap analysis complete
- Stale examples (removed/renamed API): [list or "none"]
- Missing examples (new exports): [list or "none"]
- Antipattern examples: [list or "none"]
- Monaco types up to date: YES / NO
- Proceeding to Step 3
```

### Step 3 — Update / Remove / Create examples

**Goal:** Implement all changes identified in Step 2. Emit `[UPDATED]`, `[ADDED]`, or `[REMOVED]` for every example touched.

For each existing example module:

- Fix any stale API usage inside the `code` string.
- Add or update a one-line comment header at the top of the code string.
- Keep examples focused — one concept per file, 10–40 lines of runnable code.
- Use descriptive variable names; avoid `x`, `y`, `tmp`.
- Prefer real-world-flavoured demos over abstract math or trivial examples.
- Ensure the snippet logs or returns something useful in the REPL output pane.
- Keep imports limited to `@vielzeug/<name>`.
- **Write plain JavaScript only** — strip all TypeScript syntax from the `code` string (no `: Type` annotations, no `<T>` generics, no `as Type` casts, no `interface`/`type` declarations).
- Remove any duplicated, outdated, deprecated, or examples that are no longer relevant or demonstrative of the current API and usage patterns.

For new examples:

- Create a new `.ts` example module in `docs/.vitepress/theme/components/repl/examples/<name>/`.
- Export a descriptive example object with at least `name` (picker label) and `code` (runnable snippet).
- Register it in `docs/.vitepress/theme/components/repl/examples/<name>/index.ts`.
- Use a kebab-case registry key whose prefix produces the desired selector category.

**Net-new package (no `examples/<name>/` folder yet):**

Before creating the folder, read an existing package as a structural reference (e.g. `docs/.vitepress/theme/components/repl/examples/ripple/`). Then:

1. Create `docs/.vitepress/theme/components/repl/examples/<name>/` with at least one example module and an `index.ts` that exports a `Record<string, ExampleModule>`.
2. Create `docs/.vitepress/theme/components/repl/types/<name>.ts` with the Monaco type declarations for the package's public API.
3. Register the package in the root `docs/.vitepress/theme/components/repl/examples/index.ts` and `docs/.vitepress/theme/components/repl/types/index.ts` — follow the exact pattern used by the reference package.
4. Create `docs/.vitepress/theme/components/repl/libraries/<name>.ts` with three named exports (see existing files for reference):
   - `description` — one-line string describing the package
   - `loader` — `() => import('@vielzeug/<name>')` (or a custom async function if multiple sub-paths are needed, like `orbit`)
   - `apiExports` — `as const` array of every **runtime-value** export from `src/index.ts` (omit type-only exports — they are not present on the module object at runtime)

   Then register the package in `docs/.vitepress/theme/components/repl/libraries/index.ts` — **two additions required**, sorted alphabetically:
   - Add `import * as <name> from './<name>';` with the other imports
   - Add `<name>,` to the `ALL` object

   **Do not edit `REPL.vue`** — it imports everything from `repl/libraries/index.ts` and never needs touching when adding a package.

5. Add the source alias to `scripts/vitest.repl.config.ts` so `pnpm validate:repl` can resolve the package **without a prior build**. In the `vielzeugAliases` object, add (sorted alphabetically):
   ```ts
   '@vielzeug/<name>': path.resolve(ROOT, 'packages/<name>/src/index.ts'),
   ```
6. Add the Vite resolve alias to `docs/.vitepress/config.ts` so `pnpm docs:build` can resolve the package. In the `vite.resolve.alias` object, add (sorted alphabetically):
   ```ts
   '@vielzeug/<name>': resolve(__dirname, '../../packages/<name>/src'),
   ```
   **Both aliases are required** — omitting step 5 causes `validate:repl` to fail with "Failed to resolve import"; omitting step 6 causes `docs:build` to fail with "Rollup failed to resolve import".

**Checkpoint:**

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

1. **Runtime validation** — run the REPL example validator against the target package. It extracts every `code` string, executes it in a jsdom environment (resolving `@vielzeug/*` from source), and reports failures:

   ```bash
   pnpm validate:repl -- --package <name>
   ```

   Fix any failures before proceeding. Common causes: removed or renamed exports, missing top-level `await` handling, unhandled promise rejections at module scope.

2. **Registry / docs integration** — ensure all new or renamed example modules are imported and exported correctly. Run the docs build:

   ```bash
   pnpm docs:build
   ```

3. **Runtime sanity** — confirm each passing snippet produces meaningful console output or a final returned value visible to the user.

**Checkpoint:**

```
✅ CHECKPOINT: Step 4 — Verification complete
- validate:repl: PASS / ❌ FAIL (describe failures)
- docs:build: PASS / ❌ FAIL
- Runtime sanity: all examples produce output / [exceptions]
- Proceeding to Step 5
```

### Step 5 — Report

**Goal:** Produce a concise, parseable summary of all changes.

Output the summary using **exactly this format**:

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

## 4. Quick Reference — Execution Flow

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

The user will tell you which package to update.
