# Change Log - @vielzeug/spell

This log was last generated on Fri, 17 Jul 2026 14:17:07 GMT and should not be manually modified.

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

