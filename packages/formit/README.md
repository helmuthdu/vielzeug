# @vielzeug/formit

> Framework-agnostic typed form state with validation, submit flow, and fine-grained subscriptions.

[![npm version](https://img.shields.io/npm/v/@vielzeug/formit)](https://www.npmjs.com/package/@vielzeug/formit) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

`@vielzeug/formit` gives you a typed form controller with:

- typed `get` / `set` for dot-notation field paths
- explicit validation methods: `validateAll()`, `validateTouched()`, `validateFields(fields)`
- global validation mode: `mode: 'onSubmit' | 'onBlur' | 'onChange' | 'onTouched'`
- dirty/touched/error tracking
- `submit(handler)` orchestration that returns an explicit success/error result
- form and field subscriptions
- stable frozen snapshots for `form.state` and `form.field(name)`

## Installation

```sh
pnpm add @vielzeug/formit
# npm install @vielzeug/formit
# yarn add @vielzeug/formit
```

## Entry Point

| Entry | Purpose |
| --- | --- |
| `@vielzeug/formit` | `createForm`, `schemaValidator`, `toFormData`, and types |

## Quick Start

```ts
import { createForm } from '@vielzeug/formit';

const form = createForm({
  defaultValues: { email: '', password: '' },
  validators: {
    email: (v) => (!String(v).includes('@') ? 'Invalid email' : undefined),
    password: (v) => (String(v).length < 8 ? 'Min 8 chars' : undefined),
  },
});

form.set('email', 'alice@example.com');

const result = await form.validateAll();
console.log(result.valid, result.errors);

const submission = await form.submit(async (values) => {
  await fetch('/api/login', {
    body: JSON.stringify(values),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  });
});

if (!submission.ok && submission.type === 'validation') {
  console.log(submission.errors);
}
```

## Features

- Typed field paths (`FlatKeyOf`) and path value inference (`TypeAtPath`)
- Plain-object flatten/unflatten for nested forms
- Field validators (`validators`) and form validator (`validator`)
- Schema integration via `schemaValidator(schema)` for `safeParse`-compatible validators
- Explicit validation API: `validateAll()` / `validateTouched()` / `validateFields(fields)` / `validateField(name)`
  - `validateAll()` runs all field validators **and** the form-level validator (`validator`); clears all prior errors
  - `validateTouched()` and `validateFields(fields)` run only the targeted field validators; form-level errors from a prior `validateAll()` are preserved in `form.state.errors` until the next `validateAll()`, `resetErrors()`, or `clearError()`
  - `validateField(name)` validates only the single field validator
- Single-field validation with `validateField(name)`
- Global validation mode: `mode: 'onSubmit' | 'onBlur' | 'onChange' | 'onTouched'`
- Deterministic submit flow: touch-all + validate-all before handler with `SubmitResult`
- `removeField(name)` — cleanly drops value, state, and validator for conditional fields
- Explicit synchronous subscriptions: `subscribe()` and `subscribeField()`
- Stable snapshot semantics for external stores (`useSyncExternalStore`, Vue `shallowRef`, Svelte store protocol)
- Baseline-safe reset model: `reset()` and `replace(values)`
- `batch(fn)` for grouped synchronous updates
- `setValidator(name, validator?)` for dynamic forms (validator registration only; does not mutate current errors)
- `bind()` helper for vanilla DOM integration with live getters and value-based `onChange(value)`
- Array helpers: `append`, `prepend`, `insert`, `remove`, `move`, `swap`, `replace`
- Explicit error map controls: `setError`, `resetErrors`
- Explicit touched controls: `touch(name)`, `untouch(name)`, `touchAll()`, `untouchAll()`
- Standalone `toFormData(values)`

## Core API

- `createForm(init?)`
- `toFormData(values)`
- `SubmitResult`

## Framework Interop

Formit stays framework-agnostic and exposes subscription + snapshot primitives that map cleanly to framework reactivity:

- React: `useSyncExternalStore(() => subscribe..., () => form.state)`
- Vue: `shallowRef(form.state)` updated from `subscribe(...)`
- Svelte: `{ subscribe: (run) => form.subscribe(run, { sync: true }) }`

`form.state` and `form.field(name)` return stable frozen snapshots, so reference identity only changes after relevant mutations.

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
