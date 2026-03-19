---
title: Formit — Usage Guide
description: Fields, validation, submission, subscriptions, bind, reset, and advanced patterns for Formit.
---

# Formit Usage Guide

::: tip New to Formit?
Start with the [Overview](./index.md) for a quick introduction, then use this page for implementation details.
:::

[[toc]]

## Basic Usage

```ts
const form = createForm({
  defaultValues: {
    email: '',
    password: '',
    profile: { age: 0, name: '' },
  },
  validators: {
    email: (v) => (!String(v).includes('@') ? 'Invalid email' : undefined),
    password: (v) => (String(v).length < 8 ? 'Min 8 chars' : undefined),
  },
});

form.set('profile.age', 30);
form.patch({ profile: { name: 'Alice' } });

const email = form.get('email');
const values = form.values();
```

## Validation

Field validators run per field. Form validator runs on full validation only.

```ts
const form = createForm({
  defaultValues: { confirmPassword: '', password: '' },
  validators: {
    password: (v) => (String(v).length < 8 ? 'Min 8 chars' : undefined),
  },
  validator: (values) => {
    if (values['password'] !== values['confirmPassword']) {
      return { confirmPassword: 'Passwords must match' };
    }

    return undefined;
  },
});

await form.validateField('password');

await form.validate();
await form.validate({ fields: ['password'] });
await form.validate({ onlyTouched: true });

const controller = new AbortController();
await form.validate({ signal: controller.signal });
controller.abort();
```

Schema adapter:

```ts
import { z } from 'zod';

const schema = z.object({
  age: z.number().min(18, 'Must be 18+'),
  email: z.string().email('Invalid email'),
});

const form = createForm({
  defaultValues: { age: 0, email: '' },
  ...fromSchema(schema),
});
```

## Submission

```ts
try {
  await form.submit(async (values) => {
    await fetch('/api/submit', {
      body: JSON.stringify(values),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });
  });
} catch (error) {
  if (error instanceof FormValidationError) {
    console.log(error.errors);
  } else if (error instanceof SubmitError) {
    console.log('Submission already in progress');
  } else {
    throw error;
  }
}

await form.submit(saveDraft, { skipValidation: true });
await form.submit(onSubmit, { fields: ['email', 'password'] });
```

## Subscriptions

```ts
const stopForm = form.subscribe((state) => {
  console.log(state.isValid, state.isDirty, state.errors);
});

const stopEmail = form.watch('email', (field) => {
  console.log(field.value, field.error, field.touched, field.dirty);
});

form.watch('email', () => {}, { immediate: false });

stopEmail();
stopForm();
```

## Bind

```ts
const binding = form.bind('email');

input.name = binding.name;
input.value = String(binding.value ?? '');
input.onblur = binding.onBlur;
input.oninput = binding.onChange;

const fileBinding = form.bind('attachment', {
  touchOnBlur: true,
  validateOnBlur: true,
  valueExtractor: (e) => (e as { target: { files?: FileList } }).target.files?.[0] ?? null,
});
```

## Reset

```ts
const form = createForm({ defaultValues: { email: '', name: '' } });

form.reset();
form.reset({ email: 'guest@example.com', name: 'Guest' });
form.resetField('name');
```

`reset(newValues)` updates both current values and the baseline used for dirty tracking.

## Dirty and Touched State

```ts
form.touch('email');
form.touch('email', 'password');
form.touchAll();

form.untouch('email');
form.untouchAll();

console.log(form.isDirty, form.isTouched);
console.log(form.isFieldDirty('email'));
console.log(form.isFieldTouched('email'));
console.log(form.getError('email'));
```

## Arrays and Multi-select

```ts
const form = createForm({ defaultValues: { tags: ['a'] } });

form.appendField('tags', 'b');
form.removeField('tags', 0);
form.moveField('tags', 0, 1);
```

## File Uploads

```ts
const form = createForm({
  defaultValues: { attachment: null as File | null, name: '' },
});

form.set('attachment', fileInput.files?.[0] ?? null);

await form.submit(async () => {
  await fetch('/upload', {
    body: form.toFormData(),
    method: 'POST',
  });
});

const fd = toFormData(form.values());
```

## Advanced Patterns

```ts
// Wizard step validation
await form.validate({ fields: ['email'] });

// Keep untouched-field errors while validating only touched fields
await form.validate({ onlyTouched: true });

// Autosave without validation
await form.submit(saveDraft, { skipValidation: true });
```

## Best Practices

- Keep validators pure and deterministic.
- Prefer `watch(name, ...)` over full `subscribe(...)` when rendering one field.
- Use `reset(newValues)` after loading server data to keep dirty baseline accurate.
- Use `skipValidation` only for intentional flows like autosave.
- Call `dispose()` when form lifecycle ends.
