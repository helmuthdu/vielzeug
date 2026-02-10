<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.0-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-2.0_KB-success" alt="Size">
  <img src="https://img.shields.io/badge/TypeScript-100%25-blue" alt="TypeScript">
  <img src="https://img.shields.io/badge/dependencies-0-success" alt="Dependencies">
</div>

<img src="/logo-formit.svg" alt="Formit Logo" width="156" class="logo-highlight"/>

# Formit

**Formit** is a minimal, type-safe form state management library for TypeScript. It provides powerful validation, subscriptions, and field binding with zero dependencies.

## What Problem Does Formit Solve?

Managing form state in modern web applications is complex - you need validation, error handling, dirty/touched state tracking, and reactive updates. Formit provides all of this with a clean, type-safe API.

**Traditional Approach**:

```ts
// Manual state management
const [values, setValues] = useState({ name: '', email: '' });
const [errors, setErrors] = useState({});
const [touched, setTouched] = useState({});

const handleChange = (field, value) => {
  setValues({ ...values, [field]: value });
  setTouched({ ...touched, [field]: true });

  // Manual validation
  if (field === 'email' && !value.includes('@')) {
    setErrors({ ...errors, email: 'Invalid email' });
  }
};

const handleSubmit = async (e) => {
  e.preventDefault();
  // More manual validation...
  if (Object.keys(errors).length === 0) {
    await submitForm(values);
  }
};
```

**With Formit**:

```ts
import { createForm } from '@vielzeug/formit';

const form = createForm({
  initialValues: { name: '', email: '' },
  fields: {
    email: {
      validators: (value) => {
        if (!value.includes('@')) return 'Invalid email';
      },
    },
  },
});

// Bind to inputs
<input {...form.bind('email')} />

// Submit with automatic validation
form.submit(async (values) => {
  await submitForm(values);
});
```

### Comparison with Alternatives

| Feature             | Formit       | Formik       | React Hook Form |
| ------------------- | ------------ | ------------ | --------------- |
| Bundle Size         | **2.0 KB**   | ~13KB        | ~8KB            |
| Dependencies        | 0            | React        | React           |
| TypeScript          | Native       | Good         | Excellent       |
| Framework           | Agnostic     | React only   | React only      |
| Array Helpers       | Manual       | Built-in     | Built-in        |
| Validation          | Async + Sync | Async + Sync | Async + Sync    |
| Field Subscriptions | ✅           | ✅           | ✅              |

## When to Use Formit

✅ **Use Formit when you need:**

- Type-safe form state management
- Field and form-level validation
- Nested object/array support
- Reactive subscriptions to form state
- Framework-agnostic solution
- Minimal bundle size

❌ **Don't use Formit when:**

- You need complex array manipulation (use Formik or React Hook Form)
- You want built-in UI components
- You need wizard/multi-step forms (Formit is low-level, build on top)

## 🚀 Key Features

- **Type-Safe**: Full TypeScript support with inferred types from initial values
- **Path-Based Access**: Dot notation, bracket notation, and array paths for nested data
- **Powerful Validation**: Field-level and form-level validators with async support
- **Reactive Subscriptions**: Subscribe to form state or individual field changes
- **Easy Binding**: Simple `{...form.bind('field')}` for inputs
- **Zero Dependencies**: No external dependencies, fully self-contained
- **Tiny Bundle**: ~3KB minified
- **Framework Agnostic**: Works with React, Vue, Svelte, or vanilla JS

## 🏁 Quick Start

### Installation

::: code-group

```sh [npm]
npm install @vielzeug/formit
```

```sh [yarn]
yarn add @vielzeug/formit
```

```sh [pnpm]
pnpm add @vielzeug/formit
```

:::

### Basic Form

```ts
import { createForm } from '@vielzeug/formit';

const form = createForm({
  initialValues: {
    username: '',
    email: '',
    age: 0,
  },
});

// Get/set values
form.setValue('username', 'john');
console.log(form.getValue('username')); // 'john'

// Subscribe to changes
const unsubscribe = form.subscribe((state) => {
  console.log('Form state:', state);
});
```

### With Validation

```ts
const form = createForm({
  initialValues: {
    email: '',
    password: '',
  },
  fields: {
    email: {
      validators: [
        (value) => {
          if (!value) return 'Email is required';
          if (!value.includes('@')) return 'Invalid email';
        },
      ],
    },
    password: {
      validators: (value) => {
        if (value.length < 8) return 'Password must be at least 8 characters';
      },
    },
  },
  validate: (values) => {
    const errors: Record<string, string> = {};
    if (values.password === values.email) {
      errors.password = 'Password cannot be the same as email';
    }
    return errors;
  },
});

// Validate and submit
form.submit(async (values) => {
  const response = await fetch('/api/register', {
    method: 'POST',
    body: JSON.stringify(values),
  });
  return response.json();
});
```

### React Integration

```tsx
import { createForm } from '@vielzeug/formit';
import { useEffect, useState } from 'react';

function LoginForm() {
  const [form] = useState(() =>
    createForm({
      initialValues: { email: '', password: '' },
      fields: {
        email: {
          validators: (value) => {
            if (!value.includes('@')) return 'Invalid email';
          },
        },
      },
    }),
  );

  const [state, setState] = useState(form.getStateSnapshot());

  useEffect(() => {
    return form.subscribe(setState);
  }, [form]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.submit(async (values) => {
          await login(values);
        });
      }}>
      <input {...form.bind('email')} />
      {state.errors.email && <span>{state.errors.email}</span>}

      <input {...form.bind('password')} type="password" />
      {state.errors.password && <span>{state.errors.password}</span>}

      <button type="submit" disabled={state.isSubmitting}>
        {state.isSubmitting ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
}
```

## 📚 Documentation

- **[Usage Guide](./usage.md)**: Detailed usage patterns and framework integration
- **[API Reference](./api.md)**: Complete API documentation and types
- **[Examples](./examples.md)**: Real-world examples and advanced patterns

### Validation Flow

1. **Field-level validators** run first (when field changes or on demand)
2. **Form-level validators** run after all field validators pass
3. **Submission** only proceeds if no validation errors exist

## ❓ FAQ

### What browsers and environments are supported?

Formit works in all modern browsers (Chrome, Firefox, Safari, Edge) and requires:

- **Node.js**: v18.0.0 or higher
- **TypeScript**: v5.0.0 or higher

### How do I reset a form?

```ts
form.setValues(initialValues, { replace: true });
form.resetErrors();
```

### Can I validate without submitting?

```ts
// Validate all fields
await form.validateAll();

// Validate single field
await form.validateField('email');
```

### How do I handle async validation?

```ts
const form = createForm({
  fields: {
    username: {
      validators: async (value) => {
        const exists = await checkUsernameExists(value);
        if (exists) return 'Username already taken';
      },
    },
  },
});
```

### Can I use with Vue or Svelte?

Yes! Formit is framework-agnostic. Use subscriptions to update your component state:

```vue
<script setup>
import { createForm } from '@vielzeug/formit';
import { ref, onMounted, onUnmounted } from 'vue';

const form = createForm({ initialValues: { name: '' } });
const state = ref(form.getStateSnapshot());

let unsubscribe;
onMounted(() => {
  unsubscribe = form.subscribe((newState) => {
    state.value = newState;
  });
});

onUnmounted(() => {
  unsubscribe?.();
});
</script>
```

### How do I integrate with UI libraries?

Formit's `bind()` method returns an object compatible with most input components:

```tsx
// Works with native inputs
<input {...form.bind('email')} />

// Works with custom components that accept value/onChange
<CustomInput {...form.bind('email')} />

// Manual control
<input
  value={form.getValue('email')}
  onChange={(e) => form.setValue('email', e.target.value)}
/>
```

## 🐛 Troubleshooting

### Form state not updating in React

::: danger Problem
Form values change, but the component doesn't re-render.
:::

::: tip Solution
Make sure you're subscribing to form state changes:

```tsx
function MyForm() {
  const [form] = useState(() => createForm({ initialValues: { name: '' } }));
  const [state, setState] = useState(form.getStateSnapshot());

  useEffect(() => {
    return form.subscribe(setState); // ✅ Subscribe to changes
  }, [form]);

  // Use state.values, state.errors, etc.
}
```

:::

### Validation not triggering

::: danger Problem
Validators don't run when expected.
:::

::: tip Solution
Validators run on submit by default. To validate on field change:

```ts
// Validate on blur
<input
  {...form.bind('email')}
  onBlur={() => form.validateField('email')}
/>

// Or validate immediately after setValue
form.setValue('email', value);
await form.validateField('email');
```

:::

### TypeScript errors with nested paths

::: danger Problem
Type errors when using nested paths like `user.profile.name`.
:::

::: tip Solution
TypeScript can't infer deeply nested paths. Use type assertion or the array notation:

```ts
// Option 1: Type assertion
form.getValue('user.profile.name' as any);

// Option 2: Array notation (better)
form.getValue(['user', 'profile', 'name']);

// Option 3: Define paths as const
const paths = {
  userName: 'user.profile.name' as const,
};
form.getValue(paths.userName);
```

:::

### Async validators never resolve

::: danger Problem
Form stuck in `isValidating` state.
:::

::: tip Solution
Ensure async validators always return a value or undefined:

```ts
// ❌ Wrong - doesn't return anything
validators: async (value) => {
  const valid = await checkEmail(value);
  if (!valid) return 'Invalid email';
  // Missing return for valid case!
}

// ✅ Correct - always returns
validators: async (value) => {
  const valid = await checkEmail(value);
  if (!valid) return 'Invalid email';
  return undefined; // or just return;
}
```

:::

### Field errors not clearing

::: danger Problem
Error messages persist after fixing the field.
:::

::: tip Solution
Re-validate the field after changing its value:

```ts
// Update value and re-validate
form.setValue('email', newValue);
await form.validateField('email');

// Or use validateAll() to revalidate everything
await form.validateAll();
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

> **Tip:** Formit is part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) ecosystem, which includes utilities for storage, HTTP clients, logging, and more.
