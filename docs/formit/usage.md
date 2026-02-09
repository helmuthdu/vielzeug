# Formit Usage Guide

Complete guide to installing and using Formit in your projects.

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

## Import

```ts
import { createForm } from '@vielzeug/formit';
// Optional: Import types
import type { FormInstance, FormState, FormInit } from '@vielzeug/formit';
```

::: tip 💡 API Reference
This guide covers API usage and basic patterns. For complete application examples, see [Examples](./examples.md).
:::

## Table of Contents

- [Basic Usage](#basic-usage)
- [Validation](#validation)
- [Framework Integration](#framework-integration)
- [Advanced Patterns](#advanced-patterns)
- [Best Practices](#best-practices)

## Basic Usage

### Creating a Form

```ts
import { createForm } from '@vielzeug/formit';

const form = createForm({
  initialValues: {
    username: '',
    email: '',
    age: 0,
  },
});
```

### Reading and Writing Values

```ts
// Get all values
const values = form.getValues();
console.log(values); // { username: '', email: '', age: 0 }

// Get single value
const email = form.getValue('email');

// Set single value
form.setValue('email', 'user@example.com');

// Set multiple values
form.setValues({
  username: 'johndoe',
  email: 'john@example.com',
});

// Replace all values
form.setValues({ username: 'janedoe' }, { replace: true });
```

### Nested Values

```ts
const form = createForm({
  initialValues: {
    user: {
      profile: {
        name: '',
        email: '',
      },
      settings: {
        notifications: true,
      },
    },
    items: [
      { id: 1, name: 'Item 1' },
      { id: 2, name: 'Item 2' },
    ],
  },
});

// Access nested values
form.getValue('user.profile.name');
form.getValue('user.settings.notifications');
form.getValue('items[0].name');
form.getValue(['items', 1, 'name']);

// Set nested values
form.setValue('user.profile.name', 'John Doe');
form.setValue('items[0].name', 'Updated Item');
```

---

## Validation

### Field-Level Validators

```ts
const form = createForm({
  initialValues: {
    email: '',
    password: '',
    age: 0,
  },
  fields: {
    email: {
      validators: (value) => {
        if (!value) return 'Email is required';
        if (!value.includes('@')) return 'Invalid email format';
        if (value.length > 100) return 'Email too long';
      },
    },
    password: {
      validators: [
        (value) => {
          if (!value) return 'Password is required';
        },
        (value) => {
          if (value.length < 8) return 'Must be at least 8 characters';
        },
        (value) => {
          if (!/[A-Z]/.test(value)) return 'Must contain uppercase letter';
        },
        (value) => {
          if (!/[0-9]/.test(value)) return 'Must contain a number';
        },
      ],
    },
    age: {
      validators: (value) => {
        if (value < 18) return 'Must be at least 18 years old';
        if (value > 120) return 'Invalid age';
      },
    },
  },
});
```

### Form-Level Validators

```ts
const form = createForm({
  initialValues: {
    password: '',
    confirmPassword: '',
    startDate: '',
    endDate: '',
  },
  validate: (values) => {
    const errors: Record<string, string> = {};

    // Password matching
    if (values.password !== values.confirmPassword) {
      errors.confirmPassword = 'Passwords must match';
    }

    // Date range validation
    if (values.startDate && values.endDate) {
      const start = new Date(values.startDate);
      const end = new Date(values.endDate);
      if (start > end) {
        errors.endDate = 'End date must be after start date';
      }
    }

    return errors;
  },
});
```

### Async Validation

```ts
const form = createForm({
  fields: {
    username: {
      validators: async (value) => {
        if (!value) return 'Username is required';

        // Check if username exists
        const response = await fetch(`/api/check-username?username=${value}`);
        const { exists } = await response.json();

        if (exists) return 'Username is already taken';
      },
    },
    email: {
      validators: async (value, values) => {
        // Access other form values
        if (!value) return 'Email is required';

        const response = await fetch('/api/check-email', {
          method: 'POST',
          body: JSON.stringify({ email: value, username: values.username }),
        });

        const { available } = await response.json();
        if (!available) return 'Email is already registered';
      },
    },
  },
});
```

### Triggering Validation

```ts
// Validate single field
const error = await form.validateField('email');
if (error) {
  console.log('Validation error:', error);
}

// Validate all fields
const errors = await form.validateAll();
if (Object.keys(errors).length > 0) {
  console.log('Form has errors:', errors);
}

// Validation is automatic on submit
form.submit(async (values) => {
  // This only runs if validation passes
  await api.post('/users', values);
});
```

### Error Management

```ts
// Get all errors
const errors = form.getErrors();

// Get specific error
const emailError = form.getError('email');

// Set custom error
form.setError('email', 'This email is banned');

// Clear error
form.setError('email');

// Clear all errors
form.resetErrors();
```

---

## Framework Integration
Formit is framework-agnostic. Below are generic integration patterns for popular frameworks.
### React
Create a custom hook to manage form state with React:
```tsx
import { createForm } from '@vielzeug/formit';
import { useEffect, useState } from 'react';
function LoginForm() {
  const [form] = useState(() =>
    createForm({
      initialValues: { email: '', password: '' },
      fields: {
        email: {
          validators: (value) => !value?.includes('@') && 'Invalid email',
        },
      },
    }),
  );
  const [state, setState] = useState(form.getStateSnapshot());
  useEffect(() => form.subscribe(setState), [form]);
  return (
    <form onSubmit={(e) => { e.preventDefault(); form.submit(/* ... */); }}>
      <input {...form.bind('email')} />
      {state.errors.email && <span>{state.errors.email}</span>}
      <button type="submit" disabled={state.isSubmitting}>Submit</button>
    </form>
  );
}
```
### Vue 3
Use Vue's composition API to integrate:
```vue
<script setup>
import { createForm } from '@vielzeug/formit';
import { ref, onMounted, onUnmounted } from 'vue';
const form = createForm({
  initialValues: { email: '', password: '' },
  fields: {
    email: { validators: (v) => !v?.includes('@') && 'Invalid email' },
  },
});
const state = ref(form.getStateSnapshot());
let unsubscribe;
onMounted(() => { unsubscribe = form.subscribe((s) => state.value = s); });
onUnmounted(() => { unsubscribe?.(); });
</script>
<template>
  <form @submit.prevent="form.submit(/* ... */)">
    <input v-bind="form.bind('email')" />
    <span v-if="state.errors.email">{{ state.errors.email }}</span>
    <button type="submit" :disabled="state.isSubmitting">Submit</button>
  </form>
</template>
```
### Svelte
Use Svelte stores for reactive state:
```svelte
<script>
import { createForm } from '@vielzeug/formit';
import { writable } from 'svelte/store';
import { onMount, onDestroy } from 'svelte';
const form = createForm({
  initialValues: { email: '', password: '' },
  fields: {
    email: { validators: (v) => !v?.includes('@') && 'Invalid email' },
  },
});
const state = writable(form.getStateSnapshot());
let unsubscribe;
onMount(() => { unsubscribe = form.subscribe((s) => state.set(s)); });
onDestroy(() => { unsubscribe?.(); });
</script>
<form on:submit|preventDefault={() => form.submit(/* ... */)}>
  <input {...form.bind('email')} />
  {#if $state.errors.email}<span>{$state.errors.email}</span>{/if}
  <button type="submit" disabled={$state.isSubmitting}>Submit</button>
</form>
```
> **💡 See Complete Examples**: For full implementation with hooks, composables, error handling, and success states, check [Examples](./examples.md#framework-integration-examples).

---

## Advanced Patterns

### Conditional Fields

```ts
const form = createForm({
  initialValues: {
    accountType: 'personal',
    companyName: '',
    vatNumber: '',
  },
});

// Subscribe and conditionally validate
form.subscribe((state) => {
  if (state.values.accountType === 'business') {
    // Validate business fields
    if (!state.values.companyName) {
      form.setError('companyName', 'Company name is required');
    }
  } else {
    // Clear business field errors
    form.setError('companyName');
    form.setError('vatNumber');
  }
});
```

### Dynamic Fields

```ts
const form = createForm({
  initialValues: {
    fields: [] as Array<{ name: string; value: string }>,
  },
});

// Add field
function addField() {
  const fields = form.getValue('fields');
  form.setValue('fields', [...fields, { name: '', value: '' }]);
}

// Remove field
function removeField(index: number) {
  const fields = form.getValue('fields');
  form.setValue(
    'fields',
    fields.filter((_, i) => i !== index),
  );
}

// Update field
function updateField(index: number, key: 'name' | 'value', value: string) {
  form.setValue(`fields[${index}].${key}`, value);
}
```

### Form Reset

```ts
const initialValues = {
  name: '',
  email: '',
  password: '',
};

const form = createForm({ initialValues });

// Reset form
function resetForm() {
  form.setValues(initialValues, { replace: true });
  form.resetErrors();
}
```

### Dirty State Tracking

```ts
const form = createForm({
  initialValues: { name: '', email: '' },
});

// Check if form is dirty
const state = form.getStateSnapshot();
const isDirty = Object.values(state.dirty).some(Boolean);

// Warn on navigation if dirty
window.addEventListener('beforeunload', (e) => {
  const state = form.getStateSnapshot();
  const isDirty = Object.values(state.dirty).some(Boolean);

  if (isDirty) {
    e.preventDefault();
    e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
  }
});
```

### Debounced Validation

```ts
import { debounce } from '@vielzeug/toolkit';

const validateUsername = debounce(async (username: string) => {
  const response = await fetch(`/api/check-username?username=${username}`);
  return response.json();
}, 500);

const form = createForm({
  fields: {
    username: {
      validators: async (value) => {
        const { exists } = await validateUsername(value);
        if (exists) return 'Username is taken';
      },
    },
  },
});
```

### Multi-Step Forms

```ts
const form = createForm({
  initialValues: {
    // Step 1
    name: '',
    email: '',
    // Step 2
    address: '',
    city: '',
    // Step 3
    payment: '',
  },
});

let currentStep = 1;

async function validateCurrentStep() {
  const fieldsToValidate =
    {
      1: ['name', 'email'],
      2: ['address', 'city'],
      3: ['payment'],
    }[currentStep] || [];

  for (const field of fieldsToValidate) {
    const error = await form.validateField(field);
    if (error) return false;
  }
  return true;
}

async function nextStep() {
  const isValid = await validateCurrentStep();
  if (isValid) {
    currentStep++;
  }
}

async function previousStep() {
  currentStep--;
}

async function submitForm() {
  const isValid = await validateCurrentStep();
  if (isValid) {
    await form.submit(async (values) => {
      await api.post('/complete-registration', values);
    });
  }
}
```

### Optimistic Updates

```ts
const form = createForm({
  initialValues: { name: '', email: '' },
});

async function saveChanges() {
  const previousValues = form.getValues();

  try {
    // Show success immediately
    showToast('Saving...');

    // Submit
    await form.submit(async (values) => {
      await api.put('/profile', values);
    });

    showToast('Saved successfully!');
  } catch (error) {
    // Revert on error
    form.setValues(previousValues, { replace: true });
    showToast('Failed to save changes');
  }
}
```

---

## Best Practices

### 1. Create Form Outside Component

```tsx
// ❌ Bad - Creates new form on every render
function MyForm() {
  const form = createForm({ initialValues: { name: '' } });
  // ...
}

// ✅ Good - Form persists across renders
function MyForm() {
  const [form] = useState(() => createForm({ initialValues: { name: '' } }));
  // ...
}
```

### 2. Use Field Subscriptions for Performance

```tsx
// ❌ Bad - Entire component re-renders on any field change
function MyForm() {
  const [state, setState] = useState(form.getStateSnapshot());

  useEffect(() => {
    return form.subscribe(setState);
  }, []);

  return (
    <>
      <input {...form.bind('field1')} />
      <input {...form.bind('field2')} />
      {/* 100 more fields */}
    </>
  );
}

// ✅ Good - Only affected components re-render
function Field({ form, path }: { form: FormInstance; path: string }) {
  const [field, setField] = useState({ value: '', error: undefined });

  useEffect(() => {
    return form.subscribeField(path, setField);
  }, [form, path]);

  return <input {...form.bind(path)} />;
}
```

### 3. Validate on Blur

```tsx
<input
  {...form.bind('email')}
  onBlur={() => {
    form.markTouched('email');
    form.validateField('email');
  }}
/>
```

### 4. Show Errors After Touch

```tsx
{
  state.touched.email && state.errors.email && <span className="error">{state.errors.email}</span>;
}
```

### 5. Disable Submit While Validating or Submitting

```tsx
<button type="submit" disabled={state.isValidating || state.isSubmitting}>
  Submit
</button>
```

### 6. Cleanup Subscriptions

```tsx
// React
useEffect(() => {
  const unsubscribe = form.subscribe(setState);
  return unsubscribe; // Cleanup
}, [form]);

// Vue
onUnmounted(() => {
  unsubscribe();
});

// Svelte
onDestroy(() => {
  unsubscribe();
});
```

### 7. Use TypeScript for Type Safety

```ts
interface RegistrationForm {
  name: string;
  email: string;
  age: number;
  acceptTerms: boolean;
}

const form = createForm<RegistrationForm>({
  initialValues: {
    name: '',
    email: '',
    age: 0,
    acceptTerms: false,
  },
});

// TypeScript will infer correct types
const email: string = form.getValue('email'); // ✅
const age: number = form.getValue('age'); // ✅
```

### 8. Compose Validators

```ts
// Reusable validators
const required =
  (message = 'Required') =>
  (value: any) => {
    if (!value) return message;
  };

const minLength = (min: number, message?: string) => (value: string) => {
  if (value.length < min) {
    return message || `Must be at least ${min} characters`;
  }
};

const email = (value: string) => {
  if (!value.includes('@')) return 'Invalid email';
};

// Use in form
const form = createForm({
  fields: {
    email: {
      validators: [required('Email is required'), email],
    },
    password: {
      validators: [required(), minLength(8)],
    },
  },
});
```

---

## See Also

- [API Reference](./api.md) - Complete API documentation
- [Examples](./examples.md) - Real-world examples
