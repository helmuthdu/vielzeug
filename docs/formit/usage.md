# Usage Guide

Complete guide to installing and using Formit in your projects.

::: tip 💡 API Reference
This guide covers API usage and basic patterns. For complete application examples, see [Examples](./examples.md).
:::

## Table of Contents

[[toc]]

## Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/formit
```

```sh [npm]
npm install @vielzeug/formit
```

```sh [yarn]
yarn add @vielzeug/formit
```

:::

## Basic Usage

### Creating a Form

Three ways to initialize fields:

**Plain Values:**

```typescript
const form = createForm({
  fields: {
    name: '',
    email: '',
    age: 0,
  },
});
```

**Nested Objects:**

```typescript
const form = createForm({
  fields: {
    user: {
      name: 'Alice',
      profile: {
        age: 25,
        city: 'NYC',
      },
    },
  },
});

// Access with dot notation
form.get('user.profile.age'); // '25'
```

**With Validators:**

```typescript
const form = createForm({
  fields: {
    email: {
      value: '',
      validators: (v) => !String(v).includes('@') && 'Invalid email',
    },
  },
});
```

### Reading and Writing Values

```typescript
// Get value
const email = form.get('email');

// Set value
form.set('email', 'user@example.com');

// Set multiple values
form.set({
  email: 'user@example.com',
  name: 'Alice',
});

// Get all values
const all = form.values();

// Get FormData
const formData = form.data();
```

## Advanced Patterns

### Multi-Step Forms

```typescript
const form = createForm({
  fields: {
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

let currentStep = 1;

async function validateStep(step: number) {
  const stepFields = {
    1: ['name', 'email'],
    2: ['address', 'city'],
    3: ['cardNumber'],
  };

  const errors = await form.validate({ fields: stepFields[step] });
  return errors.size === 0;
}

async function nextStep() {
  const isValid = await validateStep(currentStep);
  if (isValid) {
    currentStep++;
  }
}

async function submitForm() {
  const isValid = await validateStep(currentStep);
  if (isValid) {
    await form.submit(async (formData) => {
      await fetch('/api/complete', { method: 'POST', body: formData });
    });
  }
}
```

### Dynamic Fields

```typescript
const form = createForm({
  fields: {
    items: [] as Array<{ name: string; quantity: number }>,
  },
});

function addItem() {
  const items = form.get('items') || [];
  form.set('items', [...items, { name: '', quantity: 0 }]);
}

function removeItem(index: number) {
  const items = form.get('items') || [];
  form.set(
    'items',
    items.filter((_, i) => i !== index),
  );
}

function updateItem(index: number, field: 'name' | 'quantity', value: any) {
  const items = form.get('items') || [];
  const updated = [...items];
  updated[index] = { ...updated[index], [field]: value };
  form.set('items', updated);
}
```

### Conditional Validation

```typescript
const form = createForm({
  fields: {
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
      form.error('companyName', 'Company name required');
    }
    if (!form.get('vatNumber')) {
      form.error('vatNumber', 'VAT number required');
    }
  } else {
    // Clear business field errors
    form.error('companyName', '');
    form.error('vatNumber', '');
  }
});
```

### Dirty State Warning

```typescript
const form = createForm({
  fields: { name: '', email: '' },
});

window.addEventListener('beforeunload', (e) => {
  const state = form.snapshot();

  if (state.dirty.size > 0) {
    e.preventDefault();
    e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
  }
});
```

### Auto-Save

```typescript
const form = createForm({
  fields: { content: '' },
});

let saveTimeout;

form.subscribe((state) => {
  if (state.dirty.size > 0) {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(async () => {
      await form.submit(
        async (formData) => {
          await fetch('/api/auto-save', { method: 'POST', body: formData });
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
  fields: { name: '', email: '' },
});

// Reset to initial
form.reset();

// Reset to new values
form.reset({ name: 'Guest', email: '' });
```

### Form Cloning

```typescript
const form1 = createForm({
  fields: { name: 'Alice', email: 'alice@example.com' },
});

// Clone FormData
const formData = form1.clone();

// Create new form with cloned data
const form2 = createForm({ fields: {} });
form2.set(formData);
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
  onBlur={() => form.touch('email', true)}
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
  } else {
    // Handle other errors
  }
}

// ❌ Bad – swallows validation errors
form.submit(onSubmit).catch(console.error);
```

### 4. Use Nested Objects for Organization

```typescript
// ✅ Good – organized
fields: {
  user: {
    name: '',
    email: ''
  },
  address: {
    street: '',
    city: ''
  }
}

// ❌ Flat – harder to manage
fields: {
  userName: '',
  userEmail: '',
  addressStreet: '',
  addressCity: ''
}
```

### 5. Validate on Submit, Show Errors on Blur

```typescript
const binding = form.bind('email', {
  markTouchedOnBlur: true,
});

// Show error only if touched
{
  state.touched.has('email') && state.errors.get('email');
}
```

## Validation

### Field-Level Validators

Single or multiple validators per field:

```typescript
const form = createForm({
  fields: {
    email: {
      value: '',
      validators: [
        (v) => !v && 'Email is required',
        (v) => v && !String(v).includes('@') && 'Invalid email format',
        (v) => v && String(v).length > 100 && 'Email too long',
      ],
    },
    password: {
      value: '',
      validators: (v) => {
        if (!v) return 'Password is required';
        if (String(v).length < 8) return 'Min 8 characters';
        if (!/[A-Z]/.test(String(v))) return 'Must contain uppercase';
        if (!/[0-9]/.test(String(v))) return 'Must contain number';
      },
    },
  },
});
```

### Form-Level Validators

Cross-field validation:

```typescript
const form = createForm({
  fields: {
    password: '',
    confirmPassword: '',
    startDate: '',
    endDate: '',
  },
  validate: (formData) => {
    const errors = new Map();

    // Password matching
    if (formData.get('password') !== formData.get('confirmPassword')) {
      errors.set('confirmPassword', 'Passwords must match');
    }

    // Date range validation
    const start = new Date(String(formData.get('startDate')));
    const end = new Date(String(formData.get('endDate')));
    if (start > end) {
      errors.set('endDate', 'End date must be after start date');
    }

    return errors;
  },
});
```

### Async Validation

```typescript
const form = createForm({
  fields: {
    username: {
      value: '',
      validators: async (value) => {
        if (!value) return 'Username required';

        const response = await fetch(`/api/check-username?username=${value}`);
        const { exists } = await response.json();

        if (exists) return 'Username already taken';
      },
    },
  },
});
```

### Manual Validation

```typescript
// Validate specific field
const error = await form.validate('email');

// Validate all fields
const errors = await form.validate();

// Validate only touched fields
const errors = await form.validate({ onlyTouched: true });

// Validate specific fields
const errors = await form.validate({ fields: ['email', 'password'] });
```

## File Uploads

### Single File

```typescript
const form = createForm({
  fields: {
    avatar: null,
    title: '',
  },
});

// Handle file input
const fileInput = document.querySelector('input[type="file"]');
fileInput.addEventListener('change', (e) => {
  form.set('avatar', e.target.files[0]);
});

// Submit
await form.submit(async (formData) => {
  await fetch('/api/upload', {
    method: 'POST',
    body: formData, // FormData ready with file
  });
});
```

### Multiple Files

```typescript
const form = createForm({
  fields: {
    documents: [],
  },
});

// Handle FileList
form.set('documents', fileInput.files);

// Or manually build array
form.set('documents', Array.from(fileInput.files));
```

### File Validation

```typescript
const form = createForm({
  fields: {
    avatar: {
      value: null,
      validators: (value) => {
        if (!value) return 'Avatar is required';

        const file = value as File;
        const maxSize = 5 * 1024 * 1024; // 5MB

        if (file.size > maxSize) return 'File too large (max 5MB)';
        if (!file.type.startsWith('image/')) return 'Must be an image';
      },
    },
  },
});
```

## Arrays and Multi-Select

### Basic Array Handling

```typescript
const form = createForm({
  fields: {
    tags: ['javascript', 'typescript'],
    interests: [],
  },
});

// Get array
const tags = form.get('tags'); // ['javascript', 'typescript']

// Set array
form.set('tags', ['vue', 'react']);

// Empty arrays work correctly
form.set('tags', []);
console.log(form.get('tags')); // [] not undefined
```

### Multi-Select Inputs

```typescript
const form = createForm({
  fields: {
    skills: {
      value: [],
      validators: (v) => Array.isArray(v) && v.length === 0 && 'Select at least one'
    }
  }
});

// Bind to select element
<select multiple {...form.bind('skills')}>
  <option value="js">JavaScript</option>
  <option value="ts">TypeScript</option>
  <option value="react">React</option>
</select>
```

### Checkboxes

```typescript
const form = createForm({
  fields: {
    interests: []
  }
});

// Handle checkbox change
function handleCheckbox(value: string, checked: boolean) {
  const current = form.get('interests') || [];
  const updated = checked
    ? [...current, value]
    : current.filter(v => v !== value);
  form.set('interests', updated);
}

// Usage
<input
  type="checkbox"
  value="coding"
  checked={(form.get('interests') || []).includes('coding')}
  onChange={(e) => handleCheckbox('coding', e.target.checked)}
/>
```

### Array Validation

```typescript
const form = createForm({
  fields: {
    emails: {
      value: [],
      validators: (value) => {
        if (!Array.isArray(value)) return 'Must be an array';
        if (value.length === 0) return 'At least one email required';
        if (value.length > 10) return 'Maximum 10 emails';

        // Validate each item
        for (let i = 0; i < value.length; i++) {
          const email = String(value[i]);
          if (!email.includes('@')) {
            return `Email #${i + 1} is invalid`;
          }
        }
      },
    },
  },
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
      fields: {
        name: '',
        email: {
          value: '',
          validators: (v) => !String(v).includes('@') && 'Invalid email',
        },
        message: '',
      },
    }),
  );

  const [state, setState] = useState(form.snapshot());

  useEffect(() => form.subscribe(setState), [form]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.submit(async (formData) => {
          await fetch('/api/contact', { method: 'POST', body: formData });
        });
      }}>
      <input {...form.bind('name')} placeholder="Name" />

      <input {...form.bind('email')} placeholder="Email" />
      {state.errors.get('email') && <span>{state.errors.get('email')}</span>}

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
  const [state, setState] = useState(form.snapshot());

  useEffect(() => form.subscribe(setState), [form]);

  return { form, state };
}

// Usage
function MyForm() {
  const { form, state } = useForm({
    fields: {
      email: {
        value: '',
        validators: (v) => !String(v).includes('@') && 'Invalid',
      },
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.submit(onSubmit);
      }}>
      <input {...form.bind('email')} />
      {state.errors.get('email') && <span>{state.errors.get('email')}</span>}
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
  fields: {
    email: {
      value: '',
      validators: (v) => !String(v).includes('@') && 'Invalid email',
    },
    password: '',
  },
});

const state = ref(form.snapshot());
let unsubscribe;

onMounted(() => (unsubscribe = form.subscribe((s) => (state.value = s))));
onUnmounted(() => unsubscribe?.());

const handleSubmit = async () => {
  await form.submit(async (formData) => {
    await fetch('/api/login', { method: 'POST', body: formData });
  });
};
</script>

<template>
  <form @submit.prevent="handleSubmit">
    <input v-bind="form.bind('email')" type="email" />
    <span v-if="state.errors.get('email')">
      {{ state.errors.get('email') }}
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
  const state = ref(form.snapshot());
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
  fields: {
    email: {
      value: '',
      validators: (v) => !String(v).includes('@') && 'Invalid email'
    },
    password: ''
  }
});

const state = writable(form.snapshot());
let unsubscribe;

onMount(() => unsubscribe = form.subscribe(s => state.set(s)));
onDestroy(() => unsubscribe?.());

async function handleSubmit() {
  await form.submit(async (formData) => {
    await fetch('/api/login', { method: 'POST', body: formData });
  });
}
</script>

<form on:submit|preventDefault={handleSubmit}>
  <input {...form.bind('email')} type="email" />
  {#if $state.errors.get('email')}
    <span>{$state.errors.get('email')}</span>
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
