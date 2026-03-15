---
title: Formit — Form state management for TypeScript
description: Lightweight framework-agnostic form state management with typed values, per-field validators, async validation, and fine-grained subscriptions.
---

<PackageBadges package="formit" />

<img src="/logo-formit.svg" alt="Formit Logo" width="156" class="logo-highlight"/>

# Formit

**Formit** is a lightweight, framework-agnostic form controller with typed field values, per-field validators, form-level validators, async support, array field utilities, and fine-grained subscriptions.

## Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/formit
```

```sh [npm]
npm install @vielzeug/formit
```

```sh [yarn]
yarn add @vielzeug/formit
```

:::

## Quick Start

```ts
import { createForm, FormValidationError } from '@vielzeug/formit';

const form = createForm({
  defaultValues: {
    name: '',
    email: '',
  },
  validators: {
    name: (v) => (!v || String(v).trim() === '' ? 'Name is required' : undefined),
    email: (v) => (!String(v).includes('@') ? 'Invalid email' : undefined),
  },
});

// Subscribe to form state changes
form.subscribe((state) => {
  // re-render or update UI with state.errors, state.isDirty, etc.
});

// Validate — returns { valid, errors }
const { valid, errors } = await form.validate();

// Submit
try {
  await form.submit(async (values) => {
    await api.createUser(values);
  });
} catch (error) {
  if (error instanceof FormValidationError) {
    console.log('Validation errors:', error.errors); // Record<string, string>
  }
}
```

## Features

- **TypeScript inference** — `form.get('email')` returns `string`; `form.set('age', 30)` enforces `number`; dot-notation paths for nested values are fully typed
- **Typed values** — field values stay typed (`number`, `boolean`, `File`) — no string coercion
- **Nested values** — plain objects in `defaultValues` are auto-flattened; access fields with `form.get('user.name')`
- **Deep partial patch** — `form.patch({ user: { name: 'Bob' } })` merges nested objects without replacing siblings
- **Field validators** — per-field `validators` option with a single validator or an array (first failure wins)
- **Form validators** — cross-field validation via `validator` returning an error record (runs only on full validation)
- **Async validators** — validators can return `Promise<string | undefined>`
- **Partial validation** — `validate({ fields: [...] })` or `validate({ onlyTouched: true })` updates only the scoped fields' errors; preserves the rest; skips form validator
- **AbortSignal support** — cancel in-flight async validators
- **Shorthand field getters** — `form.getError(name)`, `form.isFieldDirty(name)`, `form.isFieldTouched(name)` without allocating a full snapshot
- **Untouch** — `form.untouch(name)` / `form.untouchAll()` for multi-step form flows
- **Array field utilities** — `appendField`, `removeField`, `moveField` for dynamic list fields
- **Convenience getters** — `form.isValid`, `form.isDirty`, `form.isTouched`, `form.errors` directly on the instance
- **Fine-grained subscriptions** — `watch(name, fn)` fires only when that field changes
- **Bind helper** — `form.bind('email')` returns a memoized object with live getters and `onChange`/`onBlur` handlers
- **Single-field reset** — `form.resetField('name')` restores one field without touching the rest
- **Schema adapter** — `fromSchema(schema)` connects any Zod/Valibot-compatible `safeParse` schema as the form validator
- **Zero dependencies** — <PackageInfo package="formit" type="size" /> gzipped

## Next Steps

|                           |                                                             |
| ------------------------- | ----------------------------------------------------------- |
| [Usage Guide](./usage.md) | Fields, validation, submission, subscriptions, and patterns |
| [API Reference](./api.md) | Complete type signatures and method documentation           |
| [Examples](./examples.md) | Real-world form patterns and framework integrations         |
