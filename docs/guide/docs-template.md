# Vielzeug Documentation Template

This document defines the canonical structure, language, and formatting rules for all library documentation pages in the Vielzeug monorepo. When writing or revising docs for any package, follow this template exactly. Consistency across all 20 libraries is the primary goal.

---

## Overview

Every library has exactly five documentation concerns:

| File            | Purpose                                                    |
| --------------- | ---------------------------------------------------------- |
| `index.md`      | What the library is, why to use it, and how to install it  |
| `usage.md`      | Practical how-to guide, progressing from basic to advanced |
| `api.md`        | Complete API reference — every export, every option        |
| `examples.md`   | Navigation index for the individual example recipes        |
| `examples/*.md` | Individual self-contained recipes                          |

Do not add extra top-level files (e.g., `lifecycle-best-practices.md`, `controls.md`) unless the library has a domain so complex that a separate conceptual guide is unavoidable. In those rare cases, list the extra file under a "Guides" heading in the sidebar, separate from the standard four pages.

---

## Tone and Language

- **Direct and technical.** Address the reader as "you". Prefer active voice. Avoid filler ("simply", "just", "easy", "straightforward").
- **Short sentences.** One idea per sentence. Paragraph length: 2–4 sentences.
- **Explain intent before implementation.** A one-line description before each code block is required.
- **Code first, prose second.** When in doubt, show code and annotate it instead of explaining in prose.
- **No marketing language.** Do not write "powerful", "blazing fast", or "seamless". Use factual comparisons in tables instead.
- **Comments in code blocks** should explain _why_, not _what_. One comment per meaningful block is enough. Never write multi-line comment blocks.

---

## `index.md` — Overview

### Purpose

This is the landing page. A reader should understand what the library does, see a working example, and decide whether it fits their need — all within 2–3 minutes.

### Required Structure (in order)

````md
---
title: <PackageName> — <One-line description>
description: <Sentence or two that would work as a tweet.>
package: <pkg>
category: <category>
keywords: [keyword1, keyword2, keyword3]
related: [related-pkg-1, related-pkg-2]
exports: [export1, export2, export3]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageBadges package="<pkg>" />

<img src="/logo-<pkg>.svg" alt="<PackageName> logo" width="156" class="logo-highlight"/>

# <PackageName>

<details>
<summary>⚡ Quick Reference</summary>

**Package:** `@vielzeug/<pkg>` &nbsp;·&nbsp; **Category:** <Category>

**Key exports:** `export1`, `export2`, `export3`

**When to use:** <One sentence explaining the concrete problem this solves.>

**Related:** [Related Pkg 1](/related-pkg-1/) · [Related Pkg 2](/related-pkg-2/)

</details>

`@vielzeug/<pkg>` is a <short description in one sentence>.


## Installation

::: code-group

\```sh [pnpm]
pnpm add @vielzeug/<pkg>
\```

\```sh [npm]
npm install @vielzeug/<pkg>
\```

\```sh [yarn]
yarn add @vielzeug/<pkg>
\```

:::

## Quick Start

<Minimal working example — not a toy. Include error handling and cleanup where they apply.>

## Why <PackageName>?

<One paragraph, max 3 sentences, explaining the concrete problem this solves.>

<Before/After code block — show the same task done without the library versus with it.>

| Feature              | <PackageName>                               | <Competitor 1> | <Competitor 2> |
| -------------------- | ------------------------------------------- | -------------- | -------------- |
| Bundle size          | <PackageInfo package="<pkg>" type="size" /> | ...            | ...            |
| Zero dependencies    | ✅                                          | ...            | ...            |
| <Key differentiator> | ✅                                          | ...            | ...            |

**Use <PackageName> when** <concrete situation where this is the right choice>.

**Consider <alternative> when** <concrete situation where something else is better>.

## Features

<Bullet list. Each bullet is one feature described in one line. Start with a backtick-quoted API name or concept when applicable.>

## Compatibility

| Environment | Support |
| ----------- | ------- |
| Browser     | ✅ / ❌ |
| Node.js     | ✅ / ❌ |
| SSR         | ✅ / ❌ |
| Deno        | ✅ / ❌ |

## Documentation

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)

## See Also

<2–4 links to related Vielzeug packages with a brief note on the relationship.>

<!-- markdownlint-enable MD025 MD033 MD060 -->
````

### Rules

- The `## Documentation` section must use that exact heading. Do not merge it into `## See Also`.
- **AI-agent friendly metadata** (new): Frontmatter must include `package`, `category`, `keywords`, `related`, `exports`.
- **Quick Reference block** (new): Add a `<details>` block immediately after the `#` heading with key exports, category, and when to use.
- The Before/After code block in "Why" must be a single fenced block with a `// Before` comment block followed by a `// After` comment block, not two separate blocks with prose between them.
- Comparison table rows: always include bundle size, zero dependencies, and 2–3 differentiating feature rows. Use `✅`, `❌`, `⚠️` (for partial/nuanced), and short text like `Manual`, `React only`, `Partial`.
- "Use when / Consider when" must both be present. They are italic-free, direct statements.

---

## `usage.md` — Usage Guide

### Purpose

Progressive guide from the simplest use case to advanced patterns. A reader working through it top-to-bottom should have a complete picture of day-to-day use.

### Required Structure

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

## Framework Integration

<This section is REQUIRED for every library that maintains its own subscription or lifecycle model. It belongs in usage.md, not in a separate example file.>

<Show the minimal interop adapter for each relevant framework. Always cover React, Vue 3, and Svelte. Add Web Components if the library has DOM relevance. Use a ::: code-group block so all three are presented side-by-side.>

## Working with Other Vielzeug Libraries

<This section is REQUIRED when the library has a documented integration point with another package in the monorepo. Show the integration with a real code example, not just a link.>

## Best Practices

<Bullet list. Each bullet is actionable: use verb-first ("Prefer X over Y", "Call dispose() when…"). No more than 8 bullets.>
```

### Rules

- No `#` top-level heading. The frontmatter `title` is sufficient; VitePress renders it as the page title.
- `[[toc]]` must appear immediately after the frontmatter, before any content.
- Sections should be ordered from simple to complex. The first code block in the page must be copy-paste runnable.
- `## Framework Integration` placement: after all core concept sections, before Best Practices.
- `## Working with Other Vielzeug Libraries` placement: after Framework Integration, before Best Practices.
- If the library has no natural framework interop (e.g., a pure-utility library like `toolkit`), omit `## Framework Integration` — but document any utility functions that simplify framework usage in the relevant concept section.
- Best Practices must be the last section.

### Framework Integration Pattern

Use `::: code-group` to show React, Vue 3, and Svelte side-by-side. Each tab must be complete and copy-paste runnable, with all imports. Do not share setup code across tabs.

````md
## Framework Integration

::: code-group

\```tsx [React]
// Full React example with hooks, cleanup, and types
\```

\```ts [Vue 3]
// Full Vue 3 composable using onUnmounted/onScopeDispose
\```

\```svelte [Svelte]
// Full Svelte example using onDestroy and reactive declarations
\```

:::
````

Guidance per framework:

- **React**: use `useSyncExternalStore` when the library exposes a subscription model. Use `useEffect` with a cleanup return for event-based APIs.
- **Vue 3**: use `shallowRef` or `ref` for state. Call `onScopeDispose` (preferred) or `onUnmounted` for cleanup.
- **Svelte**: use reactive `let` declarations with `$:` when applicable. Use `onDestroy` for cleanup.

### Inter-Library Integration Pattern

Show the integration as a realistic code block, not a reference to "see the X docs". The example must demonstrate both libraries working together in a single snippet.

````md
## Working with Other Vielzeug Libraries

### With Validit

<One sentence explaining why you'd combine these two.>

\```ts
import { createForm, schemaValidator } from '@vielzeug/formit';
import { v } from '@vielzeug/validit';

const schema = v.object({ email: v.string().email() });
const form = createForm({ validator: schemaValidator(schema), defaultValues: { email: '' } });
\```
````

---

## `api.md` — API Reference

### Purpose

Exhaustive reference. A reader should be able to look up any export, understand its signature, parameters, return value, and see a minimal example.

### Required Structure

````md
---
title: <PackageName> — API Reference
description: Complete API reference for <PackageName>.
---

[[toc]]

## API At a Glance

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

\```ts
functionName(param: Type, options?: OptionsType): ReturnType;
\```

<One sentence describing what it returns.>

**Parameters — `OptionsType`:**

| Option    | Type     | Default | Description      |
| --------- | -------- | ------- | ---------------- |
| `optionA` | `string` | `''`    | What it controls |

**Returns:** `ReturnType`

**Example:**

\```ts
import { functionName } from '@vielzeug/<pkg>';

const result = functionName('value', { optionA: 'x' });
\```

**Methods** (if `functionName` returns an object):

| Method    | Signature          | Description |
| --------- | ------------------ | ----------- |
| `methodA` | `(arg: T) => void` | Description |

---

## <Group B — e.g., Error Classes>

...

## Types

<List every exported type/interface with its full definition in a code block. For complex types, add a one-line description above the block.>

## Errors

<List every exported error class: name, what triggers it, and any notable properties.>
````

### Rules

- `## API At a Glance` is always the first content section and must include all primary exported symbols. The four columns — Symbol, Purpose, Execution mode, Common gotcha — are required.
- Every exported function must have: signature block, parameters table (if it accepts an options object), return value, and an inline example.
- Every exported class/error must be listed under `## Errors` with what triggers it.
- Every exported type must appear under `## Types` with its full definition.
- `[[toc]]` must appear immediately after the frontmatter.
- Use `---` (horizontal rule) to separate distinct top-level API entries within a group.
- Do not list every method inline in the intro section — use the `**Methods:**` table pattern after the constructor/factory description.

---

## `examples.md` — Examples Index

### Purpose

Navigation-only page. It orients the reader and links to every recipe.

### Required Structure

```md
---
title: <PackageName> — Examples
description: Practical examples and recipes for <pkg>.
---

[[toc]]

## Examples

- [<Recipe Name>](./examples/<slug>.md)
- ...
```

### Rules

- List recipes in order of complexity: basic patterns first, advanced and integration recipes last.
- No prose descriptions next to the links — the recipe titles must be self-explanatory.
- No `#` heading (VitePress renders the frontmatter title).

---

## `examples/<slug>.md` — Individual Recipes

### Purpose

A single, self-contained recipe answering one specific question. Should be copy-paste ready.

### Required Structure

````md
---
title: '<PackageName> Examples — <Recipe Name>'
description: '<Recipe Name> example for @vielzeug/<pkg>.'
---

## <Recipe Name>

### Problem

<1–3 sentences. State the concrete problem or use case. Mention the specific API concepts involved.>

### Solution

<One sentence: "Use `functionA()` combined with `optionB` to…">

\```ts
import { relevantExport } from '@vielzeug/<pkg>';

// All code needed to run this example from scratch.
// No placeholder variables or undefined references.
\```

<If the recipe has multiple distinct approaches or variations, use sub-sections:>

#### With <Variation A>

\```ts
...
\```

#### With <Variation B>

\```ts
...
\```

### Pitfalls

- <Specific pitfall for this recipe — not generic boilerplate. Explain what goes wrong and why.>
- <A second specific pitfall if applicable.>
- <A third if applicable. Maximum 4 bullets.>

### Related

- [<Related Recipe>](./<slug>.md)
- [<Related Recipe>](./<slug>.md)
````

### Rules

- **Section heading is `### Problem`, `### Solution`, `### Pitfalls`, `### Related`** — not `## Problem` etc. The `##` heading is the recipe title. This creates the right hierarchy in the TOC.
- **Every code block is copy-paste runnable.** All imports included. No ellipsis placeholders in the working path.
- **Pitfalls must be specific to this recipe.** Do not use generic boilerplate like "Forgetting cleanup calls can leak listeners" across every example. Write the actual mistake a reader would make with this specific recipe and what happens.
- **Related section:** 2–4 links. Prefer cross-package links to related Vielzeug packages alongside links to related recipes in the same package.
- **No `## Expected Output` section.** It adds length without value — if the example is well-written, the output is apparent from the code.
- Frontmatter `title` uses em-dash (—) and single quotes around the full value.

---

## Frontmatter Conventions

| Field         | `index.md`                           | `usage.md`                  | `api.md`                       | `examples.md`                          | `examples/*.md`                                        |
| ------------- | ------------------------------------ | --------------------------- | ------------------------------ | -------------------------------------- | ------------------------------------------------------ |
| `title`       | `PackageName — One-line description` | `PackageName — Usage Guide` | `PackageName — API Reference`  | `PackageName — Examples`               | `'PackageName Examples — Recipe Name'` (single-quoted) |
| `description` | Tweet-length summary                 | What the guide teaches      | "Complete API reference for …" | "Practical examples and recipes for …" | "Recipe Name example for @vielzeug/pkg."               |
| `package`     | `<pkg>` (always)                     | \_not required\_            | \_not required\_               | \_not required\_                       | \_not required\_                       |
| `category`    | one of the 12 categories (always)    | \_not required\_            | \_not required\_               | \_not required\_                       | \_not required\_                       |
| `keywords`    | `[keyword1, keyword2, …]` (always)   | \_not required\_            | \_not required\_               | \_not required\_                       | \_not required\_                       |
| `related`     | `[pkg1, pkg2, …]` (always)           | \_not required\_            | \_not required\_               | \_not required\_                       | \_not required\_                       |
| `exports`     | top exports as `[name1, name2, …]`   | \_not required\_            | \_not required\_               | \_not required\_                       | \_not required\_                       |

Use em-dash (—) as the separator in titles, except for individual example files where the frontmatter title is wrapped in single quotes and uses an em-dash.

### AI-Agent Friendly Metadata (in `index.md` frontmatter)

These fields enable AI agents (via the MCpit MCP server) to discover and understand packages programmatically:

- **`package`:** Package folder name without `@vielzeug/` prefix (e.g., `stateit`, `fetchit`). Always required.
- **`category`:** One of the 12 canonical categories: `state`, `ui`, `forms`, `validation`, `http`, `storage`, `routing`, `auth`, `di`, `logging`, `i18n`, `events`, `workers`, `utilities`, `data`, `time`.
- **`keywords`:** Searchable terms (e.g., `[signals, reactive, state-management]`). Used by MCpit's `search-packages` tool.
- **`related`:** Related package slugs (e.g., `[validit, stateit]`). Must exist as real packages. Used in Quick Reference links.
- **`exports`:** Primary exports as strings (e.g., `[createApi, createQuery, HttpError]`). Top 3–5 only. Used in Quick Reference and MCpit metadata.

---

## AI-Agent Integration (MCpit)

The **MCpit** MCP (Model Context Protocol) server reads the metadata from `index.md` to expose Vielzeug packages and their documentation to AI assistants. This enables agents to:

- **Discover packages** by category, keyword, or search query
- **Get structured context** about each package (exports, related libraries, available doc pages, source availability)
- **Read full documentation** (index, api, usage, examples pages)
- **View source API** (`src/index.ts`)
- **Find components** (Buildit only)

### MCpit Tools That Use Your Metadata

| Tool | Frontmatter fields used |
|------|-------------------------|
| `list-packages` | All fields (package, category, keywords, related, exports, description) |
| `search-packages` | `package`, `category`, `keywords`, description, all doc pages |
| `get-package` | All fields — returns complete structured metadata for one package |
| `get-docs` | `package` — serves markdown content from docs files |
| `get-source` | `package` — serves `src/index.ts` source |

### How to Publish Your Docs

Every time you build or test the monorepo, the MCpit package regenerates its bundled snapshot (`data/vielzeug-data.json`). This snapshot is automatically included when the package is published to npm.

When you publish `@vielzeug/<pkg>`, ensure:

1. **Frontmatter is complete** in `docs/<pkg>/index.md`
2. **All four doc pages exist** (or are intentionally omitted with reason): `index.md`, `api.md`, `usage.md`, `examples.md`
3. **Quick Reference block is present** in `index.md` after the `#` heading

Example: When an AI agent runs MCpit's `get-package` tool with `packageSlug: "stateit"`, MCpit returns:

```json
{
  "slug": "stateit",
  "name": "@vielzeug/stateit",
  "version": "3.0.1",
  "category": "state",
  "description": "Reactive signals, computed, effects, and stores...",
  "keywords": ["signals", "reactive", "state-management", "effects"],
  "exports": ["signal", "computed", "effect", "store"],
  "related": ["craftit", "formit"],
  "availableDocPages": ["index", "api", "usage", "examples"],
  "hasSource": true
}
```

---

## Checklist for Reviewing a Library's Docs

Use this list when auditing or updating a library:

### `index.md`

- [ ] Frontmatter has `title` and `description`
- [ ] Frontmatter has `package`, `category`, `keywords`, `related`, `exports` (AI-agent friendly metadata)
- [ ] `<PackageBadges>` and `<img>` logo present
- [ ] Quick Reference `<details>` block present immediately after `#` heading with category, exports, when-to-use, and related links
- [ ] One-sentence description immediately after the `#` heading
- [ ] Installation code-group covers pnpm, npm, yarn
- [ ] Quick Start is complete and runnable (not a toy)
- [ ] Before/After code block in "Why" section
- [ ] Comparison table has bundle size, zero deps, 2–3 differentiators
- [ ] "Use when / Consider when" statements both present
- [ ] Compatibility table present
- [ ] `## Documentation` section (not merged into See Also)
- [ ] `## See Also` links to 2–4 related Vielzeug packages

### `usage.md`

- [ ] No `#` heading (frontmatter title only)
- [ ] `[[toc]]` immediately after frontmatter
- [ ] First code block is copy-paste runnable
- [ ] `## Framework Integration` section present (or explicitly omitted with reason)
- [ ] `## Working with Other Vielzeug Libraries` present (if applicable)
- [ ] `## Best Practices` is the last section

### `api.md`

- [ ] `[[toc]]` immediately after frontmatter
- [ ] `## API At a Glance` table present with all four columns
- [ ] `## Package Entry Point` table present
- [ ] Every exported function has: signature, parameters table, return, example
- [ ] Every exported error class listed under `## Errors`
- [ ] Every exported type listed under `## Types` with full definition

### `examples.md`

- [ ] `[[toc]]` present
- [ ] Recipes ordered basic → advanced
- [ ] No "How to Use" boilerplate section

### `examples/*.md`

- [ ] Every recipe has: `## <Title>`, `### Problem`, `### Solution`, `### Pitfalls`, `### Related`
- [ ] All code blocks are copy-paste runnable (all imports, no placeholders)
- [ ] Pitfalls are specific to the recipe, not generic boilerplate
- [ ] `### Related` includes at least one cross-package link
- [ ] No `## Expected Output` section
