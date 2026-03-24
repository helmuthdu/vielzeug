# Change Log - @vielzeug/stateit

This log was last generated on Tue, 24 Mar 2026 22:12:47 GMT and should not be manually modified.

## 2.0.0
Tue, 24 Mar 2026 22:12:47 GMT

### Breaking changes

- Major release: fine-grained reactive primitives — signal(), computed(), effect(), watch(), batch(), untrack(), and readonly(); store() for reactive object state with patch(), update(), reset(), select() for derived slices, and freeze(); derived() for multi-source computed signals; writable() for custom getter/setter signals; nextValue() promise for async signal observation; onCleanup() for effect-scoped teardown; [Symbol.dispose]() on all subscription handles; configureStateit() for global max-iteration limits; shallowEqual helper; full TypeScript generics throughout

