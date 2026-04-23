---
title: Formit — Form state management for TypeScript
description: Framework-agnostic typed form state with validation, deterministic submission flow, subscriptions, and form-data helpers.
---

<PackageBadges package="formit" />

<img src="/logo-formit.svg" alt="Formit logo" width="156" class="logo-highlight"/>

# Formit

@vielzeug/formit is a typed, framework-agnostic form controller for values, validation, dirty/touched state, and submit orchestration.

## Highlights

- Typed field paths with compile-time value inference
- Explicit validation methods: validateAll, validateTouched, validateFields
- Explicit subscriptions: subscribeForm and subscribeField
- Baseline-safe reset/replace model
- Browser-first utilities: bind, array helpers, toFormData

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
  defaultValues: { email: '', password: '' },
  validators: {
    email: (v) => (!String(v).includes('@') ? 'Invalid email' : undefined),
    password: (v) => (String(v).length < 8 ? 'Min 8 chars' : undefined),
  },
});

const { valid, errors } = await form.validateAll();

try {
  await form.submit(async (values) => {
    await fetch('/api/login', {
      body: JSON.stringify(values),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });
  });
} catch (error) {
  if (error instanceof FormValidationError) {
    console.log(error.errors);
  }
}
```

## Compatibility

| Environment | Support |
| ----------- | ------- |
| Browser     | ✅      |

## Why Formit?

Use Formit when you want a typed form controller with explicit state transitions and deterministic submit behavior.

Consider alternatives when you need dynamic, runtime-only field shapes without TypeScript path inference.

## See Also

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)
