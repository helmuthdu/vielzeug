# @vielzeug/formit

> Framework-agnostic typed form state with validation, submit flow, and fine-grained subscriptions.

[![npm version](https://img.shields.io/npm/v/@vielzeug/formit)](https://www.npmjs.com/package/@vielzeug/formit) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

`@vielzeug/formit` gives you a typed form controller with:

- typed `get` / `set` for dot-notation field paths
- field-level and form-level validation
- dirty/touched/error tracking
- `submit` orchestration with typed errors
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
```

## Features

- Typed field paths (`FlatKeyOf`) and path value inference (`TypeAtPath`)
- Plain-object flatten/unflatten for nested forms
- Field validators (`validators`) and form validator (`validator`)
- Partial validation via `validate({ fields })` or `validate({ onlyTouched: true })`
- `submit` with double-submit protection (`SubmitError`)
- Validation failure signaling via `FormValidationError`
- Unified `subscribe()` for form-level and field-level observation
- `bind()` helper with live getters
- Array batch helper: `array(name).append/remove/move`
- Standalone `toFormData(values)`

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

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
