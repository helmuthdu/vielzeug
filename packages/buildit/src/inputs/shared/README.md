<!-- markdownlint-disable MD012 -->

# Form Shared Modules

This folder follows a single organization pattern by concern:

- `composables/` - stateful `use*` APIs used by form components
- `dom-sync/` - host/DOM synchronization helpers (`mount*` APIs)
- `utils/` - pure stateless helpers for value parsing and assistive state
- `validation/` - validation trigger contracts and field-level wrappers

## Conventions

- `use-*` files expose composables only.
- `mount-*` and DOM effects live under `dom-sync/`.
- Pure helpers and derived state calculators live under `utils/`.
- Validation policy helpers live under `validation/`.
