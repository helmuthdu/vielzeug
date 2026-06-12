---
description: Update the interactive REPL / playground examples for a Vielzeug package so they reflect the current public API and recommended usage patterns.
---

# pkg-repl — REPL / Playground Examples Update

You are updating the interactive playground examples for a **Vielzeug** package.

## Context

- The public REPL page is `docs/repl.md`, which renders the custom Vue `<REPL />` component.
- The REPL implementation lives under `docs/.vitepress/theme/components/`, with package example data under `docs/.vitepress/theme/components/repl/examples/`.
- Each supported package has its own folder at `docs/.vitepress/theme/components/repl/examples/<name>/`.
- Each example is a TypeScript module that exports an object with at least:
  - `name`: the label shown in the example picker
  - `code`: a runnable code string executed by the browser REPL
- Each package folder has an `index.ts` file that imports and registers its example modules.
- The root registry is `docs/.vitepress/theme/components/repl/examples/index.ts`.
- Example picker categories are inferred from the example key prefix in the package registry.
- Monaco type support for the REPL lives under `docs/.vitepress/theme/components/repl/types/`.
- Examples must use only top-level `@vielzeug/<name>` imports — no external dependencies and no non-browser APIs.
- Each example should be self-contained, produce visible output, and run quickly in the browser REPL.

## Style & quality

- Direct and technical; avoid filler language in comments.
- Explain **intent before implementation**: a one-line comment at the top of each snippet.
- Prefer **real-world-flavoured demos** over contrived toys.
- Keep examples focused on **one concept per snippet** and between **10–40 lines** of runnable code.
- Align examples with the patterns shown in `docs/<name>/usage.md` and `docs/<name>/examples/*.md`.

## Process

### Step 1 — Audit current examples

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

### Step 2 — Identify stale or missing examples

Cross-reference against `packages/<name>/src/index.ts` and the REPL wiring:

- Are there new exports with no REPL example?
- Do any examples use removed or renamed APIs?
- Are any examples demonstrating antipatterns the current docs discourage?
- Is the package correctly registered in `docs/.vitepress/theme/components/repl/examples/index.ts`?
- If the package has REPL Monaco typings, do `types/index.ts` and `types/<name>.ts` still reflect the API being demonstrated?

### Step 3 — Update / Remove / Create examples

For each existing example module:

- Fix any stale API usage inside the `code` string.
- Add or update a one-line comment header at the top of the code string.
- Keep examples focused — one concept per file, 10–40 lines of runnable code.
- Use descriptive variable names; avoid `x`, `y`, `tmp`.
- Prefer real-world-flavoured demos over abstract math or trivial examples.
- Ensure the snippet logs or returns something useful in the REPL output pane.
- Keep imports limited to `@vielzeug/<name>`.
- Remove any duplicated, outdated, deprecated, or examples that are no longer relevant or demonstrative of the current API and usage patterns.

For new examples:

- Create a new `.ts` example module in `docs/.vitepress/theme/components/repl/examples/<name>/`.
- Export a descriptive example object with at least `category` and `code`.
- Register it in `docs/.vitepress/theme/components/repl/examples/<name>/index.ts`.
- Use a kebab-case registry key whose prefix produces the desired selector category.

### Step 4 — Verify examples compile

1. **Registry / docs integration** — ensure all new or renamed example modules are imported and exported correctly. Run the docs build:

   ```bash
   pnpm docs:build
   ```

2. **Snippet correctness** — cross-check each snippet against `packages/<name>/src/index.ts`. For substantial snippet changes, verify with a scratch file:

   ```bash
   pnpm tsc --noEmit --strict --target ES2022 --module ESNext --moduleResolution bundler /tmp/<name>-repl-check.ts
   ```

3. **Runtime sanity** — ensure the snippet produces meaningful console output or a final returned value visible to the user.

### Step 5 — Report

Output a summary:

```txt
Package: <name>
Examples before: N modules across K selector categories
Examples updated: M
New examples added: P
Stale examples removed: Q
```

The user will tell you which package to update.
