---
title: Formit — Usage Guide
description: Field validation, form validation, async validators, and testing for Formit.
---

# Formit Usage Guide

::: tip New to Formit?
Start with the [Overview](./index.md) for a quick introduction and installation, then come back here for in-depth usage patterns.
:::

[[toc]]

## Why Formit?

Formit tracks typed form values with validators, error tracking, and async support — without framework lock-in.

```ts
// Before — manual validation
function handleSubmit(e: SubmitEvent) {
  e.preventDefault();
  const errors: Record<string, string> = {};
  if (!name) errors.name = 'Required';
  // ...
}

// After — Formit
const form = createForm({
  values: { email: '' },
  rules: { email: (v) => (!v ? 'Required' : undefined) },
});
form.subscribe(setState);
```

| Feature | Formit | React Hook Form | Formik |
|---|---|---|---|
| Framework | Agnostic | React | React |
| Typed values | ✅ | ❌ | ❌ |
| Async validators | ✅ | ✅ | ✅ |
| Zero dependencies | ✅ | ❌ | ❌ |

**Use Formit when** you want form validation without a framework, or in web components and vanilla JS projects.


## Basic Usage

### Creating a Form

```typescript
const form = createForm({
  values: {
    name: '',
    email: '',
    age: 0,
  },
  rules: {
    name: (v) => (!v ? 'Name is required' : undefined),
    email: [
      (v) => (!v ? 'Email is required' : undefined),
      (v) => (v && !String(v).includes('@') ? 'Invalid email format' : undefined),
    ],
  },
});
```

### Nested Objects in Values

Plain objects inside `values` are automatically flattened into dot-notation keys, so you can write your initial state as a natural nested structure:

```typescript
const form = createForm({
  values: {
    user: {
      name: 'Alice',
      profile: {
        age: 25,
        city: 'NYC',
      },
    },
  },
});

form.get('user.name');        // 'Alice'
form.get('user.profile.age'); // 25 (typed number)
form.set('user.name', 'Bob');
```

You can also use dot-notation string keys directly — both styles are equivalent:

```typescript
const form = createForm({
  values: {
    'user.name': 'Alice',
    'user.profile.age': 25,
  },
});
```

::: tip What gets flattened?
Only plain objects (`{}` literals) are flattened. Arrays, `Date` instances, class instances, `File`, and `Blob` values are stored as-is under their own key.
:::

### Reading and Writing Values

```typescript
// Get value
const email = form.get('email');

// Set value
form.set('email', 'user@example.com');

// Set multiple values at once
form.patch({
  email: 'user@example.com',
  name: 'Alice',
});

// Get all values
const all = form.values();
```

## Advanced Patterns

### Multi-Step Forms

```typescript
const form = createForm({
  values: {
    // Step 1
    name: '',
    email: '',
    // Step 2
    address: '',
    city: '',
    // Step 3
    cardNumber: '',
  },
  rules: {
    name: (v) => (!v ? 'Required' : undefined),
    email: (v) => (v && !String(v).includes('@') ? 'Invalid email' : undefined),
    address: (v) => (!v ? 'Required' : undefined),
    city: (v) => (!v ? 'Required' : undefined),
    cardNumber: (v) => (!v ? 'Required' : undefined),
  },
});

let currentStep = 1;

const stepFields = {
  1: ['name', 'email'],
  2: ['address', 'city'],
  3: ['cardNumber'],
};

async function nextStep() {
  const errors = await form.validateAll({ fields: stepFields[currentStep] });
  if (Object.keys(errors).length === 0) {
    currentStep++;
  }
}

async function submitForm() {
  await form.submit(async (values) => {
    await fetch('/api/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });
  });
}
```

### Dynamic Fields

```typescript
const form = createForm({
  values: {
    items: [] as Array<{ name: string; quantity: number }>,
  },
});

function addItem() {
  const items = (form.get('items') as typeof form.get<Array<unknown>>('items')) || [];
  form.set('items', [...items, { name: '', quantity: 0 }]);
}

function removeItem(index: number) {
  const items = form.get<Array<unknown>>('items') || [];
  form.set('items', items.filter((_, i) => i !== index));
}

function updateItem(index: number, field: 'name' | 'quantity', value: unknown) {
  const items = form.get<Array<Record<string, unknown>>>('items') || [];
  const updated = [...items];
  updated[index] = { ...updated[index], [field]: value };
  form.set('items', updated);
}
```

### Conditional Validation

```typescript
const form = createForm({
  values: {
    accountType: 'personal',
    companyName: '',
    vatNumber: '',
  },
});

form.subscribe((state) => {
  const accountType = form.get('accountType');

  if (accountType === 'business') {
    // Add business field validation
    if (!form.get('companyName')) {
      form.setError('companyName', 'Company name required');
    }
    if (!form.get('vatNumber')) {
      form.setError('vatNumber', 'VAT number required');
    }
  } else {
    // Clear business field errors
    form.setError('companyName');
    form.setError('vatNumber');
  }
});
```

### Dirty State Warning

```typescript
const form = createForm({
  values: { name: '', email: '' },
});

window.addEventListener('beforeunload', (e) => {
  const state = form.getState();

  if (state.isDirty) {
    e.preventDefault();
    e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
  }
});
```

### Auto-Save

```typescript
const form = createForm({
  values: { content: '' },
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
        { validate: false },
      );
    }, 1000);
  }
});
```

### Reset to Initial Values

```typescript
const form = createForm({
  values: { name: '', email: '' },
});

// Reset to initial
form.reset();

// Reset to new values
form.reset({ name: 'Guest', email: '' });
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
  onBlur={() => form.setTouched('email')}
/>
```

### 3. Handle Validation Errors

```typescript
// ✅ Good
try {
  await form.submit(onSubmit);
} catch (error) {
  if (error instanceof ValidationError) {
    // Handle validation errors
    for (const [field, message] of Object.entries(error.errors)) {
      console.log(`${field}: ${message}`);
    }
  } else {
    // Handle other errors
  }
}

// ❌ Bad – swallows validation errors
form.submit(onSubmit).catch(console.error);
```

### 4. Use Nested Objects for Structured Data

```typescript
// ✅ Good – natural nested structure, auto-flattened
values: {
  user: { name: '', email: '' },
  address: { street: '', city: '' },
}
// Access: form.get('user.name'), form.get('address.city')

// ✅ Also fine – explicit dot-notation keys
values: {
  'user.name': '',
  'user.email': '',
}

// ❌ Accessing nested object as a key – won't work
form.get('user'); // undefined (keys are 'user.name', 'user.email', ...)
```

### 5. Validate on Submit, Show Errors on Blur

```typescript
const binding = form.bind('email', {
  touchOnBlur: true,
});

// Show error only if touched
{
  state.touched.has('email') && state.errors['email'];
}
```

## Validation

### Field-Level Validators

Single or multiple validators per field:

```typescript
const form = createForm({
  values: {
    email: '',
    password: '',
  },
  rules: {
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

Cross-field validation:

```typescript
const form = createForm({
  values: {
    password: '',
    confirmPassword: '',
    startDate: '',
    endDate: '',
  },
  validate: (values) => {
    const errors: Record<string, string> = {};

    // Password matching
    if (values['password'] !== values['confirmPassword']) {
      errors['confirmPassword'] = 'Passwords must match';
    }

    // Date range validation
    const start = new Date(String(values['startDate']));
    const end = new Date(String(values['endDate']));
    if (start > end) {
      errors['endDate'] = 'End date must be after start date';
    }

    return errors;
  },
});
```

### Async Validation

```typescript
const form = createForm({
  values: {
    username: '',
  },
  rules: {
    username: async (value) => {
      if (!value) return 'Username required';

      const response = await fetch(`/api/check-username?username=${value}`);
      const { exists } = await response.json();

      if (exists) return 'Username already taken';
    },
  },
});
```

### Manual Validation

```typescript
// Validate specific field
const error = await form.validate('email');

// Validate all fields
const errors = await form.validateAll();

// Validate only touched fields
const errors = await form.validateAll({ onlyTouched: true });

// Validate specific fields
const errors = await form.validateAll({ fields: ['email', 'password'] });
```

## File Uploads

### Single File

```typescript
const form = createForm({
  values: {
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
import { toFormData } from '@vielzeug/formit';
await form.submit(async (values) => {
  await fetch('/api/upload', {
    method: 'POST',
    body: toFormData(values), // handles File/Blob values
  });
});
```

### File Validation

```typescript
const form = createForm({
  values: {
    avatar: null as File | null,
  },
  rules: {
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

### Basic Array Handling

```typescript
const form = createForm({
  values: {
    tags: ['javascript', 'typescript'] as string[],
    interests: [] as string[],
  },
});

// Get array
const tags = form.get<string[]>('tags'); // ['javascript', 'typescript']

// Set array
form.set('tags', ['vue', 'react']);

// Empty arrays work correctly
form.set('tags', []);
console.log(form.get('tags')); // []
```

### Multi-Select Inputs

```typescript
const form = createForm({
  values: {
    skills: [] as string[],
  },
  rules: {
    skills: (v) => (Array.isArray(v) && v.length === 0 ? 'Select at least one' : undefined),
  },
});

// Bind to select element
<select multiple {...form.bind('skills')}>
  <option value="js">JavaScript</option>
  <option value="ts">TypeScript</option>
</select>
```

### Checkboxes

```typescript
const form = createForm({
  values: {
    interests: [] as string[],
  },
});

// Handle checkbox change
function handleCheckbox(value: string, checked: boolean) {
  const current = form.get<string[]>('interests') ?? [];
  const updated = checked
    ? [...current, value]
    : current.filter((v) => v !== value);
  form.set('interests', updated);
}
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
      values: {
        name: '',
        email: '',
        message: '',
      },
      rules: {
        email: (v) => (v && !String(v).includes('@') ? 'Invalid email' : undefined),
      },
    }),
  );

  const [state, setState] = useState(form.getState());

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
import type { FormInit } from '@vielzeug/formit';
import { createForm } from '@vielzeug/formit';

function useForm(init: FormInit) {
  const [form] = useState(() => createForm(init));
  const [state, setState] = useState(form.getState());

  useEffect(() => form.subscribe(setState), [form]);

  return { form, state };
}

// Usage
function MyForm() {
  const { form, state } = useForm({
    values: {
      email: '',
    },
    rules: {
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
  values: {
    email: '',
    password: '',
  },
  rules: {
    email: (v) => (v && !String(v).includes('@') ? 'Invalid email' : undefined),
  },
});

const state = ref(form.getState());
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
import { createForm, type FormInit } from '@vielzeug/formit';

export function useForm(init: FormInit) {
  const form = createForm(init);
  const state = ref(form.getState());
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
  values: {
    email: '',
    password: '',
  },
  rules: {
    email: (v) => (v && !String(v).includes('@') ? 'Invalid email' : undefined),
  },
});

const state = writable(form.getState());
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

## Next Steps

<div class="vp-doc">
  <div class="custom-block tip">
    <p class="custom-block-title">💡 Continue Learning</p>
    <ul>
      <li><a href="./api">API Reference</a> – Complete API documentation</li>
      <li><a href="./examples">Examples</a> – Practical code examples</li>
      <li><a href="/repl">Interactive REPL</a> – Try it in your browser</li>
    </ul>
  </div>
</div>
