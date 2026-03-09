# @vielzeug/formit

> Reactive form state management with field and form-level validators, async support, and fine-grained subscriptions

[![npm version](https://img.shields.io/npm/v/@vielzeug/formit)](https://www.npmjs.com/package/@vielzeug/formit) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Formit** is a framework-agnostic form controller: it tracks typed field values, errors, dirty state, and touched state — with synchronous and asynchronous validators, and fine-grained field subscriptions.

## Installation

```sh
pnpm add @vielzeug/formit
# npm install @vielzeug/formit
# yarn add @vielzeug/formit
```

## Quick Start

```typescript
import { createForm, ValidationError } from '@vielzeug/formit';

const form = createForm({
  values: { email: '', password: '' },
  rules: {
    email: (v) => (!String(v).includes('@') ? 'Invalid email' : undefined),
    password: (v) => (String(v).length < 8 ? 'Min 8 characters' : undefined),
  },
});

// Read / write fields
form.set('email', 'alice@example.com');
console.log(form.get('email')); // 'alice@example.com'

// Validate all fields
const errors = await form.validateAll();

// Submit (auto-validates, throws ValidationError on failure)
try {
  await form.submit(async (values) => {
    await api.login(values);
  });
} catch (error) {
  if (error instanceof ValidationError) {
    console.log('Errors:', error.errors); // Record<string, string>
  }
}

// Tear down
form.dispose();
```

## Features

- ✅ **Typed values** — values stay typed (`number`, `boolean`, `File`) — no string coercion
- ✅ **Nested values** — plain objects in `values` are auto-flattened; access fields with `form.get('user.name')`
- ✅ **Field rules** — per-field validators via the `rules` option
- ✅ **Cross-field validation** — `validate` option for form-level errors
- ✅ **Async validators** — validators can return `Promise<string | undefined>`
- ✅ **Dirty & touched tracking** — know what the user has changed
- ✅ **Computed flags** — `isValid`, `isDirty`, `isTouched` on every state snapshot
- ✅ **Fine-grained subscriptions** — `subscribeField` fires only for the changed field
- ✅ **Zero dependencies** — framework-agnostic, works with any UI library via `bind`

## Usage

### Reading and Writing Fields

```typescript
// Get / set individual fields
form.set('email', 'alice@example.com');
const emailValue = form.get('email');

// Set multiple fields at once
form.patch({ email: 'alice@example.com', name: 'Alice' });

// Get all current values as a plain object
const allValues = form.values();
```

### Errors and Validation

```typescript
// Validate a single field
const error = await form.validate('email');

// Validate all fields
const errors = await form.validateAll();

// Validate with options
const errors = await form.validateAll({ onlyTouched: true });

// Read errors
const emailError = form.getError('email');
const allErrors = form.getErrors(); // Record<string, string>

// Set errors manually
form.setError('email', 'This email is taken');
form.setErrors({ email: 'Taken', password: 'Too short' });
```

### Dirty and Touched State

```typescript
const changed = form.isDirty('email');   // true if different from initial value
const visited = form.isTouched('email'); // true if user interacted
form.setTouched('email');
```

### Subscriptions

```typescript
// Subscribe to any form change
const unsub = form.subscribe((state) => {
  console.log(state.errors, state.isValid, state.isSubmitting);
});

// Subscribe to one field
const unsubField = form.subscribeField('email', ({ value, error, touched, dirty }) => {
  console.log(value, error);
});

unsub();
unsubField();
```

### Snapshots and Reset

```typescript
const state = form.getState(); // capture current state
form.reset();                  // restore to initial values
form.reset({ name: '', email: '' }); // reset with new initial values
```

### Framework Binding

```typescript
// bind(field) returns { name, value, onChange, onBlur, set }
const { name, value, onChange, onBlur } = form.bind('email');
```

## API

| Method | Description |
|---|---|
| `form.get(field)` | Get current value of a field |
| `form.set(field, value, options?)` | Set field value |
| `form.update(field, fn, options?)` | Update a field with a `(prev) => next` updater |
| `form.patch(entries, options?)` | Set multiple fields at once |
| `form.values()` | Get all current values as a plain object |
| `form.getError(field)` | Get error message for a field |
| `form.getErrors()` | Get all errors as `Record<string, string>` |
| `form.setError(field, msg?)` | Set or clear a single field error |
| `form.setErrors(record)` | Replace all errors |
| `form.isDirty(field)` | Check if field has changed from initial value |
| `form.isTouched(field)` | Check if field has been touched |
| `form.setTouched(field)` | Mark a field as touched |
| `form.validate(field, signal?)` | Validate a single field |
| `form.validateAll(options?)` | Validate all fields — returns `Promise<Record<string, string>>` |
| `form.submit(handler, options?)` | Validate then call handler with `FormData` |
| `form.reset(newValues?)` | Reset to initial or new values |
| `form.getState()` | Capture current form state |
| `form.bind(field, config?)` | Get `{ name, value, onChange, onBlur, set }` binding helpers |
| `form.subscribe(listener)` | Subscribe to all form changes |
| `form.subscribeField(field, listener)` | Subscribe to a single field |
| `form.dispose()` | Tear down the form and remove all subscriptions |

## Documentation

Full docs at **[vielzeug.dev/formit](https://vielzeug.dev/formit)**

| | |
|---|---|
| [Usage Guide](https://vielzeug.dev/formit/usage) | Fields, validation, submission |
| [API Reference](https://vielzeug.dev/formit/api) | Complete type signatures |
| [Examples](https://vielzeug.dev/formit/examples) | Real-world form patterns |

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — Part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
