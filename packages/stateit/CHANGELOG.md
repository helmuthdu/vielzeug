# Change Log - @vielzeug/stateit

This log was last generated on Sun, 17 May 2026 05:10:17 GMT and should not be manually modified.

## 3.0.0
Sun, 17 May 2026 05:10:17 GMT

### Breaking changes

- Release a new major version with v2.2 state-core refactors, improved computed/effect performance, and breaking API simplification.

## 2.1.0
Sat, 04 Apr 2026 13:30:02 GMT

### Minor changes

- General Improvements and Bugfixes

## 2.0.0
Tue, 24 Mar 2026 22:12:47 GMT

### Breaking changes

- Major release: fine-grained reactive primitives — signal(), computed(), effect(), watch(), batch(), untrack(), and readonly(); store() for reactive object state with patch(), update(), reset(), select() for derived slices, and freeze(); derived() for multi-source computed signals; writable() for custom getter/setter signals; nextValue() promise for async signal observation; onCleanup() for effect-scoped teardown; [Symbol.dispose]() on all subscription handles; configureStateit() for global max-iteration limits; shallowEqual helper; full TypeScript generics throughout

