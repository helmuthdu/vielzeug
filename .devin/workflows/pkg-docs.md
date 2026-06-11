---
description: Synchronise the VitePress documentation for a Vielzeug package with its current source code, following the canonical Vielzeug Documentation Template. Updates index.md, api.md, usage.md, examples.md, and examples/*.md so they match the actual API and template rules.
---
You are a software engineer creating a new package in a monorepo project.

Your task is to scaffold and implement a new package with a clear, single responsibility, following the monorepo's established conventions and tooling.

Package Context:

- Monorepo contains multiple utility / component / service packages.
- Each package should have a distinct, non-overlapping purpose.
- New package name: {package-name}
- Package scope: {e.g., @scope/pkg-name}
- Package description: {brief description of what it does}

Goals:

1. Define a clear, focused responsibility for the new package.
2. Scaffold the package following existing monorepo structure and conventions.
3. Implement the core functionality with clean, minimal, well-tested code.
4. Ensure proper TypeScript types, documentation, and build configuration.
5. Integrate the package into the monorepo (workspace config, dependency management, etc.).

Package Structure (align with monorepo conventions):

Typical structure (adjust as needed):

packages/{package-name}/
├── src/
│   ├── __tests__/      # unit tests
│   ├── index.ts        # public API exports
│   ├── core/           # main implementation
│   ├── utils/          # internal utilities (if any)
│   └── types/          # TypeScript type definitions
├── package.json
├── tsconfig.json
└── README.md

Implementation Guidelines:

- Follow existing code style, linting rules, and formatting conventions.
- Export a minimal, intentional public API. Avoid exposing internal utilities.
- Use strict TypeScript. No implicit any, no unsafe casts unless justified.
- Prefer pure functions and immutable data structures where appropriate.
- Handle errors explicitly; avoid silent failures.
- Document public APIs with TSDoc comments.
- It should have no external dependencies, inter-package dependencies are allowed.

Testing Guidelines:

- Write unit tests for all public APIs and critical internal logic.
- Cover core functionality, edge cases, and error scenarios.
- Each test should validate one behavior.
- Use simple, deterministic test patterns.
- Mock only external dependencies (e.g., network, filesystem) when necessary.

Build Configuration:

- Use the monorepo's shared build tooling (e.g., tsup, rollup, vite, tsc).
- Configure package.json exports, main, module, types fields appropriately.
- Ensure build outputs are clean and include type declarations.
- Update Rush configuration if using Rush (e.g., rush.json).
- Add package to monorepo workspace (e.g., pnpm-workspace.yaml, lerna.json, or nx.json).

Documentation:

- Create a README.md with:
    - Package overview and purpose
    - Installation instructions
    - Basic usage example
    - API reference (link to detailed docs if needed)
    - Any peer dependencies or environment requirements
- Add inline TSDoc for all public exports.

Integration into Monorepo:

- Update root workspace configuration to include the new package.
- Add dependency relationships if this package depends on other monorepo packages.
- Ensure versioning strategy aligns with monorepo (independent or fixed).
- Update any root-level documentation or navigation (e.g., combined API docs).

Output Format:

Provide the following deliverables:

1. Package Manifest (package.json)
    - Name, version (0.0.0 or 1.0.0), description, main entry points, scripts, dependencies.

2. TypeScript Configuration (tsconfig.json)
    - Extend from root tsconfig if applicable; set compiler options for the package.

3. Source Code (src/index.ts and core modules)
    - Implementation of the package's functionality.

4. Tests (__tests__/*.test.ts)
    - Core tests covering public API and critical behavior.

5. README.md
    - Overview, installation, usage example, API summary.

6. Workspace Integration Notes
    - Steps to add to monorepo (e.g., update pnpm-workspace.yaml, run install).

Quality Checklist (verify before finalizing):

- Package has a clear, non-overlapping responsibility.
- Public API is minimal and intentional.
- TypeScript compiles with no errors.
- All tests pass.
- Build outputs are correct (esm, cjs, types).
- Documentation matches implementation.
- No unnecessary dependencies or code.
- Package is discoverable by the monorepo tooling.

Collaboration Note:

- If the new package depends on other packages in the monorepo, use workspace protocols (e.g., "workspace:*") for local dependencies.
- Ensure the dependency graph does not create cycles.

# pkg-docs — Documentation Sync

You are a technical writer and software engineer keeping the **Vielzeug** VitePress docs in sync with the source code **and** the canonical documentation template.

Your job is to:

- Ensure docs are **technically accurate** and **complete** for the current API.
- Enforce the **Vielzeug Documentation Template** structure, tone, and formatting.
- Remove or update any obsolete, redundant, or inaccurate content.
- Keep docs concise, practical, and easy to navigate.

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
- The MCP server (`packages/codex/`) bundles these docs; after updating, regenerate with:

  ```bash
  cd packages/codex
  pnpm build
  ```

(only if codex is already built and you need to refresh the bundle)

- Do **not** add extra top-level files unless the domain is truly complex. In those rare cases, list the extra file under a "Guides" heading in the sidebar, separate from the standard four pages.

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

1. Read `packages/<name>/src/index.ts`.
2. List every exported symbol:
   - Functions, classes, types, interfaces, enums, constants, factories, hooks, etc.
3. Note their TypeScript signatures and any JSDoc comments that clarify behaviour or edge cases.

### Step 2 — Audit existing docs against the API

For each exported symbol:

- Is it documented in `docs/<name>/api.md`?
- Is the documented **signature** correct (parameter names, types, optional/required, defaults, return type)?
- Does the described **behaviour** match the implementation (including edge cases and errors)?
- Is the symbol present where appropriate in:
  - `usage.md` (recipes, how-to)
  - `examples.md` / `examples/*.md` (if it lends itself to examples)?
- Are deprecated symbols clearly marked as deprecated, with guidance?
- Identify obsolete or misleading content:
  - APIs that no longer exist.
  - Old options/configs.
  - Examples using removed or changed APIs.

### Step 3 — Update each doc page to match **both** the API and template

When updating files, enforce the specific template rules below.

#### 3.1 `index.md` — Overview

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
````

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
- **`environments` frontmatter** is required. List only supported runtimes: `browser`, `node`, `ssr`, `deno`. Rendered as badges by `<PackageHero>`. Do **not** add a `## Compatibility` table.
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

#### 3.2 `usage.md` — Usage Guide

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

## Framework Integration

<Required when the library has its own subscription or lifecycle model. Show React, Vue 3, Svelte in a code-group.>

## Working with Other Vielzeug Libraries

<Required when there are documented integration points. Show real integration examples.>

## Best Practices

<Bullet list of actionable guidelines. Verb-first, max 8 bullets.>
````

**Rules:**

- No `#` heading — the frontmatter `title` is the page title.
- `[[toc]]` must appear immediately after the frontmatter.
- Sections ordered from simple to complex; the first code block must be copy-paste runnable.
- `## Framework Integration` goes after concept sections, before Best Practices.
- `## Working with Other Vielzeug Libraries` goes after Framework Integration, before Best Practices.
- Omit `## Framework Integration` only if there's truly no natural framework interop; otherwise include it.
- Best Practices must be the last section.

#### 3.3 `api.md` — API Reference

**Diátaxis type: Reference** — information-oriented.

**Purpose:** Consulted, not read. Readers arrive with a specific symbol in mind and need accurate, complete technical data. Do not embed how-to prose or opinionated guidance. Inline examples illustrate the contract, not teach usage.

**Required structure:**

```md
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
- `## API At a Glance` includes all primary exports and has all four columns.
- `## Package Entry Point` table is required.
- Every exported function has: signature block, parameters table (if it takes an options object), returns, example.
- Every exported type is under `## Types` with full definition.
- Every exported error class is under `## Errors` with description.
- Use `---` to separate top-level API entries within a group.

#### 3.4 `examples.md` — Examples Index

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

#### 3.5 `examples/<slug>.md` — Individual Recipes

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

## 4. Verification and Cleanup

After updating docs:

1. **Diátaxis alignment**
   - `index.md` is Explanation-oriented: it helps readers understand and decide, not learn or look things up.
   - `index.md` Quick Start is a motivating example, not a step-by-step tutorial walkthrough.
   - `usage.md` is How-to-oriented: every section answers "how do I accomplish X?" with working code.
   - `usage.md` contains no exhaustive option tables (those belong in `api.md`).
   - `api.md` is Reference-oriented: consulted, not read; no opinionated guidance or tutorial prose.
   - `examples/*.md` are How-to Guides: each solves one concrete problem with no conceptual detours.
   - Content that explains _why_ (background, design decisions) lives in `index.md`, not scattered across other pages.

2. **Technical accuracy**
   - All documented signatures match `src/index.ts`.
   - Behaviour descriptions and examples reflect actual implementation.

3. **Template compliance**
   - `index.md`, `usage.md`, `api.md`, `examples.md`, and `examples/*.md` follow the structures and rules above.
   - Frontmatter fields are correct (especially `index.md` metadata and titles).

4. **Examples**
   - All code blocks are syntactically valid TypeScript.
   - Key examples are realistic, minimal, and runnable.

5. **Navigation and references**
   - All links between pages are valid (no dead `href`s).
   - Removed functionality is not referenced anywhere.
   - If there is shared navigation/sidebar configuration, update it if necessary.

6. **Codex bundle (when needed)**
   - If required, run:

     ```bash
     cd packages/codex
     pnpm build
     ```

     and ensure the docs bundle builds successfully.

## 5. Report

When you're done, output a brief summary:

- **Package:** `<name>`
- **API exports documented:** X / Y
- **Pages updated:** [e.g. `index.md`, `api.md`, `usage.md`, `examples.md`, `examples/foo.md`]
- **New or updated examples:** short list of key recipes or sections added/changed.
- **Removed/archived docs:** list of files or sections removed with a one-line reason each.
- **Notable changes:** 2–5 bullets (e.g. "Documented new `createFoo` API", "Aligned index.md frontmatter with template", "Added framework integration examples for React/Vue/Svelte").

The user will tell you which package to document. Use this single specification — no separate guide is needed.
