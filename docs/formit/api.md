# API Reference

Complete API documentation for Formit.

## Table of Contents

[[toc]]

## `createForm(init?)`

Creates a new form instance.

### Parameters

- `init?: FormInit` - Optional configuration object

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

### Returns

A form instance with the following methods:

## Form Instance Methods

### `get(name)`

Get a field value. Returns array if multiple values exist for the same name.

```typescript
get(name: string): any
```

**Examples:**

```typescript
form.get('email'); // string | File | null
form.get('tags'); // string[] (if multiple values)
form.get('user.profile.name'); // nested access
```

---

### `set(name, value, options?)`

Set a single field value.

```typescript
set(name: string, value: any, options?: {
  markDirty?: boolean;    // default: true
  markTouched?: boolean;  // default: false
}): void
```

**Examples:**

```typescript
form.set('email', 'user@example.com');
form.set('age', 25, { markDirty: false });
form.set('tags', ['js', 'ts']);
form.set('avatar', fileInput.files[0]);
```

---

### `set(entries, options?)`

Set multiple fields at once.

```typescript
set(entries: Record<string, any> | FormData, options?: {
  replace?: boolean;   // default: false
  markDirty?: boolean; // default: false
}): void
```

**Examples:**

```typescript
// Merge values
form.set({ email: 'user@example.com', name: 'Alice' });

// Replace all values
form.set({ email: 'new@example.com' }, { replace: true });

// Copy from another FormData
form.set(otherFormData);
```

---

### `values()`

Get all form values as a plain object.

```typescript
values(): Record<string, any>
```

**Example:**

```typescript
const allValues = form.values();
// { email: 'user@example.com', name: 'Alice', ... }
```

---

### `data()`

Get the native FormData instance.

```typescript
data(): FormData
```

**Example:**

```typescript
const formData = form.data();
await fetch('/api/submit', { method: 'POST', body: formData });
```

---

### `clone()`

Clone the FormData for safe external mutation.

```typescript
clone(): FormData
```

---

### `error(name?)`

Get error(s).

```typescript
error(): Map<string, string>         // Get all errors
error(name: string): string | undefined  // Get specific error
```

**Examples:**

```typescript
const emailError = form.error('email');
const allErrors = form.error();

// Iterate over all errors
for (const [field, message] of allErrors) {
  console.log(`${field}: ${message}`);
}
```

---

### `error(name, message)`

Set or clear a single error.

```typescript
error(name: string, message: string): void
```

**Examples:**

```typescript
// Set error
form.error('email', 'This email is already taken');

// Clear error
form.error('email', '');
```

---

### `errors(nextErrors)`

Set multiple errors at once.

```typescript
errors(nextErrors: Map<string, string> | Record<string, string>): void
```

**Examples:**

```typescript
// Set from object
form.errors({ email: 'Invalid', password: 'Too short' });

// Set from Map
form.errors(new Map([['email', 'Invalid']]));

// Clear all errors
form.errors({});
form.errors(new Map());
```

---

### `dirty(name)`

Check if a field has been modified from its initial value.

```typescript
dirty(name: string): boolean
```

**Example:**

```typescript
if (form.dirty('email')) {
  console.log('Email has been changed');
}
```

---

### `touch(name)`

Check if a field has been touched (user interacted with it).

```typescript
touch(name: string): boolean
```

**Example:**

```typescript
if (form.touch('email')) {
  console.log('User has focused on email field');
}
```

---

### `touch(name, mark)`

Mark a field as touched.

```typescript
touch(name: string, mark: true): void
```

**Example:**

```typescript
form.touch('email', true);
```

---

### `validate(name)`

Validate a specific field.

```typescript
validate(name: string): Promise<string | undefined>
```

**Example:**

```typescript
const error = await form.validate('email');
if (error) {
  console.log('Email validation failed:', error);
}
```

---

### `validate(options?)`

Validate multiple fields or the entire form.

```typescript
validate(options?: {
  signal?: AbortSignal;
  onlyTouched?: boolean;
  fields?: string[];
}): Promise<Map<string, string>>
```

**Examples:**

```typescript
// Validate all fields
const errors = await form.validate();

// Validate only touched fields
const errors = await form.validate({ onlyTouched: true });

// Validate specific fields
const errors = await form.validate({ fields: ['email', 'password'] });

// With abort signal
const controller = new AbortController();
const errors = await form.validate({ signal: controller.signal });
```

---

### `submit(onSubmit, options?)`

Submit the form with automatic validation.

```typescript
submit(
  onSubmit: (formData: FormData) => any | Promise<any>,
  options?: {
    signal?: AbortSignal;
    validate?: boolean; // default: true
  }
): Promise<any>
```

**Behavior:**

1. Validates form (unless `validate: false`)
2. If validation fails, throws `ValidationError`
3. If validation passes, calls `onSubmit` with FormData
4. Returns the result of `onSubmit`

**Examples:**

```typescript
// Basic submission
const result = await form.submit(async (formData) => {
  const response = await fetch('/api/submit', {
    method: 'POST',
    body: formData,
  });
  return response.json();
});

// Skip validation
await form.submit(onSubmit, { validate: false });

// With abort signal
const controller = new AbortController();
await form.submit(onSubmit, { signal: controller.signal });

// Handle validation errors
try {
  await form.submit(onSubmit);
} catch (error) {
  if (error instanceof ValidationError) {
    console.log('Validation failed:', error.errors);
  }
}
```

---

### `reset(newFormData?)`

Reset the form to initial values or new values.

```typescript
reset(newFormData?: FormData | Record<string, any>): void
```

**Examples:**

```typescript
// Reset to initial values
form.reset();

// Reset to new values
form.reset({ email: '', password: '' });

// Reset from FormData
form.reset(otherFormData);
```

---

### `subscribe(listener)`

Subscribe to form state changes.

```typescript
subscribe(listener: (state: FormState) => void): () => void
```

**Returns:** Unsubscribe function

**Example:**

```typescript
const unsubscribe = form.subscribe((state) => {
  console.log('Form state:', state);
  console.log('Errors:', state.errors);
  console.log('Dirty fields:', state.dirty);
  console.log('Touched fields:', state.touched);
  console.log('Is submitting:', state.isSubmitting);
  console.log('Is validating:', state.isValidating);
  console.log('Submit count:', state.submitCount);
});

// Later: cleanup
unsubscribe();
```

---

### `subscribeField(name, listener)`

Subscribe to specific field changes.

```typescript
subscribeField(
  name: string,
  listener: (payload: {
    value: any;
    error?: string;
    touched: boolean;
    dirty: boolean;
  }) => void
): () => void
```

**Returns:** Unsubscribe function

**Example:**

```typescript
const unsubscribe = form.subscribeField('email', ({ value, error, touched, dirty }) => {
  console.log('Email:', value);
  console.log('Error:', error);
  console.log('Touched:', touched);
  console.log('Dirty:', dirty);
});

// Later: cleanup
unsubscribe();
```

---

### `bind(name, config?)`

Create a binding object for input elements.

```typescript
bind(name: string, config?: {
  valueExtractor?: (event: any) => any;
  markTouchedOnBlur?: boolean; // default: true
}): {
  name: string;
  value: any;
  onChange: (event: any) => void;
  onBlur: () => void;
  set: (value: any | ((prev: any) => any)) => void;
}
```

**Examples:**

```typescript
// Simple input binding
<input {...form.bind('email')} />

// Custom value extractor
const binding = form.bind('category', {
  valueExtractor: (e) => e.selectedOption
});

// Disable touch on blur
<input {...form.bind('name', { markTouchedOnBlur: false })} />

// Programmatic updates
const emailBinding = form.bind('email');
emailBinding.set('new@example.com');
emailBinding.set((prev) => prev + '@domain.com');
```

---

### `snapshot()`

Get an immutable snapshot of the current form state.

```typescript
snapshot(): FormState
```

**Returns:**

```typescript
type FormState = {
  errors: Map<string, string>;
  touched: Set<string>;
  dirty: Set<string>;
  isValidating: boolean;
  isSubmitting: boolean;
  submitCount: number;
};
```

**Example:**

```typescript
const state = form.snapshot();
console.log(state.errors.get('email'));
console.log(state.dirty.has('email'));
console.log(state.touched.has('email'));
```

## Types

### `FormInit`

```typescript
type FormInit = {
  fields?: Record<string, any>;
  validate?: FormValidator;
};
```

### `FieldConfig`

```typescript
type FieldConfig = {
  value?: any;
  validators?: FieldValidator | FieldValidator[];
};
```

### `FieldValidator`

```typescript
type FieldValidator = (value: FormDataEntryValue) => string | undefined | null | Promise<string | undefined | null>;
```

### `FormValidator`

```typescript
type FormValidator = (
  formData: FormData,
) => Map<string, string> | undefined | null | Promise<Map<string, string> | undefined | null>;
```

### `FormState`

```typescript
type FormState = {
  errors: Map<string, string>;
  touched: Set<string>;
  dirty: Set<string>;
  isValidating: boolean;
  isSubmitting: boolean;
  submitCount: number;
};
```

### `ValidationError`

```typescript
class ValidationError extends Error {
  readonly type: 'validation';
  readonly errors: Map<string, string>;
}
```

**Example:**

```typescript
try {
  await form.submit(onSubmit);
} catch (error) {
  if (error instanceof ValidationError) {
    for (const [field, message] of error.errors) {
      console.log(`${field}: ${message}`);
    }
  }
}
```

## Complete Example

```typescript
import { createForm, ValidationError } from '@vielzeug/formit';

const form = createForm({
  fields: {
    email: {
      value: '',
      validators: [(v) => !v && 'Email is required', (v) => v && !String(v).includes('@') && 'Invalid email'],
    },
    password: {
      value: '',
      validators: (v) => String(v).length < 8 && 'Min 8 characters',
    },
    confirmPassword: '',
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

// Subscribe to changes
const unsubscribe = form.subscribe((state) => {
  updateUI(state);
});

// Handle submission
try {
  const result = await form.submit(async (formData) => {
    const response = await fetch('/api/register', {
      method: 'POST',
      body: formData,
    });
    return response.json();
  });

  console.log('Success:', result);
} catch (error) {
  if (error instanceof ValidationError) {
    console.log('Validation errors:', error.errors);
  } else {
    console.error('Submit error:', error);
  }
}

// Cleanup
unsubscribe();
```
