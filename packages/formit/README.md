# @vielzeug/formit

Type-safe form state management with effortless validation. Build robust forms with minimal code and maximum flexibility.

## Features

- ✅ **Type-Safe** - Full TypeScript support with path-based type inference
- ✅ **Flexible Validation** - Sync/async validators with granular control
- ✅ **Smart State Tracking** - Automatic dirty and touched state management
- ✅ **Field Binding** - One-line input integration with customizable extractors
- ✅ **Nested Paths** - Deep object and array support with dot/bracket notation
- ✅ **Performance** - Targeted validation (only touched fields, specific subsets)
- ✅ **Framework Agnostic** - Works with React, Vue, Svelte, or vanilla JS
- ✅ **Lightweight** - 2.4 KB gzipped, zero dependencies
- ✅ **Developer Experience** - Intuitive API with comprehensive helpers

## Installation

```bash
# pnpm
pnpm add @vielzeug/formit

# npm
npm install @vielzeug/formit

# yarn
yarn add @vielzeug/formit
```

## Quick Start

```typescript
import { createForm } from '@vielzeug/formit';

// Define your form structure
interface LoginForm {
  email: string;
  password: string;
  rememberMe: boolean;
}

// Create form with validation
const form = createForm<LoginForm>({
  initialValues: {
    email: '',
    password: '',
    rememberMe: false,
  },
  fields: {
    email: {
      validators: [
        (value) => (!value ? 'Email is required' : undefined),
        (value) => (!value.includes('@') ? 'Invalid email' : undefined),
      ],
    },
    password: {
      validators: (value) =>
        value.length < 8 ? 'Password must be at least 8 characters' : undefined,
    },
  },
});

// Use in your component
function LoginForm() {
  return (
    <form onSubmit={async (e) => {
      e.preventDefault();
      await form.submit(async (values) => {
        await api.login(values);
      });
    }}>
      <input {...form.bind('email')} type="email" />
      {form.isTouched('email') && form.getError('email') && (
        <span>{form.getError('email')}</span>
      )}

      <input {...form.bind('password')} type="password" />
      {form.isTouched('password') && form.getError('password') && (
        <span>{form.getError('password')}</span>
      )}

      <label>
        <input {...form.bind('rememberMe')} type="checkbox" />
        Remember me
      </label>

      <button type="submit" disabled={form.getStateSnapshot().isSubmitting}>
        Login
      </button>
    </form>
  );
}
```

## Core Concepts

### Form Creation

```typescript
const form = createForm({
  // Initial values
  initialValues: { name: 'Alice', age: 30 },

  // Field-level validation
  fields: {
    name: {
      validators: (value) => (!value ? 'Required' : undefined),
      initialValue: 'Default Name', // Used if not in initialValues
    },
    age: {
      validators: [
        (value) => (value < 18 ? 'Must be 18+' : undefined),
        (value) => (value > 120 ? 'Invalid age' : undefined),
      ],
    },
  },

  // Form-level validation
  validate: (values) => {
    const errors: any = {};
    if (values.password !== values.confirmPassword) {
      errors.confirmPassword = 'Passwords must match';
    }
    return errors;
  },
});
```

### Path Handling

Formit supports deep nested paths with dot notation and array indices:

```typescript
// Nested objects
form.setValue('user.profile.name', 'Alice');
form.getValue('user.profile.name'); // 'Alice'

// Arrays with bracket notation
form.setValue('items[0].title', 'First Item');
form.getValue('items[0].title'); // 'First Item'

// Array path format
form.setValue(['tags', 1], 'tag2');
form.getValue(['tags', 1]); // 'tag2'

// Auto-creates nested structures
form.setValue('deep.nested.path', 'value');
// Creates: { deep: { nested: { path: 'value' } } }
```

### Validation

#### Field-Level Validators

```typescript
const form = createForm({
  fields: {
    email: {
      validators: [
        // Sync validation
        (value) => (!value ? 'Required' : undefined),

        // Async validation
        async (value) => {
          const exists = await checkEmailExists(value);
          return exists ? 'Email already taken' : undefined;
        },

        // Object return (multiple errors)
        (value) => ({
          format: !value.includes('@') ? 'Invalid format' : '',
          length: value.length < 5 ? 'Too short' : '',
        }),
      ],
    },
  },
});

// Validate single field
const error = await form.validateField('email');

// Validate all fields
const errors = await form.validateAll();

// Validate only touched fields (better UX)
await form.validateAll({ onlyTouched: true });

// Validate specific fields
await form.validateAll({ fields: ['email', 'password'] });
```

#### Form-Level Validation

```typescript
const form = createForm({
  validate: (values) => {
    const errors: any = {};

    if (values.password !== values.confirmPassword) {
      errors.confirmPassword = 'Passwords must match';
    }

    if (values.startDate > values.endDate) {
      errors.endDate = 'End date must be after start date';
    }

    return errors;
  },
});
```

### Field Binding

Bind fields to inputs with automatic state management:

```typescript
// Basic binding
<input {...form.bind('email')} />

// Custom value extractor for select/checkbox
const selectBinding = form.bind('category', {
  valueExtractor: (e) => e.target.selectedOptions[0].value,
});

const checkboxBinding = form.bind('agreed', {
  valueExtractor: (e) => e.target.checked,
});

// Disable auto-touch on blur
const binding = form.bind('field', {
  markTouchedOnBlur: false,
});

// Binding includes: value, onChange, onBlur, name
const binding = form.bind('name');
binding.value;      // Current value
binding.onChange;   // Change handler
binding.onBlur;     // Blur handler
binding.name;       // Field key
binding.set;        // Setter function
```

### State Management

```typescript
// Get/Set values
form.getValue('email');
form.setValue('email', 'test@example.com');

form.getValues(); // All values
form.setValues({ email: 'new@email.com', name: 'Bob' });

// Replace all values
form.setValues({ newField: 'value' }, { replace: true });

// Error management
form.getError('email');
form.getErrors(); // All errors
form.setError('email', 'Custom error');
form.setErrors({ email: 'Error 1', password: 'Error 2' });
form.resetErrors();

// State helpers
form.isDirty('email'); // Check if modified
form.isTouched('email'); // Check if touched
form.markTouched('email'); // Mark as touched

// Reset form
form.reset(); // Reset to initial values
form.reset({ email: 'new@email.com' }); // Reset to new values

// Get state snapshot
const state = form.getStateSnapshot();
state.values; // Current values
state.errors; // Current errors
state.dirty; // Dirty state map
state.touched; // Touched state map
state.isSubmitting; // Submitting status
state.isValidating; // Validating status
state.submitCount; // Number of submissions
```

### Form Submission

```typescript
// Submit with validation
await form.submit(async (values) => {
  await api.post('/users', values);
});

// Skip validation
await form.submit(
  async (values) => {
    await api.post('/draft', values);
  },
  { validate: false },
);

// Handle validation errors
try {
  await form.submit(async (values) => {
    await api.post('/users', values);
  });
} catch (error) {
  if (error instanceof ValidationError) {
    console.log('Validation failed:', error.errors);
  } else {
    console.error('Submit failed:', error);
  }
}

// Abort submission
const controller = new AbortController();
form.submit(
  async (values) => {
    await api.post('/users', values);
  },
  { signal: controller.signal },
);

// Later...
controller.abort();
```

### Subscriptions

React to form state changes:

```typescript
// Subscribe to entire form
const unsubscribe = form.subscribe((state) => {
  console.log('Form state:', state);
  console.log('Values:', state.values);
  console.log('Errors:', state.errors);
  console.log('Is submitting:', state.isSubmitting);
});

// Subscribe to specific field
const unsubscribe = form.subscribeField('email', (field) => {
  console.log('Value:', field.value);
  console.log('Error:', field.error);
  console.log('Dirty:', field.dirty);
  console.log('Touched:', field.touched);
});

// Clean up
unsubscribe();
```

## Advanced Usage

### Multi-Step Forms

```typescript
const form = createForm<WizardForm>({
  /* ... */
});

// Step 1: Validate only current step fields
await form.validateAll({ fields: ['firstName', 'lastName'] });

// Step 2: Validate only touched fields
await form.validateAll({ onlyTouched: true });

// Final step: Validate all
await form.validateAll();
```

### Dynamic Forms

```typescript
// Add item to array
const items = form.getValue('items') || [];
form.setValue('items', [...items, { name: '', quantity: 0 }]);

// Update nested item
form.setValue('items[0].name', 'New Name');

// Remove item
const updatedItems = items.filter((_, i) => i !== indexToRemove);
form.setValue('items', updatedItems);
```

### Custom Value Extraction

```typescript
// Multi-select
const multiSelect = form.bind('selectedOptions', {
  valueExtractor: (e) =>
    Array.from(e.target.selectedOptions).map(opt => opt.value),
});

// File input
const fileInput = form.bind('avatar', {
  valueExtractor: (e) => e.target.files[0],
});

// Custom component
const customBinding = form.bind('customField', {
  valueExtractor: (customValue) => customValue,
});
<CustomInput onChange={customBinding.onChange} />
```

### Conditional Validation

```typescript
const form = createForm({
  fields: {
    country: {
      validators: (value) => (!value ? 'Required' : undefined),
    },
    zipCode: {
      validators: (value, values) => {
        // Only validate if country is USA
        if (values.country === 'USA' && !value) {
          return 'ZIP code required for USA';
        }
        return undefined;
      },
    },
  },
});
```

## Framework Integration

### React

```typescript
import { createForm } from '@vielzeug/formit';
import { useEffect, useState } from 'react';

function useForm<T>(formFactory: () => ReturnType<typeof createForm<T>>) {
  const [form] = useState(formFactory);
  const [state, setState] = useState(form.getStateSnapshot());

  useEffect(() => {
    const unsubscribe = form.subscribe(setState);
    return unsubscribe;
  }, [form]);

  return { form, state };
}

function MyForm() {
  const { form, state } = useForm(() => createForm({ /* ... */ }));

  return (
    <form onSubmit={async (e) => {
      e.preventDefault();
      await form.submit(async (values) => {
        await api.post('/data', values);
      });
    }}>
      <input {...form.bind('name')} />
      {state.isSubmitting && <Spinner />}
    </form>
  );
}
```

### Vue

```typescript
import { createForm } from '@vielzeug/formit';
import { reactive, onMounted, onUnmounted } from 'vue';

export function useForm<T>(config) {
  const form = createForm<T>(config);
  const state = reactive(form.getStateSnapshot());

  let unsubscribe: (() => void) | null = null;

  onMounted(() => {
    unsubscribe = form.subscribe((newState) => {
      Object.assign(state, newState);
    });
  });

  onUnmounted(() => {
    unsubscribe?.();
  });

  return { form, state };
}
```

### Svelte

```typescript
import { createForm } from '@vielzeug/formit';
import { writable } from 'svelte/store';
import { onMount, onDestroy } from 'svelte';

export function useForm<T>(config) {
  const form = createForm<T>(config);
  const state = writable(form.getStateSnapshot());

  let unsubscribe: (() => void) | null = null;

  onMount(() => {
    unsubscribe = form.subscribe((newState) => {
      state.set(newState);
    });
  });

  onDestroy(() => {
    unsubscribe?.();
  });

  return { form, state };
}
```

## API Reference

### Form Methods

| Method                            | Description                                                  |
| --------------------------------- | ------------------------------------------------------------ |
| `bind(path, config?)`             | Create binding object for input with value, onChange, onBlur |
| `getValue(path)`                  | Get value at path                                            |
| `getValues()`                     | Get all form values                                          |
| `setValue(path, value, options?)` | Set value at path                                            |
| `setValues(values, options?)`     | Set multiple values                                          |
| `getError(path)`                  | Get error for field                                          |
| `getErrors()`                     | Get all errors                                               |
| `setError(path, message?)`        | Set error for field                                          |
| `setErrors(errors)`               | Set multiple errors                                          |
| `resetErrors()`                   | Clear all errors                                             |
| `isDirty(path)`                   | Check if field is modified                                   |
| `isTouched(path)`                 | Check if field is touched                                    |
| `markTouched(path)`               | Mark field as touched                                        |
| `validateField(path, signal?)`    | Validate single field                                        |
| `validateAll(options?)`           | Validate all/specific fields                                 |
| `submit(onSubmit, options?)`      | Submit form with validation                                  |
| `reset(initialValues?)`           | Reset form state                                             |
| `getStateSnapshot()`              | Get immutable state snapshot                                 |
| `subscribe(listener)`             | Subscribe to form changes                                    |
| `subscribeField(path, listener)`  | Subscribe to field changes                                   |

### Types

```typescript
// Form configuration
interface FormInit<TForm> {
  initialValues?: TForm;
  fields?: Record<string, FieldConfig>;
  validate?: (values: TForm) => Errors | Promise<Errors>;
}

// Field configuration
interface FieldConfig<TValue, TForm> {
  initialValue?: TValue;
  validators?: Validator<TValue, TForm> | Array<Validator<TValue, TForm>>;
}

type Validator<TValue, TForm> = (
  value: TValue,
  values: TForm,
) => MaybePromise<string | Record<string, string> | undefined | null>;

// Bind configuration
interface BindConfig {
  valueExtractor?: (event: any) => any;
  markTouchedOnBlur?: boolean;
}

// Form state
interface FormState<TForm> {
  values: TForm;
  errors: Errors;
  dirty: Record<string, boolean>;
  touched: Record<string, boolean>;
  isSubmitting: boolean;
  isValidating: boolean;
  submitCount: number;
}

// Validation error
class ValidationError extends Error {
  errors: Errors;
  type: 'validation';
}
```

## Best Practices

### 1. Type Safety

```typescript
// Define interface for type safety
interface UserForm {
  name: string;
  email: string;
  age: number;
}

const form = createForm<UserForm>({
  initialValues: { name: '', email: '', age: 0 },
});

// TypeScript will catch errors
form.setValue('nam', 'test'); // ❌ Error: 'nam' doesn't exist
form.setValue('name', 123); // ❌ Error: type mismatch
```

### 2. Validation Strategy

```typescript
// ✅ Show errors only after touch
{form.isTouched('email') && form.getError('email') && (
  <ErrorMessage>{form.getError('email')}</ErrorMessage>
)}

// ✅ Validate on submit, not on every change
await form.submit(async (values) => {
  // Validation happens automatically before this
});
```

### 3. Performance Optimization

```typescript
// ✅ Validate only touched fields for better UX
await form.validateAll({ onlyTouched: true });

// ✅ Validate specific fields in multi-step forms
await form.validateAll({ fields: ['step1Field1', 'step1Field2'] });
```

### 4. Error Handling

```typescript
// ✅ Handle validation vs submission errors
try {
  await form.submit(async (values) => {
    await api.post('/users', values);
  });
} catch (error) {
  if (error instanceof ValidationError) {
    // Handle validation errors
    console.log(error.errors);
  } else {
    // Handle API/network errors
    showNotification('Failed to submit');
  }
}
```

## Comparison

| Feature                   | Formit         | Formik              | React Hook Form |
| ------------------------- | -------------- | ------------------- | --------------- |
| Framework Agnostic        | ✅             | ❌ React only       | ❌ React only   |
| TypeScript Support        | ✅ First-class | ✅ Good             | ✅ Good         |
| Nested Paths              | ✅ Native      | ✅ Via dot notation | ✅ Via register |
| Async Validation          | ✅ Built-in    | ✅ Built-in         | ✅ Via resolver |
| Bundle Size               | **~2KB**       | ~13KB               | ~9KB            |
| Dependencies              | 0              | React               | React           |
| Field-Level Subscriptions | ✅             | ⚠️ Limited          | ✅              |
| Granular Validation       | ✅             | ❌                  | ⚠️ Limited      |
| Custom Bind Config        | ✅             | ❌                  | ❌              |

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu)

## Links

- [GitHub Repository](https://github.com/helmuthdu/vielzeug)
- [Documentation](https://vielzeug.dev)
- [NPM Package](https://www.npmjs.com/package/@vielzeug/formit)
- [Issue Tracker](https://github.com/helmuthdu/vielzeug/issues)

---

Part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) ecosystem - A collection of type-safe utilities for modern web development.
