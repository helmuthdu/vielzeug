---
title: Formit — Form state management for TypeScript
description: Lightweight form state management with typed values, field and form-level validators, async support, and no framework dependencies.
---

<PackageBadges package="formit" />

<img src="/logo-formit.svg" alt="Formit Logo" width="156" class="logo-highlight"/>

# Formit

**Formit** is a lightweight form state management library with typed field values, per-field rules, form-level validators, and async support.

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
import { createForm, ValidationError } from '@vielzeug/formit';

const form = createForm({
  values: {
    name: '',
    email: '',
  },
  rules: {
    name: (value) => {
      if (!value || String(value).trim() === '') return 'Name is required';
    },
    email: (value) => {
      if (!String(value).includes('@')) return 'Invalid email';
    },
  },
});

// Subscribe to form state changes
form.subscribe((state) => {
  // re-render or update UI with state.errors, state.isDirty, etc.
});

// Submit
try {
  await form.submit(async (formData) => {
    await api.createUser(Object.fromEntries(formData));
  });
} catch (error) {
  if (error instanceof ValidationError) {
    console.log('Validation errors:', error.errors); // Record<string, string>
  }
}
```

## Features

- **Typed values** — field values stay typed (`number`, `boolean`, `File`) — no string coercion
- **Field rules** — per-field `rules` option with single or multiple validators
- **Form validators** — cross-field validation via `validate` returning an error record
- **Async validators** — validators can return `Promise<string | undefined>`
- **Error record** — errors typed as `Record<string, string>` for easy rendering
- **Computed flags** — `isValid`, `isDirty`, `isTouched` on every state snapshot
- **Zero dependencies** — <PackageInfo package="formit" type="size" /> gzipped

## Next Steps

| | |
|---|---|
| [Usage Guide](./usage.md) | Field validation, form validation, async, and testing |
| [API Reference](./api.md) | Complete type signatures and method documentation |
| [Examples](./examples.md) | Real-world form patterns and framework integrations |
