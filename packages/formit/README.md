# @vielzeug/formit

> Reactive, schema-aware form state management with validation, submission, and field subscriptions

[![npm version](https://img.shields.io/npm/v/@vielzeug/formit)](https://www.npmjs.com/package/@vielzeug/formit) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Formit** is a framework-agnostic form controller: it tracks field values, errors, dirty state, and touched state — and supports synchronous and asynchronous validators, deeply nested fields, and fine-grained field subscriptions.

## Installation

```sh
pnpm add @vielzeug/formit
# npm install @vielzeug/formit
# yarn add @vielzeug/formit
```

## Quick Start

```typescript
import { createForm } from '@vielzeug/formit';

const form = createForm({
  initialValues: { email: '', password: '' },
  validators: {
    email: (v) => (!v.includes('@') ? 'Invalid email' : undefined),
    password: (v) => (v.length < 8 ? 'Min 8 characters' : undefined),
  },
  onSubmit: async (values) => {
    await api.login(values);
  },
});

// Read / write fields
form.set('email', 'alice@example.com');
console.log(form.get('email'));

// Validate and submit
const ok = await form.validate();
if (ok) await form.submit();

// Tear down
form.dispose();
```

## Features

- ✅ **Reactive** — subscribe to the whole form or individual fields
- ✅ **Validators** — sync and async, per-field or cross-field
- ✅ **Dirty & touched tracking** — know what the user has changed
- ✅ **Nested fields** — dot-notation paths (`'address.city'`)
- ✅ **Snapshots** — save and restore form state
- ✅ **Clone** — fork a form with overridden values
- ✅ **Framework-agnostic** — works with any UI library via `bind`

## Usage

### Reading and Writing Fields

```typescript
// Get / set individual fields
form.set('email', 'alice@example.com');
const emailValue = form.get('email');

// Get all current values
const allValues = form.values();
```

### Errors and Validation

```typescript
// Trigger full validation
const isValid = await form.validate();

// Read errors
const emailError = form.getError('email');
const allErrors  = form.getErrors();

// Set errors manually
form.setError('email', 'This email is taken');
form.setErrors({ email: 'Taken', password: 'Too short' });
```

### Dirty and Touched State

```typescript
const changed  = form.isDirty('email');    // true if different from initialValues
const visited  = form.isTouched('email');   // true if user interacted
form.setTouched('email', true);
```

### Subscriptions

```typescript
// Subscribe to any form change
const unsub = form.subscribe((state) => {
  console.log(state.values, state.errors, state.isSubmitting);
});

// Subscribe to one field
const unsubField = form.subscribeField('email', (value, error) => {
  console.log(value, error);
});

unsub(); unsubField(); // unsubscribe
```

### Snapshots and Clone

```typescript
const snap = form.snapshot();   // capture current state
form.reset();                   // restore to initialValues
form.reset(snap);               // restore to snapshot

const fork = form.clone({ email: 'other@example.com' });
fork.dispose();
```

### Framework Binding

```typescript
// bind(field) returns value and onChange helpers
const { value, onChange, onBlur } = form.bind('email');
```

## API

| Method | Description |
|---|---|
| `form.get(field)` | Get current value of a field |
| `form.set(field, value)` | Set field value |
| `form.values()` | Get all current values |
| `form.getError(field)` | Get error message for a field |
| `form.getErrors()` | Get all field errors |
| `form.setError(field, msg)` | Set a field error |
| `form.setErrors(map)` | Set multiple errors |
| `form.isDirty(field?)` | Check if field (or form) has changed |
| `form.isTouched(field?)` | Check if field has been touched |
| `form.setTouched(field, bool)` | Mark a field as touched |
| `form.validate()` | Run all validators — returns `Promise<boolean>` |
| `form.submit()` | Validate then call `onSubmit` |
| `form.reset(snapshot?)` | Reset to initial or snapshot state |
| `form.snapshot()` | Capture current form state |
| `form.clone(overrides?)` | Fork form with optional value overrides |
| `form.bind(field)` | Get `{ value, onChange, onBlur }` binding helpers |
| `form.subscribe(listener)` | Subscribe to all form changes |
| `form.subscribeField(field, listener)` | Subscribe to one field |
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
