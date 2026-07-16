# Contributing to Vielzeug

Thanks for your interest in contributing! This guide covers the mechanics of getting a change merged. For engineering conventions (disposal, dev logging, error classes, file layout, package structure) see the root [`AGENTS.md`](../AGENTS.md) and `.ai/core/conventions.md` — read those before writing code, this file won't repeat them.

## Table of Contents

- [Setup](#setup)
- [Making a Change](#making-a-change)
- [Commit & Pull Request](#commit--pull-request)
- [Project Layout](#project-layout)
- [Need Help?](#need-help)

## Setup

**Prerequisites:** Node 22+ (`.nvmrc`), pnpm 10+ (`npm install -g pnpm`).

```bash
git clone https://github.com/YOUR_USERNAME/vielzeug.git
cd vielzeug
pnpm setup   # rush install — installs all package dependencies
pnpm build   # rush build — build every package
pnpm test    # verify the setup works
```

## Making a Change

1. **Pick or open an issue.** Browse [open issues](https://github.com/helmuthdu/vielzeug/issues) (`good first issue`/`help wanted` are good starting points) and comment to claim it, or open a new one for larger changes before you start.

2. **Branch:**

   ```bash
   git checkout -b feat/<package>-short-description
   git checkout -b fix/<package>-short-description
   ```

3. **Edit code** in `packages/<name>/`. Run `pnpm --filter @vielzeug/<name> fix` (or `pnpm fix` at the root) instead of hand-formatting or hand-sorting imports — ESLint Perfectionist + Prettier own that. Add or update tests in `packages/<name>/src/__tests__/`.

4. **Add a change file.** Every PR that touches a package's published output needs one — CI (`rush change --verify`) fails without it:

   ```bash
   node scripts/rush-change.mjs <name> <patch|minor|major> "<message>"
   # e.g.: node scripts/rush-change.mjs vault minor "feat: add TTL support for records"
   ```

   Use `patch` for fixes, `minor` for new features, `major` for breaking changes. Skip this step for docs-only or CI-only changes.

5. **Verify before pushing:**

   ```bash
   cd packages/<name>
   pnpm test && pnpm lint && pnpm build
   ```

   (Root-level `pnpm test` / `pnpm lint` / `pnpm build` also work but run the whole monorepo.)

## Commit & Pull Request

- Use [Conventional Commits](https://www.conventionalcommits.org/): `feat(courier): add retry logic`, `fix(vault): correct TTL race`, `docs(forge): update validation examples`. Common types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`.
- Push your branch and open a PR against `main`; fill out the PR template (summary, related issue, breaking changes, affected packages).
- The pre-commit hook (lefthook) runs lint + related tests on staged files automatically — a clean `git commit` locally means CI is unlikely to surprise you.
- Respond to review feedback by pushing more commits to the same branch.

## Project Layout

```
vielzeug/
├── packages/<name>/     # each package is self-contained — see .ai/reference/packages.md for the full list
│   ├── src/
│   │   ├── __tests__/   # vitest test files
│   │   └── index.ts     # public API — all exports defined here
│   ├── package.json
│   └── vite.config.ts
└── docs/<name>/         # VitePress documentation for that package
```

If you're adding new public API, update the package's docs under `docs/<name>/` (see `.ai/reference/docs-template.md` for the expected structure) and its `README.md`.

## Need Help?

- **Questions?** [Start a discussion](https://github.com/helmuthdu/vielzeug/discussions)
- **Found a bug?** [Open an issue](https://github.com/helmuthdu/vielzeug/issues)
- **Documentation:** [vielzeug.dev](https://vielzeug.dev)

Be respectful and constructive — we're all here to build something great together.
