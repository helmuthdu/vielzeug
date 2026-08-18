---
title: Forge Migration
---

# Forge Migration

## Forge 2.2

Forge 2.2 unifies result types, adds `submit(signal?)`, adds array item field handles, and moves `toFormData` to its own subpath.

### Unified result types

`ValidationResult` and `SubmitResult` now share a `status` discriminator (`'aborted' | 'invalid' | 'ok' | 'valid'`). The old `ok`/`type` fields on `SubmitResult` are removed.

```ts
// Before
const result = await form.submit(handler);
if (!result.ok && result.type === 'validation') console.log(result.errors);

// After
const result = await form.submit(handler);
if (result.status === 'invalid') console.log(result.errors);
```

### `submit(handler, signal?)`

`submit` now accepts an optional `AbortSignal` and passes an `AbortSignal` to the handler. When the signal aborts, `submit` returns `{ status: 'aborted' }` instead of rejecting.

```ts
// Before — no cancellation support
const result = await form.submit(async (value) => save(value));

// After — cancellable submission
const controller = new AbortController();
const result = await form.submit(async (value, signal) => save(value, signal), controller.signal);
```

### Array item field handles

`field.field(index)` now supports array items. Array-item Spell errors map to per-item fields instead of the parent array field.

```ts
const items = form.field('items');
items.field(0).set({ email: 'a@example.com' });
items.field(0).field('email').error; // per-item error
```

### `toFormData` moved to `@vielzeug/forge/form-data`

```ts
// Before
import { toFormData } from '@vielzeug/forge';

// After
import { toFormData } from '@vielzeug/forge/form-data';
```

### `FormState` changes

`FormState.valid` is replaced by `FormState.validity` (`'invalid' | 'unknown' | 'valid'`). `FormState.error` is replaced by `FormState.formError`. `FormState.hasErrors` is added.

```ts
// Before
form.state.valid;
form.state.error;

// After
form.state.validity === 'valid';
form.state.formError;
form.state.hasErrors;
```

### `Field.state` added

`Field` now exposes a `state` property that returns `{ dirty, error, touched, value }` in a single snapshot.

### `Date` leaves accepted

Form values now accept `Date` instances as atomic leaves. `Map` and `Set` remain rejected.

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
