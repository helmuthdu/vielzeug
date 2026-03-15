---
title: Formit — Usage Guide
description: Fields, validation, submission, subscriptions, bind, reset, and advanced patterns for Formit.
---

# Formit Usage Guide

::: tip New to Formit?
Start with the [Overview](./index.md) for a quick introduction and installation, then come back here for in-depth usage patterns.
:::

[[toc]]

## Import

```ts
import { createForm, fromSchema } from '@vielzeug/formit';

// Standalone utilities
import { toFormData } from '@vielzeug/formit';

// Error classes
import { FormValidationError, SubmitError } from '@vielzeug/formit';

// Types only
import type {
  BindConfig,
  BindResult,
  FieldState,
  FieldValidator,
  FlatKeyOf,
  Form,
  FormOptions,
  FormState,
  FormValidator,
  SafeParseSchema,
  SetOptions,
  SubmitOptions,
  TypeAtPath,
  Unsubscribe,
  ValidateOptions,
  ValidateResult,
} from '@vielzeug/formit';
```

## Basic Usage

### Creating a Form

```ts
const form = createForm({
  defaultValues: {
    name: '',
    email: '',
    age: 0,
  },
  validators: {
    name: (v) => (!v ? 'Name is required' : undefined),
    email: [
      (v) => (!v ? 'Email is required' : undefined),
      (v) => (v && !String(v).includes('@') ? 'Invalid email' : undefined),
    ],
  },
});
```

### Nested Objects

Plain objects inside `defaultValues` are automatically flattened into dot-notation keys. `values()` reconstructs the original nested shape.

```ts
const form = createForm({
  defaultValues: {
    user: {
      name: 'Alice',
      profile: {
        age: 25,
        city: 'NYC',
      },
    },
  },
});

form.get('user.name'); // 'Alice'
form.get('user.profile.age'); // 25 — typed as number
form.set('user.name', 'Bob');

// patch() — deep partial merge; only the supplied keys change; siblings are preserved
form.patch({ user: { profile: { city: 'LA' } } });
// user.name is still 'Bob'; user.profile.age is still 25
```

You can also use dot-notation string keys directly — both styles are equivalent:

```ts
const form = createForm({
  defaultValues: {
    'user.name': 'Alice',
    'user.profile.age': 25,
  },
});
```

### Reading and Writing Values

```ts
// get() — return type inferred from the field path
const email = form.get('email'); // string
const age = form.get('age'); // number

// set() — value type enforced
form.set('email', 'user@example.com');

// patch() — deep partial merge of multiple fields at once
form.patch({ email: 'user@example.com', name: 'Alice' });

// values() — reconstruct nested shape
const all = form.values();
```

## Validation

### Field-Level Validators

Single or multiple validators per field. When an array is given, the first failing validator wins:

```ts
const form = createForm({
  defaultValues: {
    email: '',
    password: '',
  },
  validators: {
    email: [
      (v) => (!v ? 'Email is required' : undefined),
      (v) => (v && !String(v).includes('@') ? 'Invalid email format' : undefined),
      (v) => (v && String(v).length > 100 ? 'Email too long' : undefined),
    ],
    password: (v) => {
      if (!v) return 'Password is required';
      if (String(v).length < 8) return 'Min 8 characters';
      if (!/[A-Z]/.test(String(v))) return 'Must contain uppercase';
      if (!/[0-9]/.test(String(v))) return 'Must contain number';
    },
  },
});
```

### Form-Level Validators

Cross-field validation runs only on full `validate()` or `submit()` — never during partial validation.

```ts
const form = createForm({
  defaultValues: {
    password: '',
    confirmPassword: '',
    startDate: '',
    endDate: '',
  },
  validator: (values) => {
    const errors: Record<string, string> = {};
    if (values['password'] !== values['confirmPassword']) {
      errors['confirmPassword'] = 'Passwords must match';
    }
    const start = new Date(String(values['startDate']));
    const end = new Date(String(values['endDate']));
    if (start > end) {
      errors['endDate'] = 'End date must be after start date';
    }
    return errors;
  },
});
```

### Async Validators

Validators can be async — each receives an `AbortSignal` to detect cancellation:

```ts
const form = createForm({
  defaultValues: {
    username: '',
  },
  validators: {
    username: async (value, signal) => {
      if (!value) return 'Username required';

      const response = await fetch(`/api/check-username?username=${encodeURIComponent(String(value))}`, { signal });
      const { exists } = await response.json();

      if (exists) return 'Username already taken';
    },
  },
});
```

### Schema Integration

`fromSchema()` wraps any Zod/Valibot-compatible `safeParse` schema as the form-level validator:

```ts
import { z } from 'zod';
import { createForm, fromSchema } from '@vielzeug/formit';

const schema = z.object({
  email: z.string().email('Invalid email'),
  age: z.number().min(18, 'Must be 18+'),
});

const form = createForm({
  defaultValues: { email: '', age: 0 },
  ...fromSchema(schema), // spreads in { validator: ... }
});

const { valid, errors } = await form.validate();
```

You can still combine `fromSchema` with per-field `validators`:

```ts
const form = createForm({
  defaultValues: { email: '', age: 0 },
  ...fromSchema(schema),
  validators: {
    email: (v) => (!v ? 'Email is required' : undefined), // runs on every validateField()
  },
});
```

### Manual Validation

`validate()` returns a `ValidateResult` — `{ valid: boolean; errors: Record<string, string> }`:

```ts
// Single field — sets isValidating, stores result in error map
const error = await form.validateField('email');

// Full validation — replaces ALL errors, runs the form-level validator
const { valid, errors } = await form.validate();

// Partial validation — updates only these fields; preserves all other errors;
// does NOT run the form-level validator
const { errors } = await form.validate({ fields: ['email', 'password'] });

// Only validate fields the user has touched
const { valid } = await form.validate({ onlyTouched: true });

// With cancellation
const controller = new AbortController();
await form.validate({ signal: controller.signal });
controller.abort();
```

## Submission

```ts
// Basic submit — validates, then calls the handler with typed values
await form.submit(async (values) => {
  await fetch('/api/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(values),
  });
});

// Skip validation (e.g. auto-save)
await form.submit(handler, { skipValidation: true });

// Restrict which fields are validated before submit
await form.submit(handler, { fields: ['email', 'password'] });
```

`submit()` sets `isSubmitting` while running and guards against double-submits (`SubmitError`). It throws `FormValidationError` if validation fails.

```ts
try {
  await form.submit(onSubmit);
} catch (error) {
  if (error instanceof FormValidationError) {
    // errors are already stored in the form — re-throw only if you need to handle them here
    console.log(error.errors); // Record<string, string>
  } else if (error instanceof SubmitError) {
    // double-submit attempt
  } else {
    throw error; // network or server error
  }
}
```

## Subscriptions

### Form-Level

Subscribe to the full `FormState` snapshot whenever anything changes:

```ts
const unsubscribe = form.subscribe((state) => {
  console.log(state.isValid, state.isDirty, state.errors);
});

// Later
unsubscribe();
```

### Field-Level

Subscribe to a single field's `FieldState` — re-fires only when that field changes:

```ts
const unsubscribe = form.watch('email', ({ value, error, touched, dirty }) => {
  emailInput.value = String(value);
  errorSpan.textContent = touched ? (error ?? '') : '';
});

// Skip the immediate fire on registration
form.watch('email', handler, { immediate: false });
```

::: tip
`watch` is more efficient than `subscribe` when you only need to react to one field — it avoids re-running for unrelated changes.
:::

## Bind

`bind()` returns a live descriptor whose properties are getters — the values are read fresh each time the bound element reads them:

```ts
const binding = form.bind('email');
// { name: 'email', onBlur: fn, onChange: fn,
//   get value(), get error(), get touched(), get dirty() }

// Spread onto a native input
inputEl.name     = binding.name;
inputEl.value    = binding.value;
inputEl.onblur   = binding.onBlur;
inputEl.oninput  = binding.onChange;

// Or spread in JSX
<input {...form.bind('email')} type="email" />
```

### BindConfig

```ts
interface BindConfig {
  /** Custom function to extract value from a change event. Default: `e.target.value` */
  valueExtractor?: (event: Event) => unknown;
  /** Mark the field as touched on blur. Default: true */
  touchOnBlur?: boolean;
  /** Run validateField() on blur. Default: false */
  validateOnBlur?: boolean;
  /** Run validateField() on every change. Default: false */
  validateOnChange?: boolean;
}
```

```ts
// File input — extract File instead of string
const binding = form.bind('avatar', {
  valueExtractor: (e) => (e.target as HTMLInputElement).files?.[0] ?? null,
});

// Number input
const binding = form.bind('age', {
  valueExtractor: (e) => Number((e.target as HTMLInputElement).value),
});

// Disable touch-on-blur
const binding = form.bind('token', { touchOnBlur: false });
```

## Reset

```ts
const form = createForm({
  defaultValues: { name: '', email: '' },
});

// Reset entire form to original defaultValues
form.reset();

// Reset to new values (they also become the new baseline for dirty tracking)
form.reset({ name: 'Guest', email: '' });

// Reset a single field without touching the rest
form.resetField('name');
```

## Dirty and Touched State

### Touch

```ts
// Mark fields as touched
form.touch('email');
form.touch('email', 'password'); // multiple at once
form.touchAll(); // all fields

// Remove touched state (useful in multi-step flows between steps)
form.untouch('email');
form.untouchAll();
```

### Errors

```ts
// Set / clear individual errors
form.setError('email', 'Already taken');
form.setError('email'); // clear

// Replace all errors at once
form.setErrors({ email: 'Taken', password: 'Too short' });

// Clear all errors
form.clearErrors();
```

### Field Shorthand Getters

Read a single piece of field state without allocating a full snapshot object:

```ts
// equivalent to form.field('email').error — but no object alloc
form.getError('email'); // string | undefined
form.isFieldDirty('email'); // boolean
form.isFieldTouched('email'); // boolean

// Good for conditional rendering:
if (form.isFieldTouched('email') && form.getError('email')) {
  showEmailError();
}
```

## File Uploads

### Single File

```ts
const form = createForm({
  defaultValues: {
    avatar: null as File | null,
    title: '',
  },
});

// Handle file input
const fileInput = document.querySelector('input[type="file"]');
fileInput.addEventListener('change', (e) => {
  form.set('avatar', (e.target as HTMLInputElement).files?.[0] ?? null);
});

// Submit
await form.submit(async () => {
  await fetch('/api/upload', {
    method: 'POST',
    body: form.toFormData(), // File/Blob appended as-is; null/undefined omitted
  });
});
```

### File Validation

```ts
const form = createForm({
  defaultValues: {
    avatar: null as File | null,
  },
  validators: {
    avatar: (value) => {
      if (!value) return 'Avatar is required';

      const file = value as File;
      const maxSize = 5 * 1024 * 1024; // 5MB

      if (file.size > maxSize) return 'File too large (max 5MB)';
      if (!file.type.startsWith('image/')) return 'Must be an image';
    },
  },
});
```

## Arrays and Multi-Select

### Array Field Utilities

Use the built-in helpers instead of manual spread patterns:

```ts
const form = createForm({
  defaultValues: {
    tags: ['javascript', 'typescript'] as string[],
  },
});

// Append
form.appendField('tags', 'react'); // ['javascript', 'typescript', 'react']

// Remove by index
form.removeField('tags', 0); // ['typescript', 'react']

// Reorder (drag-and-drop)
form.moveField('tags', 0, 2); // move item at index 0 to index 2
```

Object lists work the same way:

```ts
const form = createForm({
  defaultValues: {
    items: [] as { name: string; qty: number }[],
  },
});

form.appendField('items', { name: '', qty: 1 });
form.removeField('items', 2);
form.moveField('items', 0, 3); // drag-and-drop reorder
```

### Multi-Select Inputs

```ts
const form = createForm({
  defaultValues: {
    skills: [] as string[],
  },
  validators: {
    skills: (v) => ((v as string[]).length < 2 ? 'Select at least 2 skills' : undefined),
  },
});

// Handle multi-select change
selectEl.addEventListener('change', () => {
  const selected = Array.from(selectEl.selectedOptions).map((o) => o.value);
  form.set('skills', selected);
});
```

### Checkboxes

```ts
const form = createForm({
  defaultValues: {
    interests: [] as string[],
  },
});

checkboxEl.addEventListener('change', (e) => {
  const interests = form.get('interests') as string[];
  const value = (e.target as HTMLInputElement).value;
  const checked = (e.target as HTMLInputElement).checked;

  form.set('interests', checked ? [...interests, value] : interests.filter((v) => v !== value));
});
```

## Advanced Patterns

### Multi-Step Forms

```ts
const form = createForm({
  defaultValues: {
    // Step 1
    name: '',
    email: '',
    // Step 2
    address: '',
    city: '',
    // Step 3
    cardNumber: '',
  },
});

const steps = [['name', 'email'], ['address', 'city'], ['cardNumber']];

async function nextStep(currentStep: number) {
  const { valid } = await form.validate({ fields: steps[currentStep] });
  if (valid) {
    // advance to next step
    // use untouchAll() to reset touched state between steps
    form.untouchAll();
  }
}
```

### Dynamic Array Fields

```ts
type Item = { name: string; quantity: number };

const form = createForm({
  defaultValues: {
    items: [] as Item[],
  },
});

function addItem() {
  form.appendField('items', { name: '', quantity: 0 });
}

function removeItem(index: number) {
  form.removeField('items', index);
}

function moveItem(from: number, to: number) {
  form.moveField('items', from, to);
}

function updateItem(index: number, field: keyof Item, value: Item[typeof field]) {
  const items = [...(form.get('items') as Item[])];
  items[index] = { ...items[index], [field]: value };
  form.set('items', items);
}
```

### Conditional Validation

```ts
const form = createForm({
  defaultValues: {
    accountType: 'personal' as 'personal' | 'business',
    companyName: '',
    vatNumber: '',
  },
});

function validateBusinessFields() {
  if (form.get('accountType') === 'business') {
    if (!form.get('companyName')) form.setError('companyName', 'Company name required');
    else form.setError('companyName');
    if (!form.get('vatNumber')) form.setError('vatNumber', 'VAT number required');
    else form.setError('vatNumber');
  } else {
    form.setError('companyName');
    form.setError('vatNumber');
  }
}
```

### Unsaved Changes Warning

```ts
const form = createForm({
  defaultValues: { name: '', email: '' },
});

window.addEventListener('beforeunload', (e) => {
  if (form.isDirty) {
    e.preventDefault();
    e.returnValue = '';
  }
});
```

### Auto-Save

```ts
const form = createForm({
  defaultValues: { content: '' },
});

let saveTimeout: ReturnType<typeof setTimeout>;

form.subscribe((state) => {
  if (state.isDirty) {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(async () => {
      await form.submit(
        async (values) => {
          await fetch('/api/auto-save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(values),
          });
        },
        { skipValidation: true },
      );
    }, 1000);
  }
});
```

## Best Practices

### 1. Always Subscribe in Framework Effects

```tsx
// ✅ Good
useEffect(() => form.subscribe(setState), [form]);

// ❌ Bad – creates memory leak
form.subscribe(setState);
```

### 2. Use Field Binding for Inputs

```tsx
// ✅ Good
<input {...form.bind('email')} />

// ❌ Verbose
<input
  name="email"
  value={form.get('email')}
  onChange={(e) => form.set('email', e.target.value)}
  onBlur={() => form.touch('email')}
/>
```

### 3. Catch both error types from `submit()`

```ts
// ✅ Good
try {
  await form.submit(onSubmit);
} catch (error) {
  if (error instanceof FormValidationError) {
    // Validation failed — errors are already in the form's error map
    for (const [field, message] of Object.entries(error.errors)) {
      console.log(`${field}: ${message}`);
    }
  } else if (error instanceof SubmitError) {
    // Double-submit guard
  } else {
    // Network or server error
  }
}

// ❌ Bad – swallows validation errors
form.submit(onSubmit).catch(console.error);
```

### 4. Use Nested Objects for Structured Data

```ts
// ✅ Good – natural nested structure, auto-flattened
defaultValues: {
  user: { name: '', email: '' },
  address: { street: '', city: '' },
}
// Access: form.get('user.name'), form.get('address.city')

// ✅ Also fine – explicit dot-notation keys
defaultValues: {
  'user.name': '',
  'user.email': '',
}

// ❌ Accessing nested object as a key – won't work
form.get('user'); // undefined (keys are 'user.name', 'user.email', ...)
```

### 5. Show Errors Only After Touch

```ts
const { error, touched } = form.field('email');
// or via watch:
form.watch('email', ({ error, touched }) => {
  errorSpan.textContent = touched ? (error ?? '') : '';
});
```

## Framework Integration

### React

**Basic Example:**

```tsx
import { createForm } from '@vielzeug/formit';
import { useEffect, useState } from 'react';

function ContactForm() {
  const [form] = useState(() =>
    createForm({
      defaultValues: {
        name: '',
        email: '',
        message: '',
      },
      validators: {
        email: (v) => (v && !String(v).includes('@') ? 'Invalid email' : undefined),
      },
    }),
  );

  const [state, setState] = useState(form.state);

  useEffect(() => form.subscribe(setState), [form]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.submit(async (values) => {
          await fetch('/api/contact', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(values),
          });
        });
      }}>
      <input {...form.bind('name')} placeholder="Name" />

      <input {...form.bind('email')} placeholder="Email" />
      {state.errors['email'] && <span>{state.errors['email']}</span>}

      <textarea {...form.bind('message')} />

      <button type="submit" disabled={state.isSubmitting}>
        {state.isSubmitting ? 'Sending...' : 'Send'}
      </button>
    </form>
  );
}
```

**Custom Hook:**

```tsx
import { useEffect, useState } from 'react';
import type { FormOptions } from '@vielzeug/formit';
import { createForm } from '@vielzeug/formit';

function useForm(init: FormOptions) {
  const form = createForm(init);
  const [state, setState] = useState(form.state);

  useEffect(() => form.subscribe(setState), [form]);

  return { form, state };
}

// Usage
function MyForm() {
  const { form, state } = useForm({
    defaultValues: {
      email: '',
    },
    validators: {
      email: (v) => (v && !String(v).includes('@') ? 'Invalid' : undefined),
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.submit(onSubmit);
      }}>
      <input {...form.bind('email')} />
      {state.errors['email'] && <span>{state.errors['email']}</span>}
      <button disabled={state.isSubmitting}>Submit</button>
    </form>
  );
}
```

### Vue 3

**Basic Example:**

```vue
<script setup>
import { createForm } from '@vielzeug/formit';
import { ref, onMounted, onUnmounted } from 'vue';

const form = createForm({
  defaultValues: {
    email: '',
    password: '',
  },
  validators: {
    email: (v) => (v && !String(v).includes('@') ? 'Invalid email' : undefined),
  },
});

const state = ref(form.state);
let unsubscribe;

onMounted(() => (unsubscribe = form.subscribe((s) => (state.value = s))));
onUnmounted(() => unsubscribe?.());

const handleSubmit = async () => {
  await form.submit(async (values) => {
    await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });
  });
};
</script>

<template>
  <form @submit.prevent="handleSubmit">
    <input v-bind="form.bind('email')" type="email" />
    <span v-if="state.errors['email']">
      {{ state.errors['email'] }}
    </span>

    <input v-bind="form.bind('password')" type="password" />

    <button type="submit" :disabled="state.isSubmitting">
      {{ state.isSubmitting ? 'Logging in...' : 'Login' }}
    </button>
  </form>
</template>
```

**Composable:**

```typescript
import { ref, onMounted, onUnmounted } from 'vue';
import { createForm, type FormOptions } from '@vielzeug/formit';

export function useForm(init: FormOptions) {
  const form = createForm(init);
  const state = ref(form.state);
  let unsubscribe;

  onMounted(() => (unsubscribe = form.subscribe((s) => (state.value = s))));
  onUnmounted(() => unsubscribe?.());

  return { form, state };
}
```

### Svelte

```svelte
<script>
import { createForm } from '@vielzeug/formit';
import { writable } from 'svelte/store';
import { onMount, onDestroy } from 'svelte';

const form = createForm({
  defaultValues: {
    email: '',
    password: '',
  },
  validators: {
    email: (v) => (v && !String(v).includes('@') ? 'Invalid email' : undefined),
  },
});

const state = writable(form.state);
let unsubscribe;

onMount(() => (unsubscribe = form.subscribe((s) => state.set(s))));
onDestroy(() => unsubscribe?.());

async function handleSubmit() {
  await form.submit(async (values) => {
    await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });
  });
}
</script>

<form on:submit|preventDefault={handleSubmit}>
  <input {...form.bind('email')} type="email" />
  {#if $state.errors['email']}
    <span>{$state.errors['email']}</span>
  {/if}

  <input {...form.bind('password')} type="password" />

  <button type="submit" disabled={$state.isSubmitting}>
    {$state.isSubmitting ? 'Logging in...' : 'Login'}
  </button>
</form>
```

## Lifecycle

```ts
// Aborts all in-flight validators and removes all subscribers
form.dispose();

// Check if disposed
form.disposed; // boolean
```

## Next Steps

::: tip Continue Learning

- [API Reference](./api.md) — Complete API documentation
- [Examples](./examples.md) — Practical code examples
  :::
