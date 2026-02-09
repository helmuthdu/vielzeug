# Formit API Reference

Complete API documentation for @vielzeug/formit.

## Table of Contents

- [createForm()](#createform)
- [Form Methods](#form-methods)
- [Types](#types)

## createForm()

Creates a new form instance with the specified configuration.

### Signature

```ts
function createForm<TForm extends Record<string, any>>(init?: FormInit<TForm>): FormInstance<TForm>;
```

### Parameters

- `init?: FormInit<TForm>` - Form configuration object

```ts
type FormInit<TForm> = {
  initialValues?: TForm;
  fields?: Partial<{
    [K in keyof TForm & string]: FieldConfig<TForm[K], TForm>;
  }>;
  validate?: FormValidator<TForm>;
};
```

### Returns

A form instance with all the methods described below.

### Example

```ts
import { createForm } from '@vielzeug/formit';

const form = createForm({
  initialValues: {
    name: '',
    email: '',
    age: 0,
  },
  fields: {
    email: {
      validators: (value) => {
        if (!value.includes('@')) return 'Invalid email';
      },
    },
  },
  validate: (values) => {
    if (values.age < 18) {
      return { age: 'Must be at least 18 years old' };
    }
  },
});
```

---

## Form Methods

### Value Management

#### `getValues()`

Get all form values.

**Signature:**

```ts
getValues(): TForm
```

**Returns:** Complete form values object

**Example:**

```ts
const values = form.getValues();
console.log(values); // { name: 'John', email: 'john@example.com', age: 25 }
```

#### `getValue(path)`

Get a specific field value by path.

**Signature:**

```ts
getValue(path: Path): any
```

**Parameters:**

- `path: Path` - Field path (string with dot/bracket notation or array)

**Returns:** The value at the specified path

**Example:**

```ts
const email = form.getValue('email');
const city = form.getValue('user.address.city');
const firstItem = form.getValue('items[0]');
const deepValue = form.getValue(['user', 'address', 'city']);
```

#### `setValue(path, value, options?)`

Set a specific field value by path.

**Signature:**

```ts
setValue(
  path: Path,
  value: any,
  options?: {
    markDirty?: boolean;
    markTouched?: boolean;
  }
): any
```

**Parameters:**

- `path: Path` - Field path
- `value: any` - New value to set
- `options?: object` - Optional configuration
  - `markDirty?: boolean` - Mark field as dirty (default: `true`)
  - `markTouched?: boolean` - Mark field as touched (default: `false`)

**Returns:** The value that was set

**Example:**

```ts
// Simple set
form.setValue('email', 'john@example.com');

// Set without marking as dirty
form.setValue('email', 'john@example.com', { markDirty: false });

// Set and mark as touched
form.setValue('email', 'john@example.com', { markTouched: true });

// Nested paths
form.setValue('user.address.city', 'New York');
form.setValue(['items', 0, 'name'], 'First Item');
```

#### `setValues(nextValues, options?)`

Set multiple form values at once.

**Signature:**

```ts
setValues(
  nextValues: Partial<TForm>,
  options?: {
    replace?: boolean;
    markAllDirty?: boolean;
  }
): void
```

**Parameters:**

- `nextValues: Partial<TForm>` - Object with values to update
- `options?: object` - Optional configuration
  - `replace?: boolean` - Replace all values (default: `false` - merge)
  - `markAllDirty?: boolean` - Mark all updated fields as dirty (default: `false`)

**Example:**

```ts
// Merge values
form.setValues({ name: 'John', email: 'john@example.com' });

// Replace all values
form.setValues({ name: 'Jane' }, { replace: true });

// Mark all as dirty
form.setValues({ email: 'new@example.com' }, { markAllDirty: true });
```

### Error Management

#### `getErrors()`

Get all form errors.

**Signature:**

```ts
getErrors(): Errors
```

**Returns:** Object mapping field paths to error messages

**Example:**

```ts
const errors = form.getErrors();
console.log(errors); // { email: 'Invalid email', age: 'Must be 18+' }
```

#### `getError(path)`

Get a specific field error by path.

**Signature:**

```ts
getError(path: Path): string | undefined
```

**Parameters:**

- `path: Path` - Field path

**Returns:** Error message string or `undefined` if no error

**Example:**

```ts
const emailError = form.getError('email');
if (emailError) {
  console.log(emailError); // 'Invalid email'
}
```

#### `setError(path, message?)`

Set or clear a specific field error.

**Signature:**

```ts
setError(path: Path, message?: string): void
```

**Parameters:**

- `path: Path` - Field path
- `message?: string` - Error message (omit to clear error)

**Example:**

```ts
// Set error
form.setError('email', 'This email is already taken');

// Clear error
form.setError('email');
```

#### `resetErrors()`

Clear all form errors.

**Signature:**

```ts
resetErrors(): void
```

**Example:**

```ts
form.resetErrors();
console.log(form.getErrors()); // {}
```

### Touch Management

#### `markTouched(path)`

Mark a field as touched.

**Signature:**

```ts
markTouched(path: Path): void
```

**Parameters:**

- `path: Path` - Field path

**Example:**

```ts
form.markTouched('email');

const state = form.getStateSnapshot();
console.log(state.touched.email); // true
```

### Validation

#### `validateField(path, signal?)`

Validate a single field.

**Signature:**

```ts
validateField(path: Path, signal?: AbortSignal): Promise<string | undefined>
```

**Parameters:**

- `path: Path` - Field path
- `signal?: AbortSignal` - Optional abort signal for cancellation

**Returns:** Promise resolving to error message or `undefined`

**Example:**

```ts
const error = await form.validateField('email');
if (error) {
  console.log('Email validation failed:', error);
}

// With abort signal
const controller = new AbortController();
form.validateField('email', controller.signal);
controller.abort(); // Cancel validation
```

#### `validateAll(signal?)`

Validate all fields and run form-level validators.

**Signature:**

```ts
validateAll(signal?: AbortSignal): Promise<Errors>
```

**Parameters:**

- `signal?: AbortSignal` - Optional abort signal for cancellation

**Returns:** Promise resolving to all validation errors

**Example:**

```ts
const errors = await form.validateAll();
if (Object.keys(errors).length > 0) {
  console.log('Form has errors:', errors);
}
```

### Form Submission

#### `submit(onSubmit, options?)`

Submit the form with automatic validation.

**Signature:**

```ts
submit(
  onSubmit: (values: TForm) => MaybePromise<any>,
  options?: {
    signal?: AbortSignal;
    validate?: boolean;
  }
): Promise<any>
```

**Parameters:**

- `onSubmit: (values: TForm) => MaybePromise<any>` - Submit handler function
- `options?: object` - Optional configuration
  - `signal?: AbortSignal` - Abort signal for cancellation
  - `validate?: boolean` - Run validation before submit (default: `true`)

**Returns:** Promise resolving to the result of `onSubmit`

**Rejects:**

- With `{ errors, type: 'validation' }` if validation fails
- With the error thrown by `onSubmit` if submission fails

**Example:**

```ts
// Basic submit
form.submit(async (values) => {
  const response = await fetch('/api/users', {
    method: 'POST',
    body: JSON.stringify(values),
  });
  return response.json();
});

// Without validation
form.submit(
  async (values) => {
    await saveLocally(values);
  },
  { validate: false },
);

// With abort signal
const controller = new AbortController();
form.submit(
  async (values) => {
    await api.post('/users', values);
  },
  { signal: controller.signal },
);

// Error handling
try {
  const result = await form.submit(async (values) => {
    return await api.post('/users', values);
  });
  console.log('Success:', result);
} catch (error) {
  if (error.type === 'validation') {
    console.log('Validation errors:', error.errors);
  } else {
    console.error('Submission error:', error);
  }
}
```

### Subscriptions

#### `subscribe(listener)`

Subscribe to form state changes.

**Signature:**

```ts
subscribe(listener: (state: FormState<TForm>) => void): () => void
```

**Parameters:**

- `listener: (state: FormState<TForm>) => void` - Callback function receiving form state

**Returns:** Unsubscribe function

**Example:**

```ts
const unsubscribe = form.subscribe((state) => {
  console.log('Values:', state.values);
  console.log('Errors:', state.errors);
  console.log('Is submitting:', state.isSubmitting);
});

// Later, unsubscribe
unsubscribe();
```

#### `subscribeField(path, listener)`

Subscribe to a specific field's changes.

**Signature:**

```ts
subscribeField(
  path: Path,
  listener: (payload: {
    value: any;
    error?: string;
    touched: boolean;
    dirty: boolean;
  }) => void
): () => void
```

**Parameters:**

- `path: Path` - Field path to subscribe to
- `listener: Function` - Callback receiving field state

**Returns:** Unsubscribe function

**Example:**

```ts
const unsubscribe = form.subscribeField('email', (field) => {
  console.log('Email value:', field.value);
  console.log('Email error:', field.error);
  console.log('Email touched:', field.touched);
  console.log('Email dirty:', field.dirty);
});

// Later
unsubscribe();
```

### Field Binding

#### `bind(path)`

Create a binding object for a field that can be used with inputs.

**Signature:**

```ts
bind(path: Path): {
  name: string;
  value: any;
  onChange: (event: any) => void;
  set: (value: any | ((prev: any) => any)) => void;
}
```

**Parameters:**

- `path: Path` - Field path

**Returns:** Binding object with:

- `name: string` - Field name (dot notation)
- `value: any` - Current field value (getter)
- `value: any` - Value setter (setter)
- `onChange: (event) => void` - Change handler for inputs
- `set: (value) => void` - Value setter function (supports updater functions)

**Example:**

```ts
// Spread into input
<input {...form.bind('email')} />

// Equivalent to:
<input
  name="email"
  value={form.getValue('email')}
  onChange={(e) => form.setValue('email', e.target.value, {
    markDirty: true,
    markTouched: true
  })}
/>

// Use set function directly
const emailBinding = form.bind('email');
emailBinding.set('new@example.com');

// With updater function
emailBinding.set((prev) => prev.toLowerCase());
```

### State Snapshot

#### `getStateSnapshot()`

Get a snapshot of the current form state.

**Signature:**

```ts
getStateSnapshot(): FormState<TForm>
```

**Returns:** Complete form state object

**Example:**

```ts
const state = form.getStateSnapshot();
console.log(state);
/*
{
  values: { name: 'John', email: 'john@example.com' },
  errors: { email: 'Invalid email' },
  touched: { email: true },
  dirty: { name: true },
  isValidating: false,
  isSubmitting: false,
  submitCount: 2
}
*/
```

---

## Types

### `Path`

Field path type supporting multiple formats.

```ts
type Path = string | Array<string | number>;
```

**Examples:**

```ts
'email'; // Simple field
'user.name'; // Dot notation
'user.address.city'; // Deep nesting
'items[0]'; // Bracket notation
'items[0].name'[('user', 'name')][('items', 0, 'name')]; // Mixed notation // Array notation // Array with indices
```

### `Errors`

Error object mapping field paths to error messages.

```ts
type Errors = Partial<Record<string, string>>;
```

**Example:**

```ts
const errors: Errors = {
  email: 'Invalid email',
  'user.age': 'Must be at least 18',
  'items[0].name': 'Name is required',
};
```

### `FieldValidator<TValue, TForm>`

Validator function for a specific field.

```ts
type FieldValidator<TValue, TForm> =
  | ((value: TValue, values: TForm) => MaybePromise<string | undefined | null>)
  | ((value: TValue, values: TForm) => MaybePromise<Record<string, string> | undefined | null>);
```

**Returns:**

- `string` - Error message
- `Record<string, string>` - Multiple errors for related fields
- `undefined | null` - No error

**Example:**

```ts
// Simple string error
const emailValidator: FieldValidator<string, FormData> = (value) => {
  if (!value.includes('@')) return 'Invalid email';
};

// Multiple errors
const passwordValidator: FieldValidator<string, FormData> = (value) => {
  if (value.length < 8) {
    return { password: 'Too short', 'password-confirm': 'Must match' };
  }
};

// Async validator
const usernameValidator: FieldValidator<string, FormData> = async (value) => {
  const exists = await checkUsername(value);
  if (exists) return 'Username taken';
};

// With access to all form values
const confirmPasswordValidator: FieldValidator<string, FormData> = (value, values) => {
  if (value !== values.password) return 'Passwords do not match';
};
```

### `FormValidator<TForm>`

Form-level validator function.

```ts
type FormValidator<TForm> = (values: TForm) => MaybePromise<Errors | undefined | null>;
```

**Example:**

```ts
const formValidator: FormValidator<FormData> = (values) => {
  const errors: Errors = {};

  if (values.password === values.email) {
    errors.password = 'Password cannot be same as email';
  }

  if (values.age < 18 && values.acceptTerms) {
    errors.acceptTerms = 'Minors cannot accept terms';
  }

  return errors;
};
```

### `FieldConfig<TValue, TForm>`

Configuration for a specific field.

```ts
type FieldConfig<TValue, TForm> = {
  initialValue?: TValue;
  validators?: FieldValidator<TValue, TForm> | Array<FieldValidator<TValue, TForm>>;
};
```

**Example:**

```ts
const emailConfig: FieldConfig<string, FormData> = {
  initialValue: '',
  validators: [
    (value) => {
      if (!value) return 'Email is required';
    },
    (value) => {
      if (!value.includes('@')) return 'Invalid email';
    },
  ],
};
```

### `FormInit<TForm>`

Initial configuration for creating a form.

```ts
type FormInit<TForm> = {
  initialValues?: TForm;
  fields?: Partial<{
    [K in keyof TForm & string]: FieldConfig<TForm[K], TForm>;
  }>;
  validate?: FormValidator<TForm>;
};
```

### `FormState<TForm>`

Complete form state object.

```ts
type FormState<TForm> = {
  values: TForm;
  errors: Errors;
  touched: Record<string, boolean>;
  dirty: Record<string, boolean>;
  isValidating: boolean;
  isSubmitting: boolean;
  submitCount: number;
};
```

**Example:**

```ts
const state: FormState<FormData> = {
  values: { name: 'John', email: 'john@example.com' },
  errors: { email: 'Already exists' },
  touched: { email: true, name: false },
  dirty: { name: true, email: true },
  isValidating: false,
  isSubmitting: true,
  submitCount: 1,
};
```

---

## Advanced Patterns

### Conditional Validation

```ts
const form = createForm({
  fields: {
    country: {},
    zipCode: {
      validators: (value, values) => {
        if (values.country === 'US' && !/^\d{5}$/.test(value)) {
          return 'Invalid US ZIP code';
        }
        if (values.country === 'UK' && !/^[A-Z]{1,2}\d{1,2}/.test(value)) {
          return 'Invalid UK postcode';
        }
      },
    },
  },
});
```

### Debounced Validation

```ts
import { debounce } from '@vielzeug/toolkit';

const checkUsername = debounce(async (username: string) => {
  const response = await fetch(`/api/check-username?username=${username}`);
  return response.json();
}, 500);

const form = createForm({
  fields: {
    username: {
      validators: async (value) => {
        const { exists } = await checkUsername(value);
        if (exists) return 'Username is taken';
      },
    },
  },
});
```

### Dynamic Field Addition

```ts
// Start with initial fields
const form = createForm({
  initialValues: { name: '' },
});

// Dynamically add fields
form.setValue('email', '');
form.setValue('phone', '');

// Validate dynamically added fields
form.validateField('email');
```

### Cross-Field Validation

```ts
const form = createForm({
  validate: (values) => {
    const errors: Errors = {};

    // Password confirmation
    if (values.password !== values.confirmPassword) {
      errors.confirmPassword = 'Passwords must match';
    }

    // Date range
    if (new Date(values.startDate) > new Date(values.endDate)) {
      errors.endDate = 'End date must be after start date';
    }

    return errors;
  },
});
```

### Wizard Forms

```ts
const form = createForm({
  initialValues: {
    step1: { name: '', email: '' },
    step2: { address: '', city: '' },
    step3: { payment: '' },
  },
});

async function validateStep(step: number) {
  const stepFields =
    {
      1: ['step1.name', 'step1.email'],
      2: ['step2.address', 'step2.city'],
      3: ['step3.payment'],
    }[step] || [];

  for (const field of stepFields) {
    const error = await form.validateField(field);
    if (error) return false;
  }
  return true;
}
```

---

## See Also

- [Usage Guide](./usage.md) - Common patterns and best practices
- [Examples](./examples.md) - Real-world examples
