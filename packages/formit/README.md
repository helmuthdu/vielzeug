# @vielzeug/formit

> Framework-agnostic form state management with typed field values, per-field validators, async validation, and fine-grained subscriptions

[![npm version](https://img.shields.io/npm/v/@vielzeug/formit)](https://www.npmjs.com/package/@vielzeug/formit) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Formit** is a framework-agnostic form controller: it tracks typed field values, errors, dirty and touched state — with synchronous and asynchronous validators, fine-grained field subscriptions, array field utilities, and full TypeScript inference for dot-notation field paths.

## Installation

```sh
pnpm add @vielzeug/formit
# npm install @vielzeug/formit
# yarn add @vielzeug/formit
```

## Quick Start

```typescript
import { createForm, FormValidationError } from '@vielzeug/formit';

const form = createForm({
  defaultValues: { email: '', age: 0 },
  validators: {
    email: (v) => (!String(v).includes('@') ? 'Invalid email' : undefined),
    age: (v) => ((v as number) < 18 ? 'Must be 18+' : undefined),
  },
});

// TypeScript infers the right type for every field path
form.set('email', 'alice@example.com'); // ✅ string
form.set('age', 25); // ✅ number
// form.set('age', 'hello');            // ❌ type error

const email = form.get('email'); // type: string
const age = form.get('age'); // type: number

// Validate all fields — returns { valid, errors }
const { valid, errors } = await form.validate();

// Submit — touches all fields, validates, throws FormValidationError on failure
try {
  await form.submit(async (values) => {
    await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });
  });
} catch (error) {
  if (error instanceof FormValidationError) {
    console.log('Errors:', error.errors); // Record<string, string>
  }
}

form.dispose();
```

## Features

- ✅ **TypeScript inference** — `form.get('email')` returns `string`; `form.set('age', 30)` enforces `number`; dot-notation paths for nested values are fully typed
- ✅ **Typed values** — field values stay typed (`number`, `boolean`, `File`) — no string coercion
- ✅ **Nested field access** — plain objects in `defaultValues` are auto-flattened; access with `form.get('user.name')`
- ✅ **Deep partial patch** — `form.patch({ user: { name: 'Bob' } })` merges nested objects without replacing siblings
- ✅ **Field validators** — per-field `validators` option (single or array; first failure wins)
- ✅ **Cross-field validation** — `validator` option for form-level errors (runs only on full validation)
- ✅ **Async validators** — validators can return `Promise<string | undefined>`
- ✅ **AbortSignal support** — cancel in-flight async validators
- ✅ **Partial validation** — `validate({ fields: [...] })` updates only those fields' errors without touching the rest
- ✅ **Dirty & touched tracking** — know what the user has changed and interacted with
- ✅ **Shorthand field getters** — `form.getError(name)`, `form.isFieldDirty(name)`, `form.isFieldTouched(name)` without allocating a full snapshot
- ✅ **Untouch** — `form.untouch(name)` / `form.untouchAll()` for multi-step form flows
- ✅ **Array field utilities** — `appendField`, `removeField`, `moveField` for dynamic lists
- ✅ **Convenience getters** — `form.isValid`, `form.isDirty`, `form.isTouched`, `form.errors` on the instance
- ✅ **Fine-grained subscriptions** — `watch(name, fn)` fires only for the changed field
- ✅ **Bind helper** — `form.bind('email')` returns a memoized object with live getters and `onChange`/`onBlur` handlers
- ✅ **Single-field reset** — `form.resetField('name')` restores one field without touching the rest
- ✅ **Schema adapter** — `fromSchema(schema)` connects any Zod/Valibot-compatible `safeParse` schema as the form validator
- ✅ **Zero dependencies** — framework-agnostic, works with any UI library

## Usage

### Typed Field Access

TypeScript infers value types from every field path — including dot-notation paths for deeply nested values:

```typescript
const form = createForm({
  defaultValues: {
    email: '',
    age: 0,
    active: false,
    user: { name: '', role: 'viewer' as 'admin' | 'viewer' },
  },
});

form.get('email'); // string
form.get('age'); // number
form.get('active'); // boolean
form.get('user.name'); // string
form.get('user.role'); // 'admin' | 'viewer'

form.set('age', 25); // ✅ number
form.set('user.role', 'admin'); // ✅ 'admin' | 'viewer'
// form.set('age', 'hello');       // ❌ type error
```

### Nested Values and Deep Partial Patch

Plain objects in `defaultValues` are automatically flattened. `values()` reconstructs the original nested shape.

```typescript
const form = createForm({
  defaultValues: {
    user: { name: 'Alice', profile: { city: 'NYC', age: 30 } },
  },
});

form.get('user.name'); // 'Alice'
form.get('user.profile.city'); // 'NYC'
form.set('user.name', 'Bob');

// patch() — deep partial merge; only the supplied keys change
form.patch({ user: { profile: { city: 'LA' } } });
// user.name is still 'Bob'; user.profile.age is still 30

form.values();
// { user: { name: 'Bob', profile: { city: 'LA', age: 30 } } }
```

> Arrays, `File`, `Blob`, and `Date` values are always treated as leaf values — never flattened.

### Validation

```typescript
// Single-field validation — returns error string or undefined; updates the error map
const err = await form.validateField('email');

// Full validation — returns { valid, errors }; runs the form-level validator
const { valid, errors } = await form.validate();

// Partial validation — updates only the listed fields; preserves all other errors
const { errors } = await form.validate({ fields: ['email', 'password'] });

// Only validate fields the user has touched
await form.validate({ onlyTouched: true });

// Set or clear individual errors manually
form.setError('email', 'This email is taken');
form.setError('email'); // clear
form.setErrors({ email: 'Taken', password: 'Too short' });
form.clearErrors(); // clear all
```

### Submission

```typescript
// Touches all fields, validates, throws FormValidationError on failure
try {
  await form.submit(async (values) => {
    await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });
  });
} catch (error) {
  if (error instanceof FormValidationError) {
    console.log(error.errors); // Record<string, string>
  }
}

// File uploads
await form.submit(async () => {
  await fetch('/api/upload', { method: 'POST', body: form.toFormData() });
});

// Skip validation (e.g. auto-save drafts)
await form.submit(saveDraft, { skipValidation: true });
```

### Dirty and Touched State

```typescript
// Full field snapshot: { value, error, touched, dirty }
const { value, error, touched, dirty } = form.field('email');

// Shorthand — no object allocation
form.getError('email'); // string | undefined
form.isFieldDirty('email'); // boolean
form.isFieldTouched('email'); // boolean

// Touch fields
form.touch('email');
form.touchAll();

// Un-touch (useful in multi-step forms)
form.untouch('email');
form.untouchAll();

// Top-level aggregate getters
form.isValid; // true when no errors
form.isDirty; // true when any field differs from baseline
form.isTouched; // true when any field has been touched
```

### Array Field Utilities

```typescript
const form = createForm({ defaultValues: { tags: ['js'] } });

form.appendField('tags', 'ts'); // ['js', 'ts']
form.removeField('tags', 0); // ['ts']
form.moveField('tags', 0, 1); // reorder

// Useful for dynamic line-item lists:
form.appendField('items', { name: '', qty: 1 });
form.removeField('items', 2);
form.moveField('items', 0, 3); // drag-and-drop reorder
```

### Schema Adapter

Connect any Zod/Valibot-compatible schema as the form-level validator:

```typescript
import { z } from 'zod';
import { createForm, fromSchema } from '@vielzeug/formit';

const schema = z.object({
  email: z.string().email('Invalid email'),
  age: z.number().min(18, 'Must be 18+'),
});

const form = createForm({
  defaultValues: { email: '', age: 0 },
  ...fromSchema(schema),
});

const { valid, errors } = await form.validate();
```

### Subscriptions

```typescript
// Form-level — fires on any state change, immediately with current state
const unsub = form.subscribe(({ isValid, isDirty, errors }) => {
  submitButton.disabled = !isValid;
});

// Field-level — fires only when that field changes
const unsub = form.watch('email', ({ value, error, touched }) => {
  errorSpan.textContent = touched ? (error ?? '') : '';
});

// Skip the immediate fire
form.watch('email', handler, { immediate: false });

unsub(); // cleanup
```

### Bind

`bind()` is memoized — same args return the same object. All state properties are live getters:

```typescript
// Plain HTML
const b = form.bind('email');
// → { name, value, error, touched, dirty, onChange, onBlur }

// React
<input {...form.bind('email')} type="email" />

// Custom event extractor
form.bind('rating', { valueExtractor: (e) => (e as CustomEvent).detail.value });
```

## API

### `createForm(init?)`

| Option          | Type                                                 | Description                                                         |
| --------------- | ---------------------------------------------------- | ------------------------------------------------------------------- |
| `defaultValues` | `TValues`                                            | Initial field values (plain objects auto-flattened to dot-notation) |
| `validators`    | `Record<string, FieldValidator \| FieldValidator[]>` | Per-field validators                                                |
| `validator`     | `FormValidator<TValues>`                             | Form-level (cross-field) validator                                  |

### Form Instance

**Values**

| Method                       | Description                             |
| ---------------------------- | --------------------------------------- |
| `get(name)`                  | Get a typed field value                 |
| `set(name, value, options?)` | Set a typed field value                 |
| `patch(entries, options?)`   | Deep partial merge of multiple fields   |
| `values()`                   | All values in the original nested shape |

**Field State**

| Method/Getter              | Description                                             |
| -------------------------- | ------------------------------------------------------- |
| `field(name)`              | Full field snapshot: `{ value, error, touched, dirty }` |
| `getError(name)`           | Current error string without allocating a snapshot      |
| `isFieldDirty(name)`       | Whether the field differs from its baseline value       |
| `isFieldTouched(name)`     | Whether the field has been touched                      |
| `errors`                   | Getter — current error map (`Record<string, string>`)   |
| `setError(name, message?)` | Set or clear a single field error                       |
| `setErrors(nextErrors)`    | Replace the entire error map                            |
| `clearErrors()`            | Clear all errors (shorthand for `setErrors({})`)        |

**Touch**

| Method                  | Description                          |
| ----------------------- | ------------------------------------ |
| `touch(first, ...rest)` | Mark one or more fields as touched   |
| `touchAll()`            | Mark all known fields as touched     |
| `untouch(name)`         | Remove touched state from one field  |
| `untouchAll()`          | Remove touched state from all fields |

**Array Utilities**

| Method                      | Description                                    |
| --------------------------- | ---------------------------------------------- |
| `appendField(name, value)`  | Append an item to an array field               |
| `removeField(name, index)`  | Remove the item at `index` from an array field |
| `moveField(name, from, to)` | Move an item to a new index (drag-and-drop)    |

**Validation**

| Method                         | Description                                        |
| ------------------------------ | -------------------------------------------------- |
| `validateField(name, signal?)` | Validate a single field (sets `isValidating`)      |
| `validate(options?)`           | Validate all or a subset; returns `ValidateResult` |

**Submit**

| Method                      | Description                         |
| --------------------------- | ----------------------------------- |
| `submit(handler, options?)` | Touch all → validate → call handler |

**Subscriptions**

| Method                            | Description                                      |
| --------------------------------- | ------------------------------------------------ |
| `subscribe(listener, options?)`   | Subscribe to form state; returns unsubscribe     |
| `watch(name, listener, options?)` | Subscribe to a single field; returns unsubscribe |
| `bind(name, config?)`             | Memoized input binding object with live getters  |

**Reset**

| Method              | Description                                        |
| ------------------- | -------------------------------------------------- |
| `reset(newValues?)` | Reset entire form (values, errors, dirty, touched) |
| `resetField(name)`  | Reset a single field without touching the rest     |

**Lifecycle**

| Method/Getter | Description                                |
| ------------- | ------------------------------------------ |
| `dispose()`   | Abort validators and clear all subscribers |
| `disposed`    | `true` after `dispose()` is called         |

**State Getters**

| Getter         | Type        | Description                                |
| -------------- | ----------- | ------------------------------------------ |
| `isValid`      | `boolean`   | `true` when no errors                      |
| `isDirty`      | `boolean`   | `true` when any field differs from initial |
| `isTouched`    | `boolean`   | `true` when any field has been touched     |
| `isValidating` | `boolean`   | `true` during async validation             |
| `isSubmitting` | `boolean`   | `true` during submission                   |
| `submitCount`  | `number`    | Number of submit attempts                  |
| `state`        | `FormState` | Full state snapshot                        |
| `toFormData()` | `FormData`  | Converts values to multipart FormData      |

### Error Classes

| Class                 | Description                                                                                                     |
| --------------------- | --------------------------------------------------------------------------------------------------------------- |
| `FormValidationError` | Thrown by `submit()` when validation fails; carries `.errors: Record<string, string>` and `.type: 'validation'` |
| `SubmitError`         | Thrown by `submit()` when already submitting; carries `.type: 'submit'`                                         |

### Standalone Exports

| Export               | Description                                                                    |
| -------------------- | ------------------------------------------------------------------------------ |
| `createForm(init?)`  | Create a new form instance                                                     |
| `toFormData(values)` | Convert any plain object to `FormData`                                         |
| `fromSchema(schema)` | Adapt a `safeParse`-compatible schema (Zod, Valibot) as a form-level validator |

## Documentation

Full docs at **[vielzeug.dev/formit](https://vielzeug.dev/formit)**

|                                                  |                                                     |
| ------------------------------------------------ | --------------------------------------------------- |
| [Usage Guide](https://vielzeug.dev/formit/usage) | Fields, validation, submission, advanced patterns   |
| [API Reference](https://vielzeug.dev/formit/api) | Complete type signatures                            |
| [Examples](https://vielzeug.dev/formit/examples) | Real-world form patterns and framework integrations |

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — Part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
