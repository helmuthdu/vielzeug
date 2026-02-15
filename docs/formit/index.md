<div class="badges">
  <img src="https://img.shields.io/badge/version-1.1.2-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-2.9_KB-success" alt="Size">
  <img src="https://img.shields.io/badge/TypeScript-100%25-blue" alt="TypeScript">
  <img src="https://img.shields.io/badge/dependencies-0-success" alt="Dependencies">
</div>

<img src="/logo-formit.svg" alt="Formit Logo" width="156" class="logo-highlight"/>

# Formit

**Formit** is a lightweight, type-safe form state management library powered by native FormData. Build robust forms with minimal code and maximum simplicity.

## What Problem Does Formit Solve?

Managing form state in modern applications is complex - you need validation, error handling, dirty/touched tracking, file uploads, and framework integration. Most form libraries are bloated or framework-specific. Formit provides a minimal, framework-agnostic solution built on web standards.

**Traditional Approach**:

```ts
// Manual form state management
const formState = {
  values: { email: '', password: '' },
  errors: {},
  touched: {},
  dirty: {},
  isSubmitting: false,
};

function handleChange(field, value) {
  formState.values[field] = value;
  formState.dirty[field] = true;
  validateField(field, value);
  notifySubscribers();
}

function validateField(field, value) {
  if (field === 'email' && !value.includes('@')) {
    formState.errors.email = 'Invalid email';
  }
}

// Manual subscription management
const subscribers = [];
function subscribe(fn) {
  subscribers.push(fn);
  return () => subscribers.splice(subscribers.indexOf(fn), 1);
}
```

**With Formit**:

```ts
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

// Built-in validation, state tracking, and subscriptions
form.subscribe((state) => console.log(state));
await form.submit(async (formData) => {
  await fetch('/api/login', { method: 'POST', body: formData });
});
```

### Comparison with Alternatives

| Feature                | Formit         | React Hook Form | Formik      | Native Forms |
| ---------------------- | -------------- | --------------- | ----------- | ------------ |
| Framework              | **Agnostic**   | React           | React       | Agnostic     |
| TypeScript             | ✅ First-class | ✅ First-class  | ✅ Good     | ❌           |
| Bundle Size (gzip)     | **~2.9 KB**    | ~9 KB           | ~13 KB      | 0 KB         |
| Dependencies           | 0              | 0               | 3+          | 0            |
| Native FormData        | ✅ Built-in    | ⚠️ Optional     | ❌          | ✅ Manual    |
| File Upload Support    | ✅ Native      | ✅ Yes          | ⚠️ Complex  | ✅ Manual    |
| Nested Objects         | ✅ Auto-flat   | ✅ Yes          | ✅ Yes      | ❌           |
| Array Fields           | ✅ Full        | ✅ Yes          | ✅ Yes      | ⚠️ Limited   |
| Async Validation       | ✅ Built-in    | ✅ Built-in     | ✅ Built-in | ❌           |
| Field-Level Validation | ✅ Yes         | ✅ Yes          | ✅ Yes      | ⚠️ HTML only |
| Form-Level Validation  | ✅ Yes         | ✅ Yes          | ✅ Yes      | ❌           |
| Dirty/Touched Tracking | ✅ Auto        | ✅ Auto         | ✅ Auto     | ❌           |
| Subscriptions          | ✅ Built-in    | ❌              | ❌          | ❌           |
| Field Binding          | ✅ One-line    | ✅ Yes          | ✅ Yes      | ❌           |
| React/Vue/Svelte Hooks | ⚠️ DIY         | ✅ React        | ✅ React    | N/A          |

## When to Use Formit

**✅ Use Formit when you:**

- Need framework-agnostic form management
- Want native FormData for easy API submissions
- Build applications with file uploads
- Require minimal bundle size (~2.9 KB)
- Need type-safe forms with full TypeScript support
- Want to use the same forms across React, Vue, Svelte
- Prefer web standards over framework-specific solutions
- Need advanced features (nested objects, arrays, async validation)

**❌ Consider alternatives when you:**

- Only use React and want deep React integration (use React Hook Form)
- Need built-in DevTools integration
- Require framework-specific optimizations
- Want pre-built UI components (Formit is headless)

## 🚀 Key Features

- **Native FormData**: Built on browser-standard [FormData API](./usage.md#value-management) - ready for fetch() submissions
- **Unified API**: [One clear way](./usage.md#basic-usage) to initialize forms - no decision paralysis
- **File Upload Support**: Native [File/FileList/Blob handling](./usage.md#file-uploads) with validation
- **Nested Objects**: [Automatic flattening](./usage.md#basic-usage) with dot notation access
- **Array Fields**: Full support for [multi-select and checkboxes](./usage.md#arrays-and-multi-select) with proper empty array handling
- **Type-Safe**: Full TypeScript support with intelligent type inference
- **Flexible Validation**: [Sync/async validators](./usage.md#validation) at field and form level
- **Smart State Tracking**: Automatic [dirty and touched state](./api.md#state-tracking) with Map/Set
- **Field Binding**: [One-line input integration](./api.md#bindname-config) with customizable extractors
- **Framework Agnostic**: Works with [React, Vue, Svelte](./usage.md#framework-integration), or vanilla JS
- **Lightweight**: Only **~2.9 KB gzipped**, zero dependencies

## 🏁 Quick Start

### Installation

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

### Basic Example

::: code-group

```tsx [React]
import { createForm } from '@vielzeug/formit';
import { useEffect, useState } from 'react';

function LoginForm() {
  const [form] = useState(() =>
    createForm({
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
    }),
  );

  const [state, setState] = useState(form.snapshot());

  useEffect(() => form.subscribe(setState), [form]);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        await form.submit(async (formData) => {
          await fetch('/api/login', { method: 'POST', body: formData });
        });
      }}>
      <input {...form.bind('email')} type="email" />
      {state.errors.get('email') && <span>{state.errors.get('email')}</span>}

      <input {...form.bind('password')} type="password" />
      {state.errors.get('password') && <span>{state.errors.get('password')}</span>}

      <button type="submit" disabled={state.isSubmitting}>
        Login
      </button>
    </form>
  );
}
```

```vue [Vue 3]
<script setup>
import { createForm } from '@vielzeug/formit';
import { ref, onMounted, onUnmounted } from 'vue';

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

const state = ref(form.snapshot());
let unsubscribe;

onMounted(() => (unsubscribe = form.subscribe((s) => (state.value = s))));
onUnmounted(() => unsubscribe?.());
</script>

<template>
  <form @submit.prevent="form.submit((fd) => fetch('/api/login', { method: 'POST', body: fd }))">
    <input v-bind="form.bind('email')" type="email" />
    <span v-if="state.errors.get('email')">{{ state.errors.get('email') }}</span>

    <input v-bind="form.bind('password')" type="password" />
    <span v-if="state.errors.get('password')">{{ state.errors.get('password') }}</span>

    <button type="submit" :disabled="state.isSubmitting">Login</button>
  </form>
</template>
```

```svelte [Svelte]
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
    password: {
      value: '',
      validators: (v) => String(v).length < 8 && 'Min 8 characters'
    }
  }
});

const state = writable(form.snapshot());
let unsubscribe;

onMount(() => unsubscribe = form.subscribe(s => state.set(s)));
onDestroy(() => unsubscribe?.());
</script>

<form on:submit|preventDefault={() => form.submit((fd) =>
  fetch('/api/login', { method: 'POST', body: fd })
)}>
  <input {...form.bind('email')} type="email" />
  {#if $state.errors.get('email')}
    <span>{$state.errors.get('email')}</span>
  {/if}

  <input {...form.bind('password')} type="password" />
  {#if $state.errors.get('password')}
    <span>{$state.errors.get('password')}</span>
  {/if}

  <button type="submit" disabled={$state.isSubmitting}>Login</button>
</form>
```

:::

## 🎓 Core Concepts

### Form Initialization

Three flexible patterns for defining fields:

```typescript
// 1. Plain Values (no validation)
const form = createForm({
  fields: { name: '', email: '', age: 0 },
});

// 2. Nested Objects (auto-flattened)
const form = createForm({
  fields: {
    user: {
      name: 'Alice',
      profile: { age: 25, city: 'NYC' },
    },
  },
});
// Access: form.get('user.profile.age')

// 3. With Validators (FieldConfig)
const form = createForm({
  fields: {
    email: {
      value: '',
      validators: (v) => !String(v).includes('@') && 'Invalid email',
    },
  },
  validate: (formData) => {
    const errors = new Map();
    // Cross-field validation
    return errors;
  },
});
```

### Value Management

```typescript
form.get('email'); // Get value
form.set('email', 'user@example.com'); // Set value
form.set({ email: 'new@example.com', name: 'Alice' }); // Set multiple (merge)
form.values(); // Get all as object
form.data(); // Get native FormData
```

### Validation

```typescript
await form.validate('email'); // Validate single field
await form.validate(); // Validate all
await form.validate({ onlyTouched: true }); // Only touched
await form.validate({ fields: ['email', 'password'] }); // Specific fields
```

### Field Binding

```typescript
// One-line integration with inputs
<input {...form.bind('email')} type="email" />

// Access error and state
{state.errors.get('email') && <span>{state.errors.get('email')}</span>}
```

## 📚 Documentation

- **[Usage Guide](./usage.md)**: Detailed validation, file uploads, and framework integration
- **[API Reference](./api.md)**: Complete documentation of all methods and types
- **[Examples](./examples.md)**: Real-world patterns including multi-step forms and dynamic fields
- **[Interactive REPL](/repl)**: Try Formit in your browser

## ❓ FAQ

### Is Formit production-ready?

Yes! Formit is battle-tested and used in production applications. It has comprehensive test coverage and follows semantic versioning.

### Does Formit work with React/Vue/Svelte?

Absolutely! Formit is framework-agnostic. See [Framework Integration](./usage.md#framework-integration) for custom hooks and composables.

### Can I use Formit with file uploads?

Yes! Formit has native support for File/FileList/Blob through the FormData API. Files are automatically included when you submit.

### How do I handle async validation?

Formit supports async validators out of the box. Simply return a Promise from your validator function. See [Async Validation](./usage.md#validation).

### Does Formit support TypeScript?

Yes! Formit is written in TypeScript with full type inference for forms, fields, and validators.

### How does Formit compare to React Hook Form?

Formit is framework-agnostic (~2.9 KB) while React Hook Form is React-specific (~9 KB). Choose Formit for cross-framework projects or minimal bundle size.

## 🐛 Troubleshooting

### Form values not updating in UI

::: danger Problem
Form state changes but component doesn't re-render.
:::

::: tip Solution
Make sure you're subscribing to form state changes:

```tsx
const [state, setState] = useState(form.snapshot());

useEffect(() => {
  return form.subscribe(setState); // ✅ Subscribe
}, [form]);
```

:::

### Validation not running

::: danger Problem
Validators not being called.
:::

::: tip Solution
Check validator return values and ensure they're in the correct format:

```typescript
// ✅ Correct
validators: (v) => !v && 'Error message',

// ❌ Wrong (returns boolean)
validators: (v) => !v,
```

:::

### Errors not clearing

::: danger Problem
Form errors persist after fixing values.
:::

::: tip Solution
Errors are automatically cleared when validation passes. Ensure validators return `undefined` or falsy value on success:

```typescript
validators: (v) => {
  if (!v) return 'Required';
  if (String(v).length < 8) return 'Too short';
  // ✅ Return nothing (undefined) on success
};
```

:::

### TypeScript errors with nested objects

::: danger Problem
Type inference not working with nested fields.
:::

::: tip Solution
TypeScript infers types from the `fields` object. For complex types, you can use type assertions:

```typescript
const form = createForm({
  fields: {
    user: { name: '', email: '' } as User,
  },
});
```

:::

## 🤝 Contributing

Found a bug or want to contribute? Check our [GitHub repository](https://github.com/helmuthdu/vielzeug).

## 📄 License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu)

## 🔗 Useful Links

- [GitHub Repository](https://github.com/helmuthdu/vielzeug)
- [Issue Tracker](https://github.com/helmuthdu/vielzeug/issues)
- [NPM Package](https://www.npmjs.com/package/@vielzeug/formit)
- [Changelog](https://github.com/helmuthdu/vielzeug/blob/main/packages/formit/CHANGELOG.md)

---

> **Tip:** Formit is part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) ecosystem, which includes utilities for storage, HTTP clients, state management, and more.
