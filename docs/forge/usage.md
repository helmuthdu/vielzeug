---
title: Forge — Usage Guide
description: Build, validate, submit, bind, and persist typed forms with Forge.
---

[[toc]]

## Basic Usage

```ts
import { createForm } from '@vielzeug/forge';

const form = createForm({
  initialValues: {
    email: '',
    profile: { name: '' },
  },
});
```

Read `form.value` for the current deeply readonly snapshot. Use `set()` for whole-form replacement and field handles for focused updates.

```ts
form.field('email').set('ada@example.com');
form.field('profile').field('name').set('Ada');
```

## Validate explicitly

Validators return a flat issue list. Forge does not choose blur/change/submit policy for the application.

```ts
const form = createForm({
  initialValues: { email: '', password: '' },
  validate: (values) => {
    const issues = [];
    if (!values.email.includes('@')) issues.push({ path: ['email'], message: 'Invalid email' });
    if (values.password.length < 12) issues.push({ path: ['password'], message: 'Use at least 12 characters' });
    return issues.length ? issues : undefined;
  },
});

const result = await form.validate();
if (result.status === 'invalid') console.log(result.issues);
```

A field's `error` is derived from the first issue whose path equals that field path. Use `path: []` for form-level failures.

## Submit

```ts
const result = await form.submit(async (values, signal) => {
  const response = await fetch('/profile', {
    body: JSON.stringify(values),
    method: 'POST',
    signal,
  });
  return response.json();
});

if (result.status === 'ok') console.log(result.value);
```

`submit()` validates first, passes the exact validated snapshot to the handler, prevents duplicate active submissions, and reports aborts explicitly.

## Bind an element

```ts
import { bindField } from '@vielzeug/forge/dom';

const stop = bindField(input, form.field('email'), {
  read: (element) => element.value,
  write: (element, value) => { element.value = value; },
});
```

Call `stop()` when the element owner unmounts.

## Use a Standard Schema validator

```ts
import { schemaValidator } from '@vielzeug/forge/schema';

const form = createForm({
  initialValues: { email: '' },
  validate: schemaValidator(UserSchema),
});
```

Spell schemas implement Standard Schema directly. Forge uses the schema result only for success and issues; transformations do not replace form values. Cancellation settles Forge promptly even when underlying validator work cannot be stopped.

## Persist a draft

```ts
import { loadForm, saveForm } from '@vielzeug/forge/persist';

const codec = {
  fromRecord: (record) => record.value,
  toRecord: (values) => ({ id: 'profile', value: values }),
};

await saveForm(form, store, 'drafts', codec);
await loadForm(form, store, 'drafts', 'profile', codec, { signal });
```

Persistence remains explicit. The store owns durability and validation; the codec owns record shape. Loading returns `false` rather than overwriting edits made while storage was pending.

## Serialize FormData

```ts
import { toFormData } from '@vielzeug/forge/form-data';

await fetch('/profile', { body: toFormData(form.value), method: 'POST' });
```

Object keys containing dots and arrays containing nested objects reject instead of producing ambiguous or lossy entries.

## Dispose

```ts
form.dispose();
```

Disposal settles active Forge validation and signals active submission/persistence work and clears subscribers. It does not dispose borrowed validators, stores, or DOM elements.

## Framework Integration

Inject an owner-scoped form and subscribe to its stable `FormState` snapshot.

::: code-group

```tsx [React]
import { useSyncExternalStore } from 'react';
import type { Form } from '@vielzeug/forge';

export function useFormState<T extends Record<string, unknown>>(form: Form<T>) {
  return useSyncExternalStore(form.subscribe, () => form.state, () => form.state);
}
```

```ts [Vue]
import { onUnmounted, shallowRef } from 'vue';
import type { Form } from '@vielzeug/forge';

export function useFormState<T extends Record<string, unknown>>(form: Form<T>) {
  const state = shallowRef(form.state);
  const stop = form.subscribe((next) => { state.value = next; }, { immediate: true });
  onUnmounted(stop);
  return state;
}
```

```ts [Svelte]
import type { Form } from '@vielzeug/forge';

export const formState = <T extends Record<string, unknown>>(form: Form<T>) => ({
  subscribe(run: (state: Form<T>['state']) => void) {
    return form.subscribe(run, { immediate: true });
  },
});
```

:::

The owner that creates the form disposes it. Framework subscriptions own only their unsubscribe callbacks.

## Working with Other Vielzeug Libraries

- Pass Spell schemas to `schemaValidator()` through Standard Schema.
- Pass Vault stores directly to `loadForm()` and `saveForm()`.
- Bind Ore or native controls with `bindField()` and owner cleanup.

## Best Practices

- Keep validation timing in the UI layer.
- Return flat issues rather than shape-coupled error trees.
- Use field handles instead of string paths.
- Decode persisted/network data at its boundary.
- Dispose forms with their owner.
