---
title: Formit — Form state management for TypeScript
description: Lightweight form state management built on FormData with field and form-level validators, async support, and no framework dependencies.
---

<PackageBadges package="formit" />

<img src="/logo-formit.svg" alt="Formit Logo" width="156" class="logo-highlight"/>

# Formit

**Formit** is a lightweight form state management library built on `FormData` with field validators, form-level validators, and async support.

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
  fields: {
    name: {
      value: '',
      validators: (value) => {
        if (!value || String(value).trim() === '') return 'Name is required';
      },
    },
    email: {
      value: '',
      validators: (value) => {
        if (!String(value).includes('@')) return 'Invalid email';
      },
    },
  },
});

// Subscribe to form state changes
form.subscribe((state) => {
  // re-render or update UI with state.errors, state.dirty, etc.
});

// Submit
try {
  await form.submit(async (formData) => {
    await api.createUser(Object.fromEntries(formData));
  });
} catch (error) {
  if (error instanceof ValidationError) {
    console.log('Validation errors:', error.errors);
  }
}
```

## Features

- **FormData-based** — works with native browser form elements
- **Field validators** — per-field `validate(value)` returning an error string or `undefined`
- **Form validators** — cross-field validation via `validate(formData)` returning an error map
- **Async validators** — validators can return `Promise<string | undefined>`
- **Error map** — errors typed as `Map<string, string>` for easy rendering
- **Zero dependencies** — <PackageInfo package="formit" type="size" /> gzipped

## Next Steps

| | |
|---|---|
| [Usage Guide](./usage.md) | Field validation, form validation, async, and testing |
| [API Reference](./api.md) | Complete type signatures and method documentation |
| [Examples](./examples.md) | Real-world form patterns and framework integrations |
