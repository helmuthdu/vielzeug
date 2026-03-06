---
title: Formit — API Reference
description: Complete API reference for Formit form management.
---

# Formit API Reference

[[toc]]

## `createForm(init?)`

Creates a new form instance.

### Parameters

- `init?: FormInit` – Optional configuration object

```typescript
type FormInit<TValues extends Record<string, unknown> = Record<string, unknown>> = {
  /** Initial field values */
  values?: TValues;
  /** Per-field validators, keyed by field name */
  rules?: Record<string, FieldValidator | FieldValidator[]>;
  /** Form-level validator for cross-field validation */
  validate?: FormValidator;
};

type FieldValidator = (value: unknown) => string | undefined | null | Promise<string | undefined | null>;

type FormValidator = (
  values: Record<string, unknown>,
) => Record<string, string> | undefined | null | Promise<Record<string, string> | undefined | null>;
```

### Returns

A form instance with the following methods:

## Form Instance Methods

### `get(name)`

Get a field value. Returns the typed value as stored — no string coercion.

```typescript
get<V = unknown>(name: string): V
```

**Examples:**

```typescript
form.get('email');          // string
form.get('age');            // number (if stored as number)
form.get('active');         // boolean (if stored as boolean)
form.get('user.name');      // dot-notation for manual nesting
```

---

### `set(name, value, options?)`

Set a single field value.

```typescript
set(name: string, value: unknown, options?: SetOptions): void

type SetOptions = {
  setDirty?: boolean;    // default: true
  setTouched?: boolean;  // default: false
};
```

**Examples:**

```typescript
form.set('email', 'user@example.com');
form.set('age', 25, { setDirty: false });
form.set('tags', ['js', 'ts']);
form.set('avatar', fileInput.files[0]);
```

---

### `patch(entries, options?)`

Set multiple fields at once.

```typescript
patch(entries: Record<string, unknown>, options?: PatchOptions): void

type PatchOptions = {
  replace?: boolean;  // default: false — replace all values instead of merging
  setDirty?: boolean; // default: false — track dirty state for patched fields
};
```

**Examples:**

```typescript
// Merge values
form.patch({ email: 'user@example.com', name: 'Alice' });

// Replace all values (resets dirty/initial tracking)
form.patch({ email: 'new@example.com' }, { replace: true });

// Patch and mark dirty
form.patch({ email: 'user@example.com' }, { setDirty: true });
```

---

### `values()`

Get all form values as a plain object.

```typescript
values(): Record<string, unknown>
```

**Example:**

```typescript
const allValues = form.values();
// { email: 'user@example.com', name: 'Alice', ... }
```

---

### `dispose()`

Clean up all subscribers. Call this when the form instance is no longer needed.

```typescript
dispose(): void
```

**Example:**

```typescript
// In a framework cleanup/unmount callback
form.dispose();
```

---

### `getError(name)`

Get the error for a specific field.

```typescript
getError(name: string): string | undefined
```

**Example:**

```typescript
const emailError = form.getError('email');
if (emailError) {
  console.log('Email error:', emailError);
}
```

---

### `getErrors()`

Get all current errors as a plain object.

```typescript
getErrors(): Record<string, string>
```

**Example:**

```typescript
const allErrors = form.getErrors();

// Iterate over all errors
for (const [field, message] of Object.entries(allErrors)) {
  console.log(`${field}: ${message}`);
}
```

---

### `setError(name, message?)`

Set or clear a single field error. Omitting `message` (or passing `undefined`) clears the error.

```typescript
setError(name: string, message?: string): void
```

**Examples:**

```typescript
// Set error
form.setError('email', 'This email is already taken');

// Clear error
form.setError('email');
```

---

### `setErrors(nextErrors)`

Replace all errors at once.

```typescript
setErrors(nextErrors: Record<string, string>): void
```

**Examples:**

```typescript
// Set from object
form.setErrors({ email: 'Invalid', password: 'Too short' });

// Clear all errors
form.setErrors({});
```

---

### `isDirty(name)`

Check if a field has been modified from its initial value.

```typescript
isDirty(name: string): boolean
```

**Example:**

```typescript
if (form.isDirty('email')) {
  console.log('Email has been changed');
}
```

---

### `isTouched(name)`

Check if a field has been interacted with by the user.

```typescript
isTouched(name: string): boolean
```

**Example:**

```typescript
if (form.isTouched('email')) {
  console.log('User has interacted with the email field');
}
```

---

### `setTouched(name)`

Mark a field as touched.

```typescript
setTouched(name: string): void
```

**Example:**

```typescript
form.setTouched('email');
```

---

### `validate(name, signal?)`

Validate a specific field. Returns the error message, or `undefined` if valid.

```typescript
validate(name: string, signal?: AbortSignal): Promise<string | undefined>
```

**Example:**

```typescript
const error = await form.validate('email');
if (error) {
  console.log('Email validation failed:', error);
}

// With abort signal
const controller = new AbortController();
const error = await form.validate('email', controller.signal);
```

---

### `validateAll(options?)`

Validate multiple fields or the entire form.

```typescript
validateAll(options?: ValidateOptions): Promise<Record<string, string>>

type ValidateOptions = {
  signal?: AbortSignal;
  onlyTouched?: boolean;
  fields?: string[];
};
```

**Behavior:**

1. Collects all field names from `rules` and the current value store
2. Runs per-field validators for each matching field
3. Runs the form-level `validate` function from `FormInit` (if provided), merging any returned errors
4. If the form-level validator **throws**, the error message is stored under the empty-string key `''`
5. `fields` takes priority over `onlyTouched` — if both are provided, only the explicitly listed fields are validated
6. Replaces all errors atomically via `setErrors`; returns the full errors map

**Examples:**

```typescript
// Validate all fields
const errors = await form.validateAll();

// Validate only touched fields
const errors = await form.validateAll({ onlyTouched: true });

// Validate specific fields
const errors = await form.validateAll({ fields: ['email', 'password'] });

// With abort signal
const controller = new AbortController();
const errors = await form.validateAll({ signal: controller.signal });
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
2. Marks all fields as touched (validation errors become visible in the UI)
3. If validation fails, throws `ValidationError`
4. If validation passes, calls `onSubmit` with `FormData` built from current values
5. Returns the result of `onSubmit`

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
    console.log('Validation failed:', error.errors); // Record<string, string>
  }
}
```

---

### `reset(newValues?)`

Reset the form to initial values or new values.

```typescript
reset(newValues?: Record<string, unknown>): void
```

**Examples:**

```typescript
// Reset to initial values
form.reset();

// Reset to new values
form.reset({ email: '', password: '' });
```

---

### `subscribe(listener)`

Subscribe to form state changes. Calls the listener immediately with the current state.

```typescript
subscribe(listener: (state: FormState) => void): () => void
```

**Returns:** Unsubscribe function

**Example:**

```typescript
const unsubscribe = form.subscribe((state) => {
  console.log('Form state:', state);
  console.log('Errors:', state.errors);          // Record<string, string>
  console.log('Dirty fields:', state.dirty);     // Set<string>
  console.log('Touched fields:', state.touched); // Set<string>
  console.log('Is valid:', state.isValid);
  console.log('Is dirty:', state.isDirty);
  console.log('Is submitting:', state.isSubmitting);
  console.log('Submit count:', state.submitCount);
});

// Later: cleanup
unsubscribe();
```

---

### `subscribeField(name, listener)`

Subscribe to a specific field's changes. Only fires when that field changes. Calls the listener immediately with the current field state.

```typescript
subscribeField<V = unknown>(
  name: string,
  listener: (payload: {
    value: V;
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
bind(name: string, config?: BindConfig): {
  name: string;
  value: unknown;
  onChange: (event: unknown) => void;
  onBlur: () => void;
  set: (value: unknown | ((prev: unknown) => unknown)) => void;
}

type BindConfig = {
  valueExtractor?: (event: unknown) => unknown;
  markTouchedOnBlur?: boolean; // default: true
};
```

**Behavior:**

- `onChange` extracts the value via `valueExtractor` (defaults to `event.target.value`), then calls `set` with `{ setDirty: true, setTouched: true }` — marking the field as both dirty and touched
- `onBlur` marks the field as touched (unless `markTouchedOnBlur: false`)
- `set` accepts a plain value or a functional updater `(prev) => next`; it also marks the field dirty and touched
- `value` is a live getter that reads directly from the form store

**Examples:**

```typescript
// Simple input binding
<input {...form.bind('email')} />

// Custom value extractor
const binding = form.bind('category', {
  valueExtractor: (e) => e.selectedOption,
});

// Disable touch on blur
<input {...form.bind('name', { markTouchedOnBlur: false })} />

// Programmatic updates via the set helper
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
  errors: Record<string, string>;
  touched: Set<string>;
  dirty: Set<string>;
  isValid: boolean;      // true if errors is empty
  isDirty: boolean;      // true if any field is dirty
  isTouched: boolean;    // true if any field is touched
  isValidating: boolean;
  isSubmitting: boolean;
  submitCount: number;
};
```

**Example:**

```typescript
const state = form.snapshot();
console.log(state.errors['email']);
console.log(state.isValid);
console.log(state.dirty.has('email'));
console.log(state.touched.has('email'));
```

## Types

### `FormInit`

```typescript
type FormInit<TValues extends Record<string, unknown> = Record<string, unknown>> = {
  values?: TValues;
  rules?: Record<string, FieldValidator | FieldValidator[]>;
  validate?: FormValidator;
};
```

### `FieldValidator`

```typescript
type FieldValidator = (value: unknown) => string | undefined | null | Promise<string | undefined | null>;
```

### `FormValidator`

```typescript
type FormValidator = (
  values: Record<string, unknown>,
) => Record<string, string> | undefined | null | Promise<Record<string, string> | undefined | null>;
```

### `FormState`

```typescript
type FormState = {
  errors: Record<string, string>;
  touched: Set<string>;
  dirty: Set<string>;
  isValid: boolean;
  isDirty: boolean;
  isTouched: boolean;
  isValidating: boolean;
  isSubmitting: boolean;
  submitCount: number;
};
```

### `SetOptions`

```typescript
type SetOptions = {
  setDirty?: boolean;    // default: true
  setTouched?: boolean;  // default: false
};
```

### `PatchOptions`

```typescript
type PatchOptions = {
  replace?: boolean;  // default: false
  setDirty?: boolean; // default: false
};
```

### `ValidateOptions`

```typescript
type ValidateOptions = {
  signal?: AbortSignal;
  onlyTouched?: boolean;
  fields?: string[];
};
```

### `BindConfig`

```typescript
type BindConfig = {
  valueExtractor?: (event: unknown) => unknown;
  markTouchedOnBlur?: boolean; // default: true
};
```

### `ValidationError`

```typescript
class ValidationError extends Error {
  readonly type: 'validation';
  readonly errors: Record<string, string>;
}
```
