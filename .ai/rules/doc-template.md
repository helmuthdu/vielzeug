# Vielzeug — Documentation Template

Static reference for all VitePress documentation in `docs/<name>/`. Consumed by `/pkg-docs` — do not duplicate in workflow files, reference here.

## Tone and language (global rules)

Apply these rules to **all** docs you edit:

- **Direct and technical.** Address the reader as "you". Prefer active voice. Avoid filler ("simply", "just", "easy", "straightforward").
- **Short sentences.** One idea per sentence. Paragraph length: 2–4 sentences.
- **Explain intent before implementation.** A one-line description before each code block is required.
- **Code first, prose second.** When in doubt, show code and annotate it rather than long prose.
- **No marketing language.** Do not write "powerful", "blazing fast", or "seamless". Use factual comparisons in tables instead.
- **Comments in code blocks** explain _why_, not _what_. One comment per meaningful block is enough. Never write multi-line comment blocks.

## Package archetypes

Not every package is a consumed library. Before applying the template, identify the archetype and apply the adaptations below. A package can belong to more than one row.

| Archetype                    | Indicators                                                                              | Adaptations                                                                                                                                                                                                                                                                                               |
| ---------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Library** (default)        | `src/index.ts` exports functions/classes; imported by userland                          | No adaptations — use the full template as written                                                                                                                                                                                                                                                         |
| **CLI / executable tool**    | `bin` field in `package.json`; primary interaction is a terminal command, not an import | Quick Start in `index.md` leads with the shell command, not a TypeScript snippet; `## Framework Integration` in `usage.md` is replaced with `## Embedding in a <Runtime> Process` showing programmatic use as a secondary option; comparison table compares deployment/invocation modes, not API surfaces |
| **DOM-output / headless UI** | Package renders DOM directly (e.g. `refine`, `prism`); no REPL examples by convention   | No REPL examples or Monaco types; `## Framework Integration` shows web-component usage in HTML/JS, not React/Vue/Svelte unless the package ships framework adapters                                                                                                                                       |
| **Build / dev tool**         | `devDependencies`-only; runs at build time, not runtime                                 | Quick Start shows CLI invocation or config file; `## Basic Usage` in `usage.md` starts with config, not code; API reference may be a config schema, not function signatures                                                                                                                               |
| **Pure type package**        | Exports only `type` and `interface`; no runtime code                                    | Skip `## Quick Start` code block; `api.md` is types-only; no examples needed unless the types encode a non-obvious pattern                                                                                                                                                                                |

**Archetype check (required before editing any page):** Match the package to a row in the table above, then read `packages/<name>/AGENTS.md` for any declared template exceptions. When in doubt, check `package.json` (`bin`, `exports`, `engines`) and `src/cli.ts` before assuming the Library default applies.

---

## `index.md` — Overview

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

| Feature              | <PackageName>                                | <Competitor 1> | <Competitor 2> |
| -------------------- | -------------------------------------------- | -------------- | -------------- |
| Bundle size          | <PackageInfo package="<pkg>" type="size" />  | ...            | ...            |
| Zero dependencies    | <ore-icon name="check" size="16"></ore-icon> | ...            | ...            |
| <Key differentiator> | <ore-icon name="check" size="16"></ore-icon> | ...            | ...            |

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
- Comparison table icons: `<ore-icon name="check" size="16">`, `<ore-icon name="x" size="16">`, `<ore-icon name="triangle-alert" size="16">`. Do not use `circle-check` or `circle-x`.
- Comparison table rows must include bundle size, zero dependencies, and 2–3 differentiators.
- "Use when / Consider when" must both be present.

---

## `usage.md` — Usage Guide

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

---

## `api.md` — API Reference

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

---

## `examples.md` — Examples Index

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

---

## `examples/<slug>.md` — Individual Recipes

**Diátaxis type: How-to Guide** — problem-oriented.

**Purpose:** Answers one concrete question: "How do I do X?" Not a tutorial and not a reference. Self-contained and copy-paste ready.

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

### Pitfalls

- <Specific pitfall for this recipe — not generic boilerplate.>
- <Second pitfall if applicable. Max 4 bullets.>

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

---

## Verification checklists

### Diátaxis self-check

| Page            | Correct quadrant? | Anti-pattern to reject                      |
| --------------- | ----------------- | ------------------------------------------- |
| `index.md`      | Explanation       | Tutorial steps, option tables               |
| `usage.md`      | How-to            | Exhaustive option tables, conceptual essays |
| `api.md`        | Reference         | Opinionated guidance, "you should" prose    |
| `examples/*.md` | How-to            | Conceptual detours, incomplete code         |

### Technical accuracy

- [ ] All signatures in `api.md` match `src/index.ts` exactly
- [ ] All code blocks use current API (no deprecated patterns without marking)
- [ ] If `src/_dev.ts` exists, check `@security` JSDoc tags on user-data messages

### Template compliance

- [ ] `index.md` has all required frontmatter fields
- [ ] `index.md` has `<PackageHero>`, `## Why`, comparison table, decision-callout
- [ ] `usage.md` has `[[toc]]`, ends with Best Practices
- [ ] `api.md` has `## API Overview` with 4 columns, `## Package Entry Point`
- [ ] `examples.md` links match files on disk
- [ ] Each `examples/*.md` has Problem/Solution/Pitfalls/Related structure

### Link validation

- [ ] No dead internal links (grep for `](./` and verify targets exist)
- [ ] No references to removed APIs
- [ ] Sidebar config updated if examples added/removed
