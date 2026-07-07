# Change Log - @vielzeug/ripple

This log was last generated on Tue, 07 Jul 2026 09:20:39 GMT and should not be manually modified.

## 1.2.1
Tue, 07 Jul 2026 09:20:39 GMT

### Patches

- chore: declare minimum supported Node.js version (>=18) in package.json engines
- docs: align devtools.ts header comment style with the rest of the ecosystem

## 1.2.0
Sun, 05 Jul 2026 06:22:27 GMT

### Minor changes

- feat(ripple): store.replace()/reset() now remove omitted keys instead of nulling them, add resource().refresh() for manual refetch

## 1.1.0
Fri, 03 Jul 2026 06:00:47 GMT

### Minor changes

- feat(ripple): fix store patch/replace atomicity, resource() auto-dispose, SSR scheduling isolation, and add watch() multi-source support

### Patches

- chore(ripple): rename internal _warn.ts to _dev.ts

## 1.0.0
Wed, 01 Jul 2026 16:10:37 GMT

### Breaking changes

- Initial public release

