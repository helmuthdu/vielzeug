<!--
  Thanks for contributing to Vielzeug! 🎉
  Sections marked with (*) are required. Write in English.
-->

## Summary \*

<!-- What does this PR do, and why? One short paragraph. List the main files/components touched. -->

## Related Issue

<!-- "Closes #123" to close it on merge; "Relates to #123" otherwise. Delete if none. -->

## Type of Change \*

- [ ] 🐛 Bug fix
- [ ] ✨ New feature
- [ ] 💥 Breaking change (fill in **Breaking Changes** below)
- [ ] 📝 Documentation
- [ ] ♻️ Refactor / 🎨 style / ⚡ performance (no API changes)
- [ ] ✅ Test update
- [ ] 🔧 Build/CI / 🧹 Chore

## Affected Packages \*

<!-- List the @vielzeug/* packages (and demos/docs/CI) this PR changes. -->

## Validation \*

<!-- Exact commands you ran and their results (passed/failed). See AGENTS.md for the per-surface commands. -->

-

## Breaking Changes \*

- [ ] **No breaking changes**
- [ ] **Yes** → documented in each affected package's `docs/<pkg>/migration.md`, and dependent packages/demos checked

<!-- If yes: what breaks, impact, and the migration path (before/after snippet welcome). -->

## Checklist \*

- [ ] One change file per changed package: `node scripts/rush-change.mjs <pkg> <patch|minor|major> "<message>"` (the type only picks the changelog section; versions are CalVer trains)
- [ ] Docs, README, recipes, and REPL examples updated when the public surface changed
- [ ] Tests cover the changed behavior (assert observable behavior, not internals)
- [ ] No new dependencies added (or explicitly approved)
- [ ] PR title follows conventional commits: `feat(courier): add retry logic`
