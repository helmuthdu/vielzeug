---
title: Forge 3.0 Migration
description: Migrate Forge forms to flat issues, Standard Schema, structural persistence, and hardened immutable values.
---

# Forge 3.0 Migration

## Return flat validation issues

```diff
- validate: () => ({ fields: { email: 'Invalid email' }, formError: undefined })
+ validate: () => [{ path: ['email'], message: 'Invalid email' }]
```

Read `result.issues` instead of `result.errors`. Form-level errors use `path: []` and remain available as `form.state.formError`.

Removed validation types:

- `FormErrors<TValues>`
- `ValidationErrors<TValues>`

`ValidationResult` and `SubmitResult` no longer carry the form-value generic because their invalid branch contains portable flat issues.

## Rename the Spell adapter

```diff
- import { customValidator } from '@vielzeug/forge/spell';
+ import { schemaValidator } from '@vielzeug/forge/schema';

  const form = createForm({
    initialValues,
-   validate: customValidator(schema),
+   validate: schemaValidator(schema),
  });
```

`schemaValidator()` accepts any Standard Schema-compatible validator. It uses validation output only to determine success and issues; schema transformations do not replace form values. Spell preserves union failures as stable union-level Standard Schema issues.

Cancellation settles Forge validation promptly even when the underlying schema promise continues running.

## Rename the persistence adapter

```diff
- import { loadForm, saveForm } from '@vielzeug/forge/vault';
+ import { loadForm, saveForm } from '@vielzeug/forge/persist';
```

Vault stores satisfy the structural persistence contract directly. Other stores may implement the same typed `get()` and `put()` operations.

Pass cancellation as the final option:

```ts
await loadForm(form, store, 'drafts', 'profile', codec, { signal });
await saveForm(form, store, 'drafts', codec, { signal });
```

Loading returns `false` instead of overwriting edits made while the read was pending. Form disposal aborts active persistence operations.

## Use deeply readonly snapshots

Public snapshots remain deeply readonly. Date mutator methods are no longer exposed on form snapshots.

Dates are cloned when they enter the form and exposed without mutator methods. `File` and `Blob` preserve identity. Forge now rejects:

- functions, symbols, bigint, and non-finite numbers
- circular object graphs
- sparse arrays
- non-plain class instances

Array field indexes must be non-negative safe integers.

## Inspect explicit validity

`FormState.valid` is replaced by `FormState.validity`, whose value is `'invalid' | 'unknown' | 'valid'`.

Existing issues remain visible while edited values have unknown validity. Call `validate()` according to the application’s blur, change, step, or submit policy.

## Update FormData boundaries

`toFormData()` continues to flatten nested objects with dot notation and repeat scalar or binary array entries. Object keys containing dots and arrays containing nested objects now throw `ForgeConfigError` instead of silently colliding or producing `"[object Object]"`.

## NodeNext and errors

Root and subpath declarations use explicit `.js` specifiers. Forge error names remain stable in minified ESM and CJS artifacts.

---

# Forge 2.0 Migration

Forge 2 introduced nested field handles, explicit validation and submission, terminal disposal, and immutable snapshots. Replace flat controller string paths with `form.field('name')` and dispose forms with their owner.
