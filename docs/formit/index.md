---
title: Formit — Form state management for TypeScript
description: Framework-agnostic typed form state with path-safe fields, unified validation API, deterministic submit flow, and browser-friendly helpers.
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageBadges package="formit" />

<img src="/logo-formit.svg" alt="Formit logo" width="156" class="logo-highlight"/>

# Formit

`@vielzeug/formit` is a typed, framework-agnostic form controller for values, errors, dirty and touched state, validation, and submission.

<!-- Search keywords: typed form state, validation, submit orchestration, form controller. -->

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
import { createForm } from '@vielzeug/formit';

const form = createForm({
  defaultValues: { email: '', password: '' },
  mode: 'onBlur', // validate automatically on blur
  validators: {
    email: (v) => (!String(v).includes('@') ? 'Invalid email' : undefined),
    password: (v) => (String(v).length < 8 ? 'Min 8 chars' : undefined),
  },
});

const { valid, errors } = await form.validateAll();

if (!valid) {
  console.log(errors);
}

const submission = await form.submit(async (values) => {
  await fetch('/api/login', {
    body: JSON.stringify(values),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  });
});

if (!submission.ok) {
  if (submission.type === 'validation') {
    console.log(submission.errors);
  }
}

const second = await form.submit(async () => {});

if (!second.ok && second.type === 'concurrent') {
  console.log('Submission already in progress');
}
```

## Why Formit?

Native form handling quickly grows repetitive when you need typed values, deterministic submit behavior, and granular subscriptions.

```ts
// Before: manual state and ad-hoc validation sequencing
const errors: Record<string, string> = {};

if (!email.includes('@')) errors.email = 'Invalid email';
if (password.length < 8) errors.password = 'Too short';

if (Object.keys(errors).length === 0) {
  await submit({ email, password });
}

// After: one form controller with explicit transitions
const form = createForm({ defaultValues: { email: '', password: '' }, validators: { email: isEmail, password: min8 } });
await form.validateAll();
await form.submit(submit);
```

| Feature                       | Formit                                       | React Hook Form | VeeValidate |
| ----------------------------- | -------------------------------------------- | --------------- | ----------- |
| Bundle size                   | <PackageInfo package="formit" type="size" /> | ~9 kB           | ~16 kB      |
| Framework-agnostic            | ✅                                           | React only      | Vue only    |
| Typed dot-path APIs           | ✅                                           | Partial         | Partial     |
| Global validation mode        | ✅                                           | ✅              | ✅          |
| Unified validation entrypoint | ✅                                           | ❌              | ❌          |
| Result-based submit flow      | ✅                                           | ❌              | ❌          |
| Live field observation        | ✅                                           | ✅              | ✅          |
| Full array helpers            | ✅                                           | ✅              | ✅          |
| Conditional field removal     | ✅                                           | ✅              | Partial     |
| Form + field subscriptions    | ✅                                           | ✅              | ✅          |
| Zero dependencies             | ✅                                           | ❌              | ❌          |

**Use Formit when** you want one typed form controller that works across frameworks or in vanilla apps with explicit, predictable state transitions.

**Consider framework-specific alternatives when** you need deeply integrated framework bindings and are not sharing form logic across runtimes.

## Features

- Typed field paths with compile-time value inference
- Explicit validation API: `validateAll()`, `validateTouched()`, and `validateFields(fields)`
- Single-field validation with `validateField(name)`
- Global validation mode: `mode: 'onSubmit' | 'onBlur' | 'onChange' | 'onTouched'`
- `submit(handler)` — returns `{ ok: true, value }` or `{ ok: false, errors }`
- Schema integration via `schemaValidator(schema)` for `safeParse`-compatible validators
- `removeField(name)` — clean conditional field lifecycle
- Full array helpers: `append`, `prepend`, `insert`, `remove`, `move`, `swap`, `replace`
- Explicit synchronous subscriptions: `subscribe` and `subscribeField`
- Stable frozen snapshots for `form.state` and `form.field(name)` (external-store friendly)
- Explicit touched and error controls: `touch`, `untouch`, `touchAll`, `untouchAll`, `setError`, `resetErrors`
- Mutation batching with `batch(fn)` and dynamic field validators via `setValidator(name, validator?)`
- Baseline-safe reset/replace model
- Browser-first utilities: vanilla-DOM `bind`, `toFormData`

## Compatibility

| Environment | Support |
| ----------- | ------- |
| Browser     | ✅      |

## Documentation

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)

## See Also

- [Validit](/validit/)
- [Fetchit](/fetchit/)
- [Stateit](/stateit/)

<!-- markdownlint-enable MD025 MD033 MD060 -->
