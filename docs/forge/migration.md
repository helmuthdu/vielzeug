---
title: Forge Migration
---

# Forge Migration

## Forge 2.0

Forge 2.0 replaces the flat controller and Ripple runtime with explicit immutable forms, safe value constraints, and DOM, Spell `customValidator`, Vault adapters and removes the `./devtools` subpath and inlines the internal store into `createForm`.

### Replace `debugForm()` with `form.subscribe()`

The `@vielzeug/forge/devtools` subpath and `debugForm()` export are removed. The function was a thin wrapper over `form.subscribe()` and `console.debug()`. Replicate it inline:

```ts
// Before
import { debugForm } from '@vielzeug/forge/devtools';
const stop = debugForm(form, { label: 'checkout' });

// After
const stop = form.subscribe((state) => {
  console.debug('[forge:checkout]', state);
}, { immediate: true });
```

### No other public API changes

`createForm`, `Form`, `Field`, all adapters (`/dom`, `/spell`, `/vault`), errors, and types are unchanged. The store inlining is internal — no behavior change.

### Create explicit forms

Replace flat controller usage with `createForm`. Treat form values and state as immutable snapshots; apply changes through the current form operations.

### Move validation to constraints and adapters

Encode safe value constraints in the form definition. Update validation integrations to use the DOM, Spell `customValidator`, or Vault adapter appropriate to the boundary.

### Recheck submission and persistence

Rework submission, reset, persistence, and disposal flows against the 2.0 form contract. Handle `ForgeSubmitError` and `ForgeValidationError` at existing application error boundaries.

Review the [Usage Guide](./usage.md) and [API Reference](./api.md) for current form, adapter, and error contracts.
