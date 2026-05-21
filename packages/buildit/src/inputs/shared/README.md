<!-- markdownlint-disable MD012 -->

# Form Shared Modules

This folder organizes shared logic used across form input components by concern:

- `bundles/` — reusable prop/style bundles (e.g., `disablableBundle`, `sizableBundle`, `themableBundle`)
- `composables/` — stateful `use*` APIs used by form components
- `dom-sync/` — DOM synchronization helpers (currently: `createDropdownPositioner`)
- `utils/` — pure stateless helpers for value parsing and choice state

## Conventions

- `use-*` files expose composables only.
- DOM helpers live under `dom-sync/`.
- Pure helpers and derived state calculators live under `utils/`.
- Form context (`FORM_CTX`) is provided by `bit-form` and injected directly in each component — no separate sync layer needed.
