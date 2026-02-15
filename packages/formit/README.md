# @vielzeug/formit

Lightweight form state management powered by native FormData. Build robust forms with minimal code and maximum simplicity.

## Features

- ✅ **Native FormData** - Built on browser-standard FormData API
- ✅ **Unified API** - One clear way to do everything
- ✅ **File Upload Support** - Native File/FileList/Blob handling
- ✅ **Nested Objects** - Automatic flattening with dot notation
- ✅ **Array Fields** - Full support for multi-select and checkboxes
- ✅ **Type-Safe** - Full TypeScript support
- ✅ **Flexible Validation** - Sync/async validators at field and form level
- ✅ **Smart State Tracking** - Automatic dirty and touched state with Map/Set
- ✅ **Field Binding** - One-line input integration
- ✅ **Framework Agnostic** - Works with React, Vue, Svelte, or vanilla JS
- ✅ **Lightweight** - ~3 KB gzipped, zero dependencies

## Installation

```bash
pnpm add @vielzeug/formit
# or
npm install @vielzeug/formit
# or
yarn add @vielzeug/formit
```

## Quick Start

```typescript
import { createForm } from '@vielzeug/formit';
const form = createForm({
  fields: {
    email: {
      value: '',
      validators: (v) => !String(v).includes('@') && 'Invalid email',
    },
    password: {
      value: '',
      validators: (v) => String(v).length < 8 && 'Min 8 characters',
    },
  },
});
// Use in your component
function LoginForm() {
  const [state, setState] = useState(form.snapshot());
  useEffect(() => form.subscribe(setState), []);
  return (
    <form onSubmit={async (e) => {
      e.preventDefault();
      await form.submit(async (formData) => {
        await fetch('/api/login', { method: 'POST', body: formData });
      });
    }}>
      <input {...form.bind('email')} type="email" />
      {state.errors.get('email') && <span>{state.errors.get('email')}</span>}
      <input {...form.bind('password')} type="password" />
      {state.errors.get('password') && <span>{state.errors.get('password')}</span>}
      <button type="submit" disabled={state.isSubmitting}>Login</button>
    </form>
  );
}
```

## Core Concepts

### Form Initialization

Three flexible patterns for defining fields:
**1. Plain Values**

```typescript
const form = createForm({
  fields: {
    name: '',
    email: '',
    age: 0,
  },
});
```

**2. Nested Objects (Auto-Flattened)**

```typescript
const form = createForm({
  fields: {
    user: {
      name: 'Alice',
      email: 'alice@example.com',
      profile: {
        age: 25,
        city: 'NYC',
      },
    },
  },
});
// Access with dot notation
form.get('user.name'); // 'Alice'
form.get('user.profile.age'); // '25'
```

**3. With Validators (FieldConfig)**

```typescript
const form = createForm({
  fields: {
    email: {
      value: '',
      validators: (v) => !String(v).includes('@') && 'Invalid email',
    },
    password: {
      value: '',
      validators: [(v) => !v && 'Required', (v) => String(v).length < 8 && 'Too short'],
    },
  },
  validate: (formData) => {
    const errors = new Map();
    const password = formData.get('password');
    const confirm = formData.get('confirmPassword');
    if (password !== confirm) {
      errors.set('confirmPassword', 'Passwords must match');
    }
    return errors;
  },
});
```

### Value Management

```typescript
// Get single value
const email = form.get('email');
// Set single value
form.set('email', 'user@example.com');
// Set multiple values (merge)
form.set({ email: 'new@example.com', name: 'Alice' });
// Replace all values
form.set({ email: 'reset@example.com' }, { replace: true });
// Get all values as object
const allValues = form.values(); // { email: '...', name: '...' }
// Get native FormData
const formData = form.data();
```

### Arrays and Multi-Select

```typescript
const form = createForm({
  fields: {
    tags: ['javascript', 'typescript'],
    interests: {
      value: [],
      validators: (v) => Array.isArray(v) && v.length === 0 && 'Select at least one',
    },
  },
});
// Get array value
const tags = form.get('tags'); // ['javascript', 'typescript']
// Set array value
form.set('tags', ['vue', 'react']);
// Empty arrays work correctly
form.set('tags', []); // Returns [] not undefined
```

### Validation

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

### Error Management

```typescript
// Get single error
const emailError = form.error('email');
// Set single error
form.error('email', 'This email is taken');
// Clear single error
form.error('email', '');
// Get all errors
const allErrors = form.error(); // Map<string, string>
// Set multiple errors
form.errors({ email: 'Invalid', password: 'Too short' });
form.errors(new Map([['email', 'Invalid']]));
```

### State Tracking

```typescript
// Check if field is dirty (changed from initial)
const isDirty = form.dirty('email');
// Check if field is touched (user interacted)
const isTouched = form.touch('email');
// Mark field as touched
form.touch('email', true);
// Get complete state snapshot
const state = form.snapshot();
console.log(state.dirty); // Set<string>
console.log(state.touched); // Set<string>
console.log(state.errors); // Map<string, string>
console.log(state.isValidating); // boolean
console.log(state.isSubmitting); // boolean
console.log(state.submitCount); // number
```

### Field Binding

```typescript
// Simple binding
<input {...form.bind('email')} />
// With custom value extractor
const binding = form.bind('category', {
  valueExtractor: (e) => e.selectedOption
});
// Disable touch on blur
<input {...form.bind('name', { markTouchedOnBlur: false })} />
```

### Form Submission

```typescript
// Submit with validation
await form.submit(async (formData) => {
  const response = await fetch('/api/submit', {
    method: 'POST',
    body: formData,
  });
  return response.json();
});
// Skip validation
await form.submit(onSubmit, { validate: false });
// Handle validation errors
try {
  await form.submit(onSubmit);
} catch (error) {
  if (error instanceof ValidationError) {
    console.log('Validation errors:', error.errors);
  }
}
```

### File Uploads

```typescript
const form = createForm({
  fields: {
    avatar: null,
    title: '',
  },
});
// Handle file input
form.set('avatar', fileInput.files[0]);
// Submit with FormData
await form.submit(async (formData) => {
  // FormData is ready with the file
  await fetch('/api/upload', { method: 'POST', body: formData });
});
```

## Framework Integration

### React

```tsx
import { createForm } from '@vielzeug/formit';
import { useEffect, useState } from 'react';
function useForm(init) {
  const [form] = useState(() => createForm(init));
  const [state, setState] = useState(form.snapshot());
  useEffect(() => form.subscribe(setState), [form]);
  return { form, state };
}
// Usage
function SignupForm() {
  const { form, state } = useForm({
    fields: {
      email: {
        value: '',
        validators: (v) => !String(v).includes('@') && 'Invalid email',
      },
      password: '',
    },
  });
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.submit(async (formData) => {
          await fetch('/api/signup', { method: 'POST', body: formData });
        });
      }}>
      <input {...form.bind('email')} placeholder="Email" />
      {state.errors.get('email') && <span>{state.errors.get('email')}</span>}
      <input {...form.bind('password')} type="password" />
      <button type="submit" disabled={state.isSubmitting}>
        {state.isSubmitting ? 'Submitting...' : 'Sign Up'}
      </button>
    </form>
  );
}
```

### Vue 3

```typescript
// composables/useForm.ts
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

```vue
<!-- LoginForm.vue -->
<script setup>
import { useForm } from '@/composables/useForm';
const { form, state } = useForm({
  fields: {
    email: {
      value: '',
      validators: (v) => !String(v).includes('@') && 'Invalid email',
    },
    password: '',
  },
});
</script>
<template>
  <form @submit.prevent="form.submit((fd) => console.log(Object.fromEntries(fd)))">
    <input v-bind="form.bind('email')" />
    <span v-if="state.errors.get('email')">{{ state.errors.get('email') }}</span>
    <button type="submit" :disabled="state.isSubmitting">Submit</button>
  </form>
</template>
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
    }
  }
});
const state = writable(form.snapshot());
let unsubscribe;
onMount(() => unsubscribe = form.subscribe(s => state.set(s)));
onDestroy(() => unsubscribe?.());
</script>
<form on:submit|preventDefault={() => form.submit(console.log)}>
  <input {...form.bind('email')} />
  {#if $state.errors.get('email')}<span>{$state.errors.get('email')}</span>{/if}
  <button type="submit" disabled={$state.isSubmitting}>Submit</button>
</form>
```

## Advanced Usage

### Async Validation

```typescript
const form = createForm({
  fields: {
    username: {
      value: '',
      validators: async (value) => {
        const { exists } = await fetch(`/api/check-username?username=${value}`).then((r) => r.json());
        if (exists) return 'Username already taken';
      },
    },
  },
});
```

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
  },
});
const steps = [{ fields: ['name', 'email'] }, { fields: ['address', 'city'] }];
async function validateStep(stepIndex) {
  const errors = await form.validate({ fields: steps[stepIndex].fields });
  return errors.size === 0;
}
```

### Dynamic Fields

```typescript
const form = createForm({
  fields: {
    items: [] as Array<{ name: string; price: number }>,
  },
});
function addItem() {
  const items = form.get('items') || [];
  form.set('items', [...items, { name: '', price: 0 }]);
}
function removeItem(index: number) {
  const items = form.get('items') || [];
  form.set(
    'items',
    items.filter((_, i) => i !== index),
  );
}
```

### Form Reset

```typescript
const form = createForm({
  fields: { name: '', email: '' },
});
// Reset to initial values
form.reset();
// Reset to new values
form.reset({ name: 'Guest', email: '' });
```

## API Reference

### `createForm(init?)`

Creates a new form instance.

```typescript
type FormInit = {
  fields?: Record<string, any>; // Plain values, nested objects, or FieldConfig
  validate?: FormValidator; // Form-level validator
};
type FieldConfig = {
  value?: any;
  validators?: FieldValidator | FieldValidator[];
};
type FieldValidator = (value: FormDataEntryValue) => string | undefined | null | Promise<string | undefined | null>;
type FormValidator = (
  formData: FormData,
) => Map<string, string> | undefined | null | Promise<Map<string, string> | undefined | null>;
```

### Form Instance Methods

#### Value Management

- `get(name: string): any` - Get field value
- `set(name: string, value: any, options?)` - Set single field
- `set(entries: Record | FormData, options?)` - Set multiple fields
- `values(): Record<string, any>` - Get all as object
- `data(): FormData` - Get native FormData
- `clone(): FormData` - Clone FormData

#### Error Management

- `error(): Map<string, string>` - Get all errors
- `error(name: string): string | undefined` - Get field error
- `error(name: string, message: string)` - Set field error
- `errors(nextErrors: Map | Record)` - Set multiple errors

#### State Tracking

- `dirty(name: string): boolean` - Check if field is dirty
- `touch(name: string): boolean` - Check if field is touched
- `touch(name: string, mark: true)` - Mark field as touched
- `snapshot(): FormState` - Get state snapshot

#### Validation

- `validate(name: string): Promise<string | undefined>` - Validate field
- `validate(options?): Promise<Map<string, string>>` - Validate form

#### Form Operations

- `submit(onSubmit, options?): Promise<any>` - Submit with validation
- `reset(newFormData?): void` - Reset form
- `bind(name, config?)` - Create field binding

#### Subscriptions

- `subscribe(listener): () => void` - Subscribe to form changes
- `subscribeField(name, listener): () => void` - Subscribe to field changes

### Types

```typescript
type FormState = {
  errors: Map<string, string>;
  touched: Set<string>;
  dirty: Set<string>;
  isValidating: boolean;
  isSubmitting: boolean;
  submitCount: number;
};
class ValidationError extends Error {
  readonly type: 'validation';
  readonly errors: Map<string, string>;
}
```

## Examples

For complete real-world examples, see the [documentation](https://github.com/vielzeug/formit).

## License

MIT

## Contributing

Contributions are welcome! Please read our contributing guidelines.

## Support

- [Documentation](https://github.com/vielzeug/formit)
- [Issues](https://github.com/vielzeug/formit/issues)
- [Discussions](https://github.com/vielzeug/formit/discussions)
