# @vielzeug/formit

> Framework-agnostic typed form state with validation, submit flow, and fine-grained subscriptions.

[![npm version](https://img.shields.io/npm/v/@vielzeug/formit)](https://www.npmjs.com/package/@vielzeug/formit) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

`@vielzeug/formit` gives you a typed form controller with:

- typed `get` / `set` for dot-notation field paths
- unified validation entrypoint: `validate()`, `validate('touched')`, `validate(fields)`
- global validation mode: `mode: 'onSubmit' | 'onBlur' | 'onChange' | 'onTouched'`
- dirty/touched/error tracking
- `submit(onValid, onInvalid?)` orchestration with optional error callback
- `watch(name, cb)` for live field value streaming
- form and field subscriptions

## Installation

```sh
pnpm add @vielzeug/formit
# npm install @vielzeug/formit
# yarn add @vielzeug/formit
```

## Entry Point

| Entry | Purpose |
| --- | --- |
| `@vielzeug/formit` | `createForm`, `fromSchema`, `toFormData`, types, and error classes |

## Quick Start

```ts
import { createForm, FormValidationError } from '@vielzeug/formit';

const form = createForm({
  defaultValues: { email: '', password: '' },
  validators: {
    email: (v) => (!String(v).includes('@') ? 'Invalid email' : undefined),
    password: (v) => (String(v).length < 8 ? 'Min 8 chars' : undefined),
  },
});

form.set('email', 'alice@example.com');

const result = await form.validate();
console.log(result.valid, result.errors);

// Option A — catch-based (throws FormValidationError on invalid)
try {
  await form.submit(async (values) => {
    await fetch('/api/login', {
      body: JSON.stringify(values),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });
  });
} catch (err) {
  if (err instanceof FormValidationError) {
    console.log(err.errors);
  }
}

// Option B — callback-based (no throw on invalid)
await form.submit(
  async (values) => { /* save */ },
  (errors) => { console.log('invalid', errors); },
);
```

## Features

- Typed field paths (`FlatKeyOf`) and path value inference (`TypeAtPath`)
- Plain-object flatten/unflatten for nested forms
- Field validators (`validators`) and form validator (`validator`)
- Unified validation API: `validate()` / `validate('touched')` / `validate(fields)`
- Single-field validation with `validateField(name)`
- Global validation mode: `mode: 'onSubmit' | 'onBlur' | 'onChange' | 'onTouched'`
- Deterministic submit flow: touch-all + validate-all before handler (`SubmitError` on overlap)
- Optional `onInvalid` callback in `submit(onValid, onInvalid?)` — no need to catch
- `watch(name, cb, options?)` — live value streaming without subscription boilerplate
- `removeField(name)` — cleanly drops value, state, and validator for conditional fields
- Validation failure signaling via `FormValidationError`
- Explicit subscriptions: `subscribeForm()` and `subscribeField()`
- Baseline-safe reset model: `reset()` and `replace(values)`
- `bind()` helper with live getters and value-based `onChange(value)`
- Array helpers: `append`, `prepend`, `insert`, `remove`, `move`, `swap`, `replace`
- Explicit error map controls: `setError`, `mergeErrors`, `replaceErrors`, `clearError`
- Standalone `toFormData(values)`
- Schema adapter helper: `fromSchema(schema)`

## Core API

- `createForm(init?)`
- `fromSchema(schema)`
- `toFormData(values)`
- `FormValidationError`
- `SubmitError`

## Documentation

- [Overview](https://vielzeug.dev/formit/)
- [Usage Guide](https://vielzeug.dev/formit/usage)
- [API Reference](https://vielzeug.dev/formit/api)
- [Examples](https://vielzeug.dev/formit/examples)

## Compatibility

| Environment | Support |
| --- | --- |
| Browser | ✅ |

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
