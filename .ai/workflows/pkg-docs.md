# pkg-docs — Documentation Sync

> **Canonical source:** This file is the single source of truth for all AI tools. Generated, gitignored stubs in `.claude/commands/` and `.devin/workflows/` delegate here (see `.ai/workflows/manifest.json` + `pnpm gen:workflow-docs`); `.junie/guidelines.md` links here directly with no stub file.

You are a technical writer and software engineer keeping the **Vielzeug** VitePress docs in sync with the source code and the canonical documentation template.

Your job is to:

- Ensure docs are **technically accurate** and **complete** for the current API.
- Enforce the **Vielzeug Documentation Template** structure, tone, and formatting.
- Remove or update any obsolete, redundant, or inaccurate content.
- Keep docs concise, practical, and easy to navigate.

## 0. Agent execution model

Follow `.ai/rules/agent-execution.md` for universal principles, decision framework, anti-patterns, and markers.

### Workflow-specific markers

| Marker     | Meaning                                       |
| ---------- | --------------------------------------------- |
| `[ACTION]` | Edit you are about to make                    |
| `[SKIP]`   | Item reviewed, no change needed (with reason) |

### Execution checkpoints

After each numbered step, output a checkpoint summary before proceeding:

```
✅ CHECKPOINT: Step N complete
- Key findings: <bullet list>
- Decisions made: <bullet list>
- Files to modify: <list>
- Proceeding to Step N+1
```

### Decision framework (docs-specific)

1. **Source code is truth** — if docs and source disagree, source wins.
2. **Template rules are mandatory** — structure and formatting rules in `.ai/rules/doc-template.md` are not suggestions.
3. **Diátaxis quadrant determines content** — never mix reference into how-to or vice versa.
4. **Minimal diff principle** — prefer surgical edits over rewrites when content is correct but misformatted.
5. **When uncertain, read more** — use MCP tools or read source before guessing.

## 1. Context

Monorepo conventions → `.ai/rules/conventions.md`
Package catalogue and dependency graph → `.ai/rules/catalogue.md`
**Documentation template, page structures, tone rules, archetypes, and compliance checklists → `.ai/rules/doc-template.md`**

Read the DOX chain before editing: root `AGENTS.md` → `docs/AGENTS.md` → `packages/<name>/AGENTS.md`.

**Prefer the `@vielzeug` MCP for source-of-truth API data** before reading source file-by-file. Use `get-docs` and `get-source` for most packages; for `refine` use `list-components` / `get-component`.

Package docs live at `docs/<name>/` with these standard pages:

| File            | Purpose                                                   |
| --------------- | --------------------------------------------------------- |
| `index.md`      | What the library is, why to use it, and how to install it |
| `usage.md`      | Practical how-to guide, from basic to advanced            |
| `api.md`        | Complete API reference — every export, every option       |
| `examples.md`   | Navigation index for individual example recipes           |
| `examples/*.md` | Individual self-contained recipes                         |

The MCP server (`packages/codex/`) bundles these docs. **Always** rebuild codex at the end of a docs pass — stale bundled docs silently corrupt MCP context for future sessions:

```bash
pnpm --filter @vielzeug/codex build
```

## 2. Workflow

### Step 1 — Inventory the public API

**Goal:** Build a complete, authoritative list of what the package exports.

1. Prefer MCP first — call the `@vielzeug` MCP's source-lookup tool with `packageSlug: "<name>"` to get the current `index.ts` (resolve the exact tool name from your client's MCP tool list, don't assume a fixed prefix).
2. Fallback: read `packages/<name>/src/index.ts` directly.
3. Extract every exported symbol into a structured list:

   ```
   EXPORT INVENTORY for @vielzeug/<name>:
   - Functions: functionA(), functionB(options)
   - Types: TypeA, TypeB, OptionsC
   - Classes: ClassX, ErrorY
   - Constants: CONST_Z
   ```

4. Note signatures, JSDoc, defaults, edge cases, and deprecation markers.
5. Check for sub-path exports — read `package.json` exports field.

```
✅ CHECKPOINT: Step 1 complete
- Total exports: N (X functions, Y types, Z classes)
- Sub-path exports: [list or "none"]
- Deprecated symbols: [list or "none"]
- Proceeding to Step 2
```

### Step 2 — Audit existing docs against the API

**Goal:** Identify every discrepancy between source and docs.

1. Read all doc files — `index.md`, `usage.md`, `api.md`, `examples.md`, every `examples/*.md`.
2. For each export from Step 1, check:

   | Check                        | Pass | Fail action                                |
   | ---------------------------- | ---- | ------------------------------------------ |
   | Documented in `api.md`?      | ✅   | `[FINDING] Missing: <symbol>`              |
   | Signature correct?           | ✅   | `[FINDING] Stale signature: <symbol>`      |
   | Behaviour accurate?          | ✅   | `[FINDING] Wrong behaviour: <symbol>`      |
   | In `usage.md` if applicable? | ✅   | `[FINDING] Missing usage: <symbol>`        |
   | Has example if warranted?    | ✅   | `[FINDING] Missing example: <symbol>`      |
   | Deprecated marked?           | ✅   | `[FINDING] Unmarked deprecation: <symbol>` |

3. Scan docs for obsolete content — symbols referenced in docs but NOT in Step 1 inventory:
   - `[FINDING] Obsolete: <symbol> (removed from API)`
   - `[FINDING] Obsolete option: <option> on <function>`

4. Check frontmatter — especially `index.md` `exports` array must match Step 1.

```
✅ CHECKPOINT: Step 2 complete
- Findings: N issues
  - Missing docs: [list]
  - Stale signatures: [list]
  - Obsolete content: [list]
- Coverage: X/Y exports documented
- Proceeding to Step 3
```

### Step 3 — Sync `examples/` with the current API

**Goal:** Ensure every example file is current, and no stale or missing recipes exist.

1. List all example files — `find docs/<name>/examples -name '*.md'`
2. For each example file, apply this decision tree:

   ```
   Does the recipe use any removed/renamed API?
   ├─ YES → [ACTION] Delete file + remove from examples.md
   └─ NO → Does the recipe use stale signatures/options?
            ├─ YES → [ACTION] Rewrite to current API
            └─ NO → Does it follow the examples/<slug>.md template in doc-template.md?
                     ├─ YES → [SKIP] Recipe OK
                     └─ NO → [ACTION] Reformat to template
   ```

3. For each new API from Step 1 findings, decide whether a recipe is warranted:

   ```
   Is this a primary factory/function?
   ├─ YES → [ACTION] Create recipe: examples/<slug>.md
   └─ NO → Is it a significant new option/mode?
            ├─ YES → [ACTION] Add variation to existing recipe OR create new
            └─ NO → [SKIP] No dedicated example needed
   ```

4. Sync `examples.md` — must exactly match files on disk. Order: basic → advanced.

```
✅ CHECKPOINT: Step 3 complete
- Examples deleted: [list or "none"]
- Examples updated: [list or "none"]
- Examples created: [list or "none"]
- examples.md synced: yes/no
- Proceeding to Step 4
```

### Step 4 — Update each doc page

**Goal:** Apply all findings from Steps 2–3 and enforce template compliance.

**Before editing any page**, identify the package archetype and any template exceptions declared in `packages/<name>/AGENTS.md`. Consult `.ai/rules/doc-template.md` for:

- The full archetype table (Library, CLI, DOM-output, Build tool, Pure type)
- All page template structures (`index.md`, `usage.md`, `api.md`, `examples.md`, `examples/<slug>.md`)
- Tone and language rules
- All compliance rules

Output the archetype gate before editing:

```
[ACTION] Archetype: <Library | CLI | DOM-output | Build tool | mixed>
[ACTION] Adaptations: <list of template overrides, or "none">
```

**Execution order** (dependencies flow downward):

1. `api.md` — source of truth for signatures; other pages reference it
2. `usage.md` — may link to `api.md` sections
3. `index.md` — `exports` frontmatter must match `api.md`
4. `examples.md` — must match `examples/*.md` files on disk
5. `examples/*.md` — already handled in Step 3, but verify links

For each page, output `[ACTION] <filename>: <summary of changes>` or `[SKIP] <filename>: No changes needed`.

```
✅ CHECKPOINT: Step 4 complete
- Pages updated: [list]
- Pages unchanged: [list]
- Proceeding to Step 5
```

### Step 5 — Verify and build

**Goal:** Catch errors before declaring done. This step is **mandatory**.

**Compliance self-check** (see `.ai/rules/doc-template.md` for the full checklists):

- [ ] All signatures in `api.md` match `src/index.ts` exactly
- [ ] All code blocks use current API
- [ ] `index.md` has all required frontmatter fields, `<PackageHero>`, `## Why`, comparison table, decision-callout
- [ ] `usage.md` has `[[toc]]`, ends with Best Practices
- [ ] `api.md` has `## API Overview` with 4 columns, `## Package Entry Point`
- [ ] `examples.md` links match files on disk
- [ ] Each `examples/*.md` has Problem/Solution/Pitfalls/Related structure
- [ ] No dead internal links

**Sidebar sync** — if you added or removed `examples/*.md` files, update `docs/.vitepress/config.ts`.

**Docs build (required):**

```bash
pnpm docs:build
```

If build fails, fix the error before proceeding. Common issues: invalid frontmatter YAML, dead links, markdown syntax errors.

**Codex bundle (required):**

```bash
pnpm --filter @vielzeug/codex build
```

```
✅ CHECKPOINT: Step 5 complete
- Diátaxis check: PASS
- Technical accuracy: PASS
- Template compliance: PASS
- Link validation: PASS
- Sidebar synced: yes/no/N/A
- docs:build: PASS
- codex build: PASS
- Ready for final report
```

### Step 6 — Report

Output this exact structure:

```
## pkg-docs Report: <name>

### Summary
- **Package:** `<name>`
- **API coverage:** X/Y exports documented (100% / partial)
- **Pages updated:** `index.md`, `api.md`, `usage.md`, `examples.md`, `examples/foo.md`
- **Pages unchanged:** [list or "none"]

### Examples Delta
- **Created:** [list with one-line descriptions]
- **Updated:** [list with change summaries]
- **Deleted:** [list with reasons]

### Notable Changes
1. <change 1>
2. <change 2>
3. <change 3>

### Verification
- docs:build: ✅ PASS
- codex build: ✅ PASS
- Sidebar synced: ✅ YES / ⚠️ N/A

### Follow-up (if any)
- [BLOCKED] <item needing user input>
- [VERIFY] <item needing manual check>
```

## 3. Quick reference — execution flow

```
Step 1: Inventory API    → Checkpoint
    ↓
Step 2: Audit docs       → Checkpoint (findings list)
    ↓
Step 3: Sync examples    → Checkpoint (delta list)
    ↓
Step 4: Update pages     → Archetype gate → [ACTION]/[SKIP] per file → Checkpoint
    ↓
Step 5: Verify & build   → Checkpoint (all checks pass)
    ↓
Step 6: Report           → Structured summary
```
