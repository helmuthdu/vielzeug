# Change Log - @vielzeug/spell

This log was last generated on Sat, 15 Aug 2026 10:39:54 GMT and should not be manually modified.

## 2.1.0
Sat, 15 Aug 2026 10:39:54 GMT

### Minor changes

- chore: remove SchemaDefinition synonym type (use SchemaDescriptor directly)

## 2.0.1
Thu, 06 Aug 2026 07:20:49 GMT

### Patches

- publish clean export metadata and classic TypeScript subpath mappings

## 2.0.0
Wed, 05 Aug 2026 16:48:52 GMT

### Breaking changes

- refactor!: group secondary APIs, remove aliases, make async checks explicit, and require declarative definitions for JSON Schema export

## 1.2.2
Sun, 26 Jul 2026 06:43:54 GMT

### Patches

- refactor(spell): derive vite external list from package.json via readWorkspaceDeps() instead of hand-listing dependencies

## 1.2.1
Fri, 24 Jul 2026 05:28:41 GMT

### Patches

- chore: bump engines.node to >=22 to match .nvmrc/CLAUDE.md's Node 22 requirement

## 1.2.0
Fri, 17 Jul 2026 14:17:07 GMT

### Minor changes

- feat: add scoped spell overrides and async variant parsing

## 1.1.2
Tue, 14 Jul 2026 06:12:09 GMT

### Patches

- fix: rewrite workspace:* deps to real semver on publish (was shipping literal 'workspace:*' to npm, breaking installs outside this monorepo)

## 1.1.1
Tue, 07 Jul 2026 09:20:39 GMT

### Patches

- chore: declare minimum supported Node.js version (>=18) in package.json engines

## 1.1.0
Sun, 05 Jul 2026 05:52:18 GMT

### Minor changes

- feat(spell): add min()/max()/size()/nonEmpty() constraints to s.map(), fix docs/string.regex() equals() limitation note

### Patches

- fix(spell): propagate async validate() through map/set/record/tuple parseAsync(), fix InstanceOfSchema.equals()/toDescriptor(), preserve state in ObjectSchema.merge(), correct misleading internal error messages, fix ValidationError->SpellValidationError doc drift

## 1.0.1
Fri, 03 Jul 2026 06:00:47 GMT

### Patches

- chore(spell): rename internal _warn.ts to _dev.ts

## 1.0.0
Wed, 01 Jul 2026 16:10:37 GMT

### Breaking changes

- Initial public release

