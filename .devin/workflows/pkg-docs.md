---
description: Synchronise the VitePress documentation for a Vielzeug package with its current source code, following the canonical Vielzeug Documentation Template. Updates index.md, api.md, usage.md, examples.md, and examples/*.md so they match the actual API and template rules.
---

# pkg-docs — Documentation Sync

You are a technical writer and software engineer keeping the **Vielzeug** VitePress docs in sync with the source code **and** the canonical documentation template.

Your job is to:

- Ensure docs are **technically accurate** and **complete** for the current API.
- Enforce the **Vielzeug Documentation Template** structure, tone, and formatting.
- Remove or update any obsolete, redundant, or inaccurate content.
- Keep docs concise, practical, and easy to navigate.

## 0. Agent Execution Model

**This workflow is designed for autonomous agent execution.** Follow these principles:

### Execution Checkpoints

After each numbered step, **pause and output a checkpoint summary** before proceeding:

```
✅ CHECKPOINT: Step N complete
- Key findings: <bullet list>
- Decisions made: <bullet list>
- Files to modify: <list>
- Proceeding to Step N+1
```

This creates a traceable audit trail and allows course correction.

### Decision Framework

When facing ambiguity, apply this priority order:

1. **Source code is truth** — if docs and source disagree, source wins.
2. **Template rules are mandatory** — structure/formatting rules in §4 are not suggestions.
3. **Diátaxis quadrant determines content** — never mix reference into how-to or vice versa.
4. **Minimal diff principle** — prefer surgical edits over rewrites when content is correct but misformatted.
5. **When uncertain, read more** — use MCP tools or read source before guessing.

### Anti-Patterns to Avoid

- ❌ **Do not** invent API behaviour not present in source.
- ❌ **Do not** copy-paste from other packages without verifying applicability.
- ❌ **Do not** leave placeholder text like `<description>` or `...` in final output.
- ❌ **Do not** skip the verification build (§5.6–5.7) — it catches silent errors.
- ❌ **Do not** proceed past a checkpoint if you found critical issues — fix them first.

### Structured Output Format

Use consistent markers for agent-parseable output:

- `[FINDING]` — discovered discrepancy or issue
- `[ACTION]` — edit you are about to make
- `[SKIP]` — item reviewed, no change needed (with reason)
- `[BLOCKED]` — cannot proceed without user input
- `[VERIFY]` — requires manual verification (e.g., runtime behaviour)

## 1. Context

- Vielzeug docs follow the **[Diátaxis](https://diataxis.fr/)** framework — documentation is organised by the reader's need, not the author's convenience. Each standard page maps to a primary quadrant:

  | File            | Diátaxis type | Reader's question                                          |
  | --------------- | ------------- | ---------------------------------------------------------- |
  | `index.md`      | Explanation   | "What is this, why does it exist, and is it right for me?" |
  | `usage.md`      | How-to Guide  | "How do I accomplish this specific task?"                  |
  | `api.md`        | Reference     | "What is the exact signature, behaviour, and contract?"    |
  | `examples.md`   | Navigation    | "Which recipe do I need?"                                  |
  | `examples/*.md` | How-to Guide  | "How do I solve this concrete problem end-to-end?"         |

  Applying this means: **never put opinionated guidance in `api.md`**, **never put exhaustive option tables in `usage.md`**, and **never use `index.md` to teach step-by-step**. The Quick Start in `index.md` is a motivating example, not a walkthrough.

- Package docs live at `docs/<name>/` with these standard pages:

  | File            | Purpose                                                   |
  | --------------- | --------------------------------------------------------- |
  | `index.md`      | What the library is, why to use it, and how to install it |
  | `usage.md`      | Practical how-to guide, from basic to advanced            |
  | `api.md`        | Complete API reference — every export, every option       |
  | `examples.md`   | Navigation index for individual example recipes           |
  | `examples/*.md` | Individual self-contained recipes                         |

- Docs are VitePress markdown; use fenced code blocks with language tags (e.g. ```ts).
- The MCP server (`packages/codex/`) bundles these docs. **Always** rebuild codex at the end of a docs pass — it is fast and idempotent, and stale bundled docs silently corrupt MCP context for future sessions:

  ```bash
  pnpm --filter @vielzeug/codex build
  ```

  (the `prebuild` hook runs `prepare:data` to refresh the bundled docs before compiling)

- Do **not** add extra top-level files unless the domain is truly complex. In those rare cases, list the extra file under a "Guides" heading in the sidebar, separate from the standard four pages.
- **Canonical context** — conventions, package catalogue, and the dependency graph live in `.devin/rules/conventions.md`. Consult it; do not duplicate or restate it.
- **Read the DOX chain first** — root `AGENTS.md` → `docs/AGENTS.md` (template/REPL ownership) → `packages/<name>/AGENTS.md` (sub-path exports, exceptions).
- **Prefer the `@vielzeug` MCP for source-of-truth API data** before reading source file-by-file — it reflects the current public API. Use `get-docs` and `get-source` for most packages; for `sigil` use `list-components` / `get-component`.

### Package archetypes

Not every package is a consumed library. Before applying the template, identify the archetype and apply the adaptations below. A package can belong to more than one row.

| Archetype | Indicators | Adaptations |
| --------- | ---------- | ----------- |
| **Library** (default) | `src/index.ts` exports functions/classes; imported by userland | No adaptations — use the full template as written |
| **CLI / executable tool** | `bin` field in `package.json`; primary interaction is a terminal command, not an import | Quick Start in `index.md` leads with the shell command, not a TypeScript snippet; `## Framework Integration` in `usage.md` is replaced with `## Embedding in a <Runtime> Process` showing programmatic use as a secondary option; comparison table compares deployment/invocation modes, not API surfaces |
| **DOM-output / headless UI** | Package renders DOM directly (e.g. `sigil`, `prism`); no REPL examples by convention | No REPL examples or Monaco types; `## Framework Integration` shows web-component usage in HTML/JS, not React/Vue/Svelte unless the package ships framework adapters |
| **Build / dev tool** | `devDependencies`-only; runs at build time, not runtime | Quick Start shows CLI invocation or config file; `## Basic Usage` in `usage.md` starts with config, not code; API reference may be a config schema, not function signatures |
| **Pure type package** | Exports only `type` and `interface`; no runtime code | Skip `## Quick Start` code block; `api.md` is types-only; no examples needed unless the types encode a non-obvious pattern |

**When in doubt:** read `package.json` (`bin`, `main`, `exports`, `engines`, `type`) and `src/cli.ts` or equivalent entry points before writing a single line of docs.

## 2. Tone and Language (global rules)

Apply these rules to **all** docs you edit:

- **Direct and technical.** Address the reader as "you". Prefer active voice. Avoid filler ("simply", "just", "easy", "straightforward").
- **Short sentences.** One idea per sentence. Paragraph length: 2–4 sentences.
- **Explain intent before implementation.** A one-line description before each code block is required.
- **Code first, prose second.** When in doubt, show code and annotate it rather than long prose.
- **No marketing language.** Do not write "powerful", "blazing fast", or "seamless". Use factual comparisons in tables instead.
- **Comments in code blocks** explain _why_, not _what_. One comment per meaningful block is enough. Never write multi-line comment blocks.

Prioritize **clarity and developer usability** over exhaustive verbosity.

## 3. Workflow

### Step 1 — Inventory the public API

**Goal:** Build a complete, authoritative list of what the package exports.

**Actions:**

1. **Prefer MCP first** — call `mcp0_get-source` with `packageSlug: "<name>"` to get the current `index.ts`. This is faster and guaranteed current.
2. **Fallback:** If MCP unavailable, read `packages/<name>/src/index.ts` directly.
3. **Extract every exported symbol** into a structured list:

   ```
   EXPORT INVENTORY for @vielzeug/<name>:
   - Functions: functionA(), functionB(options)
   - Types: TypeA, TypeB, OptionsC
   - Classes: ClassX, ErrorY
   - Constants: CONST_Z
   - Re-exports: { thing } from './submodule'
   ```

4. **Note signatures and JSDoc** — especially defaults, edge cases, and deprecation markers.
5. **Check for sub-path exports** — read `package.json` exports field; some packages have `/testing` or similar.

**Checkpoint output:**

```
✅ CHECKPOINT: Step 1 complete
- Total exports: N (X functions, Y types, Z classes)
- Sub-path exports: [list or "none"]
- Deprecated symbols: [list or "none"]
- Proceeding to Step 2
```

### Step 2 — Audit existing docs against the API

**Goal:** Identify every discrepancy between source and docs.

**Actions:**

1. **Read all doc files** — `docs/<name>/index.md`, `usage.md`, `api.md`, `examples.md`, and every `examples/*.md`.
2. **For each export from Step 1**, check:

   | Check | Pass | Fail action |
   |-------|------|-------------|
   | Documented in `api.md`? | ✅ | `[FINDING] Missing: <symbol>` |
   | Signature correct? | ✅ | `[FINDING] Stale signature: <symbol>` |
   | Behaviour accurate? | ✅ | `[FINDING] Wrong behaviour: <symbol>` |
   | In `usage.md` if applicable? | ✅ | `[FINDING] Missing usage: <symbol>` |
   | Has example if warranted? | ✅ | `[FINDING] Missing example: <symbol>` |
   | Deprecated marked? | ✅ | `[FINDING] Unmarked deprecation: <symbol>` |

3. **Scan docs for obsolete content** — any symbol referenced in docs but NOT in Step 1 inventory:
   - `[FINDING] Obsolete: <symbol> (removed from API)`
   - `[FINDING] Obsolete option: <option> on <function>`

4. **Check frontmatter** — especially `index.md` `exports` array must match Step 1.

**Checkpoint output:**

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

**Goal:** Ensure every example file is current, and no stale/missing recipes exist.

**Actions:**

1. **List all example files** — `find docs/<name>/examples -name '*.md'`
2. **For each example file**, apply this decision tree:

   ```
   Does the recipe use any removed/renamed API?
   ├─ YES → [ACTION] Delete file + remove from examples.md
   └─ NO → Does the recipe use stale signatures/options?
            ├─ YES → [ACTION] Rewrite to current API
            └─ NO → Does it follow §4.5 template?
                     ├─ YES → [SKIP] Recipe OK
                     └─ NO → [ACTION] Reformat to template
   ```

3. **Check for missing examples** — for each new API from Step 1 findings:

   ```
   Is this a primary factory/function?
   ├─ YES → [ACTION] Create recipe: examples/<slug>.md
   └─ NO → Is it a significant new option/mode?
            ├─ YES → [ACTION] Add variation to existing recipe OR create new
            └─ NO → [SKIP] No dedicated example needed
   ```

4. **Sync `examples.md`** — must exactly match files on disk:
   - Remove links to deleted files
   - Add links for new files
   - Order: basic → advanced

5. **Template compliance check** for each kept recipe:
   - [ ] Has `## <Recipe Name>` → `### Problem` → `### Solution` → `### Pitfalls` → `### Related`
   - [ ] All imports present, no `...` placeholders
   - [ ] Pitfalls are recipe-specific
   - [ ] `### Related` has 2–4 links

**Checkpoint output:**

```
✅ CHECKPOINT: Step 3 complete
- Examples deleted: [list or "none"]
- Examples updated: [list or "none"]
- Examples created: [list or "none"]
- examples.md synced: yes/no
- Proceeding to Step 4
```

### Step 4 — Update each doc page to match **both** the API and template

**Goal:** Apply all findings from Steps 2–3 and ensure template compliance.

**Execution order:** Process pages in this sequence (dependencies flow downward):

1. `api.md` — source of truth for signatures; other pages reference it
2. `usage.md` — may link to api.md sections
3. `index.md` — exports frontmatter must match api.md
4. `examples.md` — must match examples/*.md files
5. `examples/*.md` — already handled in Step 3, but verify links

**For each page**, output:

```
[ACTION] <filename>: <summary of changes>
```

or

```
[SKIP] <filename>: No changes needed
```

When updating files, enforce the specific template rules below.

#### 4.0 Archetype check (required before editing any page)

Before applying §4.1–4.5, answer these two questions:

**Q1: What is the primary user interaction?**

- Importing a function/class → **Library** archetype. Apply §4.1–4.5 as written.
- Running a CLI command → **CLI / executable** archetype. Apply adaptations:
  - `index.md` Quick Start: shell command first, TypeScript import second (in a collapsed section or a separate `## Programmatic API` in `usage.md`).
  - `usage.md`: rename `## Framework Integration` → `## Embedding in a <Runtime> Process`; the section shows programmatic embedding, not React/Vue/Svelte hooks.
  - Comparison table: rows should compare the CLI's capabilities vs alternatives (other tools, manual approaches), not API surfaces or bundle sizes.
- Rendering DOM / custom elements → **DOM-output** archetype. Apply adaptations:
  - No REPL examples or Monaco types.
  - `## Framework Integration` shows HTML/JS consumption; only add React/Vue/Svelte tabs if the package ships framework adapters.
- Running at build time → **Build tool** archetype. Apply adaptations:
  - Quick Start is a config snippet, not a runtime snippet.
  - `api.md` documents config schema entries, not function call signatures, when the public surface is a config file.

**Q2: Does the package have known template exceptions from its `AGENTS.md`?**

Read `packages/<name>/AGENTS.md` for declared exceptions before assuming the default template applies. Record any exceptions found as `[FINDING] Archetype exception: <description>` and carry them through Steps 3–4.

**Output at this gate:**

```
[ACTION] Archetype: <Library | CLI | DOM-output | Build tool | mixed>
[ACTION] Adaptations: <list of §4.1–4.5 overrides, or "none">
```

---

#### 4.1 `index.md` — Overview

**Diátaxis type: Explanation** — understanding-oriented.

**Purpose:** Landing page. Helps the reader decide whether to adopt the library. Not a tutorial, not a reference. A reader should understand what the library does, see a working example, and decide whether it fits their need in 2–3 minutes.

**Required structure (in order):**

````md
---
title: <PackageName> — <One-line description>
description: <Sentence or two that would work as a tweet.>
package: <pkg>
category: <category>
keywords: [keyword1, keyword2, keyword3]
related: [related-pkg-1, related-pkg-2]
exports: [export1, export2, export3]
environments: [browser, node, ssr, deno]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageHero package="<pkg>" />

## Why <PackageName>?

<One paragraph, max 3 sentences, explaining the concrete problem this solves.>

```ts
// Before
// ...

// After
// ...
```

| Feature              | <PackageName>                               | <Competitor 1> | <Competitor 2> |
| -------------------- | ------------------------------------------- | -------------- | -------------- |
| Bundle size          | <PackageInfo package="<pkg>" type="size" /> | ...            | ...            |
| Zero dependencies    | <sg-icon name="check" size="16"></sg-icon>  | ...            | ...            |
| <Key differentiator> | <sg-icon name="check" size="16"></sg-icon>  | ...            | ...            |

<div class="decision-callout">

**Use <PackageName> when** <concrete situation where this is the right choice>.

**Consider <alternative> when** <concrete situation where something else is better>.

</div>

## Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/<pkg>
```

```sh [npm]
npm install @vielzeug/<pkg>
```

```sh [yarn]
yarn add @vielzeug/<pkg>
```

:::

## Quick Start

<Minimal working example — not a toy. Include error handling and cleanup where they apply.>

## Features

<div class="features-grid">

<Bullet list. Each bullet is one feature described in one line. Start with a backtick-quoted API name or concept when applicable.>

</div>

## Documentation

<div class="doc-links">

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)

</div>

## See Also

<div class="see-also">

<2–4 links to related Vielzeug packages. Each bullet: `[PackageName](/pkg/)` — one sentence explaining why the reader should look at it in the context of this package.>

</div>

<!-- markdownlint-enable MD025 MD033 MD060 -->
````

**Rules:**

- **`<PackageHero package="<pkg>" />`** replaces `<PackageBadges>`, `<img>`, `#` heading, and `<details>` Quick Reference. Metadata is rendered automatically from frontmatter.
- **`environments` frontmatter** is required. List only supported runtimes: `browser`, `node`, `ssr`, `deno`. Rendered as badges by `<PackageHero>`. Do **not** add a `## Compatibility` table. Derive the correct values from the package's actual constraints — use `browser, node` for universal packages (the majority), `browser` only for packages that depend on DOM/Web APIs (e.g. `vault`, `dnd`, `orbit`), and `node` only for server/CLI packages (e.g. `codex`). When in doubt, `browser, node` is the safe default.
- **`## Why <PackageName>?`** comes first — immediately after `<PackageHero>`, before Installation and Quick Start.
- **`decision-callout` div** wraps the "Use when / Consider when" block. Both statements are required.
- **`features-grid` div** wraps the `## Features` bullet list.
- **`doc-links` div** wraps the `## Documentation` links.
- **`see-also` div** wraps the `## See Also` links; each entry must include a contextual reason, not bare link text.
- `## Documentation` must use that exact heading; do not merge into `## See Also`.
- Frontmatter must include `package`, `category`, `keywords`, `related`, `exports`, `environments`.
- The Before/After block is a single fenced block with `// Before` followed by `// After`.
- Comparison table icons: `<sg-icon name="check" size="16">`, `<sg-icon name="x" size="16">`, `<sg-icon name="triangle-alert" size="16">`. Do not use `circle-check` or `circle-x`.
- Comparison table rows must include bundle size, zero dependencies, and 2–3 differentiators.
- "Use when / Consider when" must both be present.
- The **tone rules** (Section 2) apply here as well.

#### 4.2 `usage.md` — Usage Guide

**Diátaxis type: How-to Guide** — task-oriented.

**Purpose:** Helps the reader accomplish real tasks. Each section answers a concrete "how do I?" question. Not conceptual teaching — the reader has already decided to use the library. Do not embed exhaustive option tables here; those belong in `api.md`.

**Required structure:**

```md
---
title: <PackageName> — Usage Guide
description: <One sentence covering what this guide teaches.>
---

[[toc]]

## Basic Usage

<The simplest possible working example. All imports included.>

## <Concept A>

<One paragraph setting context, then a code block.>

## <Concept B>

...

## Testing

<Optional — include if the library provides test utilities or a recommended testing pattern.>

## Framework Integration

<Required when the library has its own subscription or lifecycle model. Show React, Vue 3, Svelte in a code-group.>

## Working with Other Vielzeug Libraries

<Required when there are documented integration points. Show real integration examples.>

## Best Practices

<Bullet list of actionable guidelines. Verb-first, max 8 bullets.>
```

**Rules:**

- No `#` heading — the frontmatter `title` is the page title.
- `[[toc]]` must appear immediately after the frontmatter.
- Sections ordered from simple to complex; the first code block must be copy-paste runnable.
- **Canonical section order (tail):** `… → Testing (if any) → Framework Integration → Working with Other Vielzeug Libraries → Best Practices`.
- Testing, Debug Mode, or any other package-specific utility sections go **before** `## Framework Integration`, never after.
- `## Framework Integration` goes after all concept and utility sections, before `## Working with Other Vielzeug Libraries`.
- `## Working with Other Vielzeug Libraries` goes after Framework Integration, before Best Practices.
- Omit `## Framework Integration` only if there is truly no natural framework interop (e.g., pure-utility packages like `arsenal`); otherwise include it.
- Best Practices must be the last section.

#### 4.3 `api.md` — API Reference

**Diátaxis type: Reference** — information-oriented.

**Purpose:** Consulted, not read. Readers arrive with a specific symbol in mind and need accurate, complete technical data. Do not embed how-to prose or opinionated guidance. Inline examples illustrate the contract, not teach usage.

**Required structure:**

```md
---
title: <PackageName> — API Reference
description: Complete API reference for <PackageName>.
---

[[toc]]

## API Overview

| Symbol           | Purpose              | Execution mode | Common gotcha    |
| ---------------- | -------------------- | -------------- | ---------------- |
| `functionName()` | One-line description | Sync / Async   | One-line warning |
| ...              |                      |                |                  |

## Package Entry Point

| Import            | Purpose                |
| ----------------- | ---------------------- |
| `@vielzeug/<pkg>` | Main exports and types |

## <Group A — e.g., Core Functions>

### `functionName()`

\`\`\`ts
functionName(param: Type, options?: OptionsType): ReturnType;
\`\`\`

<One sentence describing what it returns.>

**Parameters — `OptionsType`:**

| Option    | Type     | Default | Description      |
| --------- | -------- | ------- | ---------------- |
| `optionA` | `string` | `''`    | What it controls |

**Returns:** `ReturnType`

**Example:**

\`\`\`ts
import { functionName } from '@vielzeug/<pkg>';

const result = functionName('value', { optionA: 'x' });
\`\`\`

**Methods** (if `functionName` returns an object):

| Method    | Signature          | Description |
| --------- | ------------------ | ----------- |
| `methodA` | `(arg: T) => void` | Description |

## Types

<List every exported type/interface with its full definition in a code block, plus a one-line description for complex types.>

## Errors

<List every exported error class: name, what triggers it, notable properties.>
```

**Rules:**

- `[[toc]]` immediately after frontmatter.
- `## API Overview` includes all primary exports and has all four columns.
- `## Package Entry Point` table is required.
- Every exported function has: signature block, parameters table (if it takes an options object), returns, example.
- Every exported type is under `## Types` with full definition.
- Every exported error class is under `## Errors` with description.
- Use `---` to separate top-level API entries within a group.

#### 4.4 `examples.md` — Examples Index

**Diátaxis role: Navigation** — orients readers to available How-to Guides.

**Purpose:** Navigation-only page linking to recipes. No content, no teaching — directs the reader to the recipe that matches their problem.

**Required structure:**

```md
---
title: <PackageName> — Examples
description: Practical examples and recipes for <pkg>.
---

## Examples

- [<Recipe Name>](./examples/<slug>.md)
- ...
```

**Rules:**

- List recipes from basic to advanced.
- No prose descriptions next to links — titles must be self-explanatory.
- No `#` heading.

#### 4.5 `examples/<slug>.md` — Individual Recipes

**Diátaxis type: How-to Guide** — problem-oriented.

**Purpose:** Answers one concrete question: "How do I do X?" Not a tutorial (no hand-holding or concept teaching) and not a reference (no exhaustive listing). Self-contained and copy-paste ready.

**Required structure:**

```md
---
title: 'PackageName Examples — <Recipe Name>'
description: '<Recipe Name> example for @vielzeug/<pkg>.'
---

## <Recipe Name>

### Problem

<1–3 sentences. State the concrete problem or use case, mention APIs involved.>

### Solution

<One sentence: "Use `functionA()` combined with `optionB` to…">

\`\`\`ts
import { relevantExport } from '@vielzeug/<pkg>';

// All code needed to run this example from scratch.
// No placeholder variables or undefined references.
\`\`\`

#### With <Variation A> (optional)

\`\`\`ts
...
\`\`\`

#### With <Variation B> (optional)

\`\`\`ts
...
\`\`\`

### Pitfalls

- <Specific pitfall for this recipe — not generic boilerplate.>
- <Second pitfall if applicable.>
- <Third if applicable. Max 4 bullets.>

### Related

- [<Related Recipe>](./<slug>.md)
- [<Related Recipe>](./<slug>.md)
```

**Rules:**

- Headings: `## <Recipe Name>` then `### Problem`, `### Solution`, `### Pitfalls`, `### Related`.
- All code blocks are copy-paste runnable; all imports included; no ellipses in the main path.
- Pitfalls must be specific to the recipe; avoid generic "don't forget cleanup" boilerplate.
- `### Related` includes 2–4 links; prefer some cross-package links when relevant.
- No `## Expected Output` section.
- Frontmatter `title` uses an em dash and is wrapped in single quotes.

## 5. Verification and Cleanup

**Goal:** Catch errors before declaring done. This step is **mandatory**, not optional.

### 5.1 Diátaxis Self-Check

Run through this checklist mentally for each page:

| Page | Correct quadrant? | Anti-pattern to reject |
|------|-------------------|------------------------|
| `index.md` | Explanation | Tutorial steps, option tables |
| `usage.md` | How-to | Exhaustive option tables, conceptual essays |
| `api.md` | Reference | Opinionated guidance, "you should" prose |
| `examples/*.md` | How-to | Conceptual detours, incomplete code |

### 5.2 Technical Accuracy Verification

- [ ] All signatures in `api.md` match `src/index.ts` exactly
- [ ] All code blocks use current API (no deprecated patterns without marking)
- [ ] If `src/_warn.ts` exists, check `@security` JSDoc tags on user-data messages

### 5.3 Template Compliance

- [ ] `index.md` has all required frontmatter fields
- [ ] `index.md` has `<PackageHero>`, `## Why`, comparison table, decision-callout
- [ ] `usage.md` has `[[toc]]`, ends with Best Practices
- [ ] `api.md` has `## API Overview` with 4 columns, `## Package Entry Point`
- [ ] `examples.md` links match files on disk
- [ ] Each `examples/*.md` has Problem/Solution/Pitfalls/Related structure

### 5.4 Link Validation

- [ ] No dead internal links (grep for `](./` and verify targets exist)
- [ ] No references to removed APIs
- [ ] Sidebar config updated if examples added/removed

### 5.5 Sidebar Sync

If you added or removed `examples/*.md` files, update `docs/.vitepress/config.ts`:

1. Find the `'/<name>/'` sidebar entry
2. Update the Examples items array to match current files
3. Ensure anchors follow VitePress slugification (lowercase, hyphens, no special chars)

### 5.6 Docs Build (REQUIRED)

```bash
// turbo
pnpm docs:build
```

**If build fails:** Fix the error before proceeding. Common issues:
- Invalid frontmatter YAML
- Dead links (404s logged)
- Markdown syntax errors

### 5.7 Codex Bundle (REQUIRED)

```bash
// turbo
pnpm --filter @vielzeug/codex build
```

**Why mandatory:** Stale codex bundles corrupt MCP context for future sessions. This is fast and idempotent.

**Checkpoint output:**

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

## 6. Report

**Output this exact structure** (agent-parseable):

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

---

## Quick Reference: Execution Flow

```
Step 1: Inventory API    → Checkpoint
    ↓
Step 2: Audit docs       → Checkpoint (findings list)
    ↓
Step 3: Sync examples    → Checkpoint (delta list)
    ↓
Step 4: Update pages     → [ACTION]/[SKIP] per file
    ↓
Step 5: Verify & build   → Checkpoint (all checks pass)
    ↓
Step 6: Report           → Structured summary
```

The user will tell you which package to document. Use this single specification — no separate guide is needed.
