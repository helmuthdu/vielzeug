# Change Log - @vielzeug/postmaster

This log was last generated on Sun, 30 Aug 2026 13:16:08 GMT and should not be manually modified.

## 2.2.0
Sun, 30 Aug 2026 13:16:08 GMT

### Minor changes

- refactor: extract normalize to _store-utils. Add PostmasterJobError. Remove mergeSignals helper.

## 2.1.0
Fri, 28 Aug 2026 07:44:01 GMT

### Minor changes

- Add EnqueueOptions.availableAt for delayed job eligibility

## 2.0.0
Wed, 26 Aug 2026 17:29:55 GMT

### Breaking changes

- feat: initial release.

### Minor changes

- feat: replace debug factories, logger options, and onError callbacks with unified tap() observability pattern.

### Patches

- chore: add sideEffects: false for tree-shaking.

