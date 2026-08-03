---
title: Forge — Usage Guide
description: Build immutable forms, validate whole values, and use optional adapters.
---

[[toc]]

## Basic Usage

Create one form value and update object branches through stable typed operations. Form values support primitives, plain objects, arrays, `File`, and `Blob`; mutable class instances such as `Date`, `Map`, and `Set` are rejected.

```ts
import { createForm } from '@vielzeug/forge';

const form = createForm({
  initialValues: { profile: { email: '', name: '' }, tags: [] as string[] },
  validate: (value) => ({
    fields: { profile: { email: value.profile.email.includes('@') ? undefined : 'Invalid email' } },
  }),
});

const email = form.field('profile').field('email');
email.set('ada@example.com');
form.field('tags').set((tags) => [...tags, 'typescript']);

console.log(form.value.profile.email);
```

## Reset Values and Branches

Reset a field when one branch should return to its exact baseline. Reset the form with a value when newly loaded data should become the clean baseline.

```ts
const name = form.field('profile').field('name');

name.set('Ada');
name.touch();
name.reset();

form.reset({ profile: { email: 'ada@example.com', name: 'Ada' }, tags: [] });
```

An absent optional parent remains absent after a child reset. Arrays are complete values; replace them with an updater instead of retaining index handles.

## Validate and Submit

Return `fields` and an optional `formError` from one validator. `validate()` replaces the complete validation snapshot and returns an explicit status.

```ts
const passwordForm = createForm({
  initialValues: { password: '', passwordConfirmation: '' },
  validate: (value) => ({
    fields: {
      password: value.password.length >= 8 ? undefined : 'Use at least eight characters',
      passwordConfirmation: value.password === value.passwordConfirmation ? undefined : 'Passwords must match',
    },
  }),
});

const validation = await passwordForm.validate();

if (validation.status === 'invalid') console.log(validation.errors);
if (validation.status === 'aborted') console.log('Validation cancelled');

const result = await passwordForm.submit((value) => Promise.resolve(value.password.length));

if (result.ok) console.log(result.value);
```

Starting another validation aborts the previous run. Field edits preserve existing errors until the next validation replaces them. Unexpected validator failures reject as `ForgeValidationError` with the original error as `cause`.

## Observe State

Use form subscriptions for aggregate metadata and field subscriptions for one branch. Subscribing after disposal throws `ForgeDisposedError`.

```ts
const errors: unknown[] = [];
const observedForm = createForm({
  initialValues: { email: '' },
  onSubscriberError: (error) => errors.push(error),
});

const stopForm = observedForm.subscribe((state) => {
  console.log(state.valid, state.submitting);
}, { immediate: true });
const stopField = observedForm.field('email').subscribe((state) => {
  console.log(state.value, state.error);
}, { immediate: true });

stopField();
stopForm();
```

Without `onSubscriberError`, Forge rethrows subscriber failures asynchronously after completing its state transition.

## Testing

Test the form without a DOM. Read its immutable value, invoke a method, then assert the resulting state or validation result.

```ts
import { expect, test } from 'vitest';
import { createForm } from '@vielzeug/forge';

test('requires an email address', async () => {
  const form = createForm({
    initialValues: { email: '' },
    validate: (value) => ({ fields: { email: value.email.includes('@') ? undefined : 'Invalid email' } }),
  });

  await expect(form.validate()).resolves.toEqual({
    errors: { email: 'Invalid email' },
    formError: undefined,
    status: 'invalid',
  });
});
```

## Framework Integration

Use `form.value` and subscriptions with any renderer. Bind one DOM input through `/dom`; validation scheduling remains application policy.

::: code-group

```ts [React]
import { useEffect, useState } from 'react';
import { createForm } from '@vielzeug/forge';

const form = createForm({ initialValues: { email: '' } });

export function EmailForm() {
  const [, rerender] = useState(0);

  useEffect(() => {
    const stop = form.subscribe(() => rerender((revision) => revision + 1));

    return () => stop();
  }, []);

  return <input value={form.field('email').value} onChange={(event) => form.field('email').set(event.target.value)} />;
}
```

```ts [Vue 3]
import { onUnmounted, ref } from 'vue';
import { createForm } from '@vielzeug/forge';

const form = createForm({ initialValues: { email: '' } });
const revision = ref(0);
const stop = form.subscribe(() => revision.value++);

onUnmounted(stop);
```

```ts [Svelte]
<script lang="ts">
  import { onDestroy } from 'svelte';
  import { createForm } from '@vielzeug/forge';

  const form = createForm({ initialValues: { email: '' } });
  let revision = 0;
  const stop = form.subscribe(() => revision++);

  onDestroy(stop);
</script>

<input value={form.field('email').value} on:input={(event) => form.field('email').set(event.currentTarget.value)} />
```

:::

## Working with Other Vielzeug Libraries

Use Spell when one schema owns validation and Vault when an explicit record codec owns persistence.

```ts
import { createForm } from '@vielzeug/forge';
import { customValidator } from '@vielzeug/forge/spell';
import { s } from '@vielzeug/spell';

const Profile = s.object({ email: s.string().email() });
const form = createForm({ initialValues: { email: '' }, validate: customValidator(Profile) });
```

`customValidator()` preserves unrelated Spell errors, maps each union to its closest branch, and maps array-item failures to the parent array field. Parse again at the submit boundary when a Spell transform must produce the outgoing payload.

```ts
import { loadForm, saveForm } from '@vielzeug/forge/vault';

await saveForm(form, db, 'drafts', codec);
const restored = await loadForm(form, db, 'drafts', 'profile', codec);
console.log(restored);
```

`loadForm()` uses `form.reset()`, so a restored value is clean. Store a selected `File`, not `FileList`, in form state; `FileList` is transport-only for `toFormData()`.

## Best Practices

- Keep form values to primitives, plain objects, arrays, `File`, and `Blob`.
- Update array fields through immutable replacement functions.
- Validate complete values instead of rebuilding field-validator graphs.
- Handle `aborted` validation results before rendering errors.
- Preserve errors through field edits until a deliberate validation refresh.
- Return subscription cleanup from framework lifecycle hooks.
- Provide `onSubscriberError` when application subscribers can throw.
- Decode Vault records before passing them to `loadForm()`.
