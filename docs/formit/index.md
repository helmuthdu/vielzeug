---
title: Formit — Form state management for TypeScript
description: Framework-agnostic typed form state with validation, submission flow, subscriptions, and form-data helpers.
---

<PackageBadges package="formit" />

<img src="/logo-formit.svg" alt="Formit logo" width="156" class="logo-highlight"/>

# Formit

`@vielzeug/formit` is a typed, framework-agnostic form controller for values, validation, dirty/touched state, and submission orchestration.

<!-- Search keywords: form state manager, field validation flow, controlled form logic. -->

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

const { valid, errors } = await form.validate();

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

## Why Formit?

Rolling form state by hand means recreating the same `touched`, `dirty`, and `errors` tracking for every form. Most form libraries that handle this are tightly coupled to a specific framework.

```ts
// Before — manual form state
let values = { name: '', email: '' };
let errors: Record<string, string> = {};
let touched: Record<string, boolean> = {};
async function validate() {
  errors = {};
  if (!values.name) errors.name = 'Required';
  if (!values.email.includes('@')) errors.email = 'Invalid email';
  return Object.keys(errors).length === 0;
}

// After — Formit
import { createForm } from '@vielzeug/formit';
const form = createForm({
  defaultValues: { name: '', email: '' },
  validators: {
    name: (v) => (!v ? 'Required' : undefined),
    email: (v) => (!String(v).includes('@') ? 'Invalid email' : undefined),
  },
});
const { valid, errors } = await form.validate();
```

| Feature            | Formit                                       | React Hook Form | Formik     |
| ------------------ | -------------------------------------------- | --------------- | ---------- |
| Bundle size        | <PackageInfo package="formit" type="size" /> | ~15 kB          | ~17 kB     |
| Framework agnostic | ✅                                           | React only      | React only |
| Typed field values | ✅                                           | ❌ (strings)    | ❌         |
| Async validators   | ✅                                           | ✅              | ✅         |
| AbortSignal        | ✅                                           | ❌              | ❌         |
| Field arrays       | ✅                                           | ✅              | ✅         |
| Zero dependencies  | ✅                                           | ✅              | ❌         |

**Use Formit when** you need framework-agnostic form state management with typed field values, async validation, and fine-grained subscriptions.

**Consider React Hook Form** if you are in a React project and want its uncontrolled-component performance model and large plugin ecosystem.

## Features

- **Typed paths** with dot-notation inference (`user.profile.name`)
- **Value store + baseline tracking** for reliable dirty state
- **Field + form validators** with async support and abort signals
- **Partial validation** without clobbering unrelated errors
- **Submit flow** with `SubmitError` and `FormValidationError`
- **Form and field subscriptions** (`subscribe`, `watch`)
- **Memoized input bindings** (`bind`)
- **Array helpers** for dynamic list fields
- **FormData conversion** via instance and standalone helpers
- **Zero dependencies** — <PackageInfo package="formit" type="size" /> gzipped

## Compatibility

| Environment | Support       |
| ----------- | ------------- |
| Browser     | ✅            |
| Node.js     | ❌ (DOM only) |
| SSR         | ❌ (DOM only) |
| Deno        | ❌            |

## Prerequisites

- Browser runtime for form element events and `FormData` workflows.
- Define `defaultValues` with the same shape you submit to your API.
- Pair with `@vielzeug/validit` (optional) when you need reusable schema-based validation.

## See Also

- [Validit](/validit/)
- [Fetchit](/fetchit/)
- [Stateit](/stateit/)
