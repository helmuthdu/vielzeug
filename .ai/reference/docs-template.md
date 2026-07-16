# Vielzeug Documentation Template

Shared page structure for `docs/<name>/`. This is reference material, not a task narrative — the `docs` task tells you when to load it and how to sequence edits; this file tells you exactly what each page must contain.

## Global writing rules

Apply to every page you edit:

- Be direct and technical. Address the reader as "you". Prefer active voice. Avoid filler ("simply", "just", "easy", "straightforward").
- Short sentences, one idea each. Paragraphs: 2–4 sentences.
- Explain intent before implementation — a one-line description before each code block.
- Code first, prose second. When in doubt, show annotated code rather than long prose.
- No marketing language ("powerful", "blazing fast", "seamless"). Use factual comparison tables instead.
- Code comments explain *why*, not *what*. One comment per meaningful block; never multi-line comment blocks.

## Package archetypes

Not every package is a consumed library. Identify the archetype before applying the template — a package can match more than one row. Check `package.json` (`bin`, `exports`, `engines`) and `src/cli.ts` before assuming the Library default, and check `packages/<name>/AGENTS.md` for declared exceptions.

| Archetype | Indicators | Adaptations |
| --- | --- | --- |
| **Library** (default) | `src/index.ts` exports functions/classes; imported by userland | None — use the full template as written |
| **CLI / executable tool** | `bin` field in `package.json`; primary interaction is a terminal command | Quick Start leads with the shell command, not TypeScript; `usage.md`'s Framework Integration becomes "Embedding in a `<Runtime>` Process" (programmatic use as secondary); comparison table compares invocation modes, not API surfaces |
| **DOM-output / headless UI** | Renders DOM directly (`refine`, `prism`); no REPL examples by convention | No REPL examples or Monaco types; Framework Integration shows web-component HTML/JS usage, not React/Vue/Svelte unless the package ships adapters |
| **Build / dev tool** | `devDependencies`-only; runs at build time | Quick Start shows CLI invocation or config; `usage.md`'s Basic Usage starts with config, not code; API reference may be a config schema |
| **Pure type package** | Exports only `type`/`interface`; no runtime code | Skip Quick Start code block; `api.md` is types-only; examples only for non-obvious patterns |

## `index.md` — Overview

Diátaxis type: **Explanation**. Landing page — helps the reader decide whether to adopt the library in 2–3 minutes. Not a tutorial, not a reference.

Required frontmatter: `title`, `description`, `package`, `category`, `keywords`, `related`, `exports`, `environments`.

- `environments` — list only supported runtimes from `browser`, `node`, `ssr`, `deno`, rendered as badges by `<PackageHero>`. No separate `## Compatibility` table. `browser, node` is the safe default for universal packages; `browser` only for DOM/Web-API-dependent packages (`vault`, `dnd`, `orbit`); `node` only for server/CLI packages (`codex`).
- Minimum Node version is derived automatically from `engines.node` and folded into the `node` badge — nothing to add by hand. Monorepo floor is `>=18`; raise per-package only for a real constraint (e.g. `codex` `>=22`).

Required structure, in order:

1. `<PackageHero package="<pkg>" />` — replaces badges/logo/heading/quick-reference; renders from frontmatter.
2. `## Why <PackageName>?` — one paragraph (max 3 sentences) on the concrete problem solved, followed by a single Before/After fenced code block (`// Before` then `// After`).
3. Comparison table — columns: Feature, `<PackageName>`, 1–2 competitors. Rows must include bundle size (`<PackageInfo package="<pkg>" type="size" />`), zero dependencies, and 2–3 real differentiators. Use `<ore-icon name="check" size="16">`, `<ore-icon name="x" size="16">`, or `<ore-icon name="triangle-alert" size="16">` — never `circle-check`/`circle-x`.
4. `<div class="decision-callout">` wrapping both **Use `<PackageName>` when** and **Consider `<alternative>` when** statements — both required.
5. `## Installation` — `::: code-group` with pnpm/npm/yarn tabs.
6. `## Quick Start` — a minimal but real working example, including error handling/cleanup where they'd apply.
7. `## Features` inside `<div class="features-grid">` — one line per feature, starting with a backtick-quoted API name where applicable.
8. `## Documentation` inside `<div class="doc-links">` — links to `usage.md`, `api.md`, `examples.md`. Use this exact heading; do not merge into See Also.
9. `## See Also` inside `<div class="see-also">` — 2–4 related packages, each with a contextual one-sentence reason, not bare link text.

Wrap the whole body in `<!-- markdownlint-disable MD025 MD033 MD060 -->` / `<!-- markdownlint-enable -->`.

## `usage.md` — Usage Guide

Diátaxis type: **How-to**. Task-oriented — the reader has already decided to use the library. No exhaustive option tables (those belong in `api.md`).

Required frontmatter: `title`, `description`. No `#` heading — frontmatter `title` is the page title. `[[toc]]` immediately after frontmatter.

Canonical section order: `Basic Usage → <concept sections, simple to complex> → Testing (if applicable) → Framework Integration → Working with Other Vielzeug Libraries → Best Practices`.

- The first code block must be copy-paste runnable with all imports.
- Testing, Debug Mode, or other package-specific utility sections go **before** Framework Integration, never after.
- Omit Framework Integration only when there is truly no natural framework interop (e.g. `arsenal`); otherwise include it, showing React/Vue 3/Svelte in a code-group.
- `Working with Other Vielzeug Libraries` is required when documented integration points exist.
- `Best Practices` is always last — an actionable, verb-first bullet list, max 8 items.

## `api.md` — API Reference

Diátaxis type: **Reference**. Consulted, not read — accurate and complete, no how-to prose or opinionated guidance. Inline examples illustrate the contract, not teach usage.

Required frontmatter: `title`, `description`. `[[toc]]` immediately after frontmatter.

Required structure:

1. `## API Overview` — table with columns Symbol, Purpose, Execution mode (Sync/Async), Common gotcha. Covers all primary exports.
2. `## Package Entry Point` — table of `@vielzeug/<pkg>` import → purpose.
3. One `##` group per logical area (e.g. "Core Functions"), each function as a `###` entry with: signature block, one-sentence return description, parameters table (if it takes an options object), **Returns**, **Example** (real import + usage), and a methods table if it returns an object with methods.
4. `## Types` — every exported type/interface with full definition in a code block; one-line description for complex types.
5. `## Errors` — every exported error class: name, what triggers it, notable properties.

Use `---` to separate top-level API entries within a group.

## `examples.md` — Examples Index

Diátaxis role: **Navigation only**. No prose next to links — titles must be self-explanatory. No `#` heading. List recipes basic → advanced.

## `examples/<slug>.md` — Individual Recipes

Diátaxis type: **How-to**, problem-oriented. Self-contained and copy-paste ready.

Required frontmatter: `title` (em dash, single-quoted, e.g. `'PackageName Examples — <Recipe Name>'`), `description`.

Required structure: `## <Recipe Name>` then, in order, `### Problem` (1–3 sentences, concrete use case + APIs involved), `### Solution` (one sentence + a complete runnable code block, no placeholders or undefined references; an optional `#### With <Variation>` sub-block), `### Pitfalls` (specific to this recipe, max 4 bullets — no generic boilerplate), `### Related` (2–4 links, cross-package where relevant). No `## Expected Output` section.

## Verification checklist

Run before declaring a docs pass done:

- [ ] Every signature in `api.md` matches `src/index.ts` exactly
- [ ] All code blocks use current API (no unmarked deprecated patterns)
- [ ] `index.md` has all required frontmatter fields, `<PackageHero>`, `## Why`, comparison table, decision-callout
- [ ] `usage.md` has `[[toc]]` and ends with Best Practices
- [ ] `api.md` has `## API Overview` (4 columns) and `## Package Entry Point`
- [ ] `examples.md` links match files on disk
- [ ] Each `examples/*.md` has Problem/Solution/Pitfalls/Related
- [ ] No dead internal links (`](./` targets all exist)
- [ ] No references to removed APIs
- [ ] Sidebar config (`docs/.vitepress/config.ts`) updated if examples were added/removed
- [ ] If `src/_dev.ts` exists, `@security` JSDoc tags are present on messages carrying user-supplied data

