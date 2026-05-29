---
title: Forge — Form state management for TypeScript
description: Framework-agnostic typed form state with path-safe fields, unified validation API, deterministic submit flow, and browser-friendly helpers.
package: forge
category: forms
keywords: [form-state, validation, input, submission, dirty-tracking, controlled, field]
related: [sieve, ripple, courier]
exports: [createForm]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageBadges package="forge" />

<img src="/logo-forge.svg" alt="Forge logo" width="156" class="logo-highlight"/>

# Forge

<details>
<summary>⚡ Quick Reference</summary>

**Package:** `@vielzeug/forge` &nbsp;·&nbsp; **Category:** Forms

**Key exports:** `createForm`

**When to use:** Typed form state with field validation, dirty tracking, submission handling, and file upload support. Works with any UI.

**Related:** [Sieve](/sieve/) · [Ripple](/ripple/) · [Courier](/courier/)

</details>

`@vielzeug/forge` is a typed, framework-agnostic form controller for values, errors, dirty and touched state, validation, and submission.


## Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/forge
```

```sh [npm]
npm install @vielzeug/forge
```

```sh [yarn]
yarn add @vielzeug/forge
```

:::

## Quick Start

```ts
import { createForm } from '@vielzeug/forge';

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

## Why Forge?

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

| Feature                       | Forge                                       | React Hook Form | VeeValidate |
| ----------------------------- | -------------------------------------------- | --------------- | ----------- |
| Bundle size                   | <PackageInfo package="forge" type="size" /> | ~9 kB           | ~16 kB      |
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

**Use Forge when** you want one typed form controller that works across frameworks or in vanilla apps with explicit, predictable state transitions.

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

- [Sieve](/sieve/)
- [Courier](/courier/)
- [Ripple](/ripple/)

<!-- markdownlint-enable MD025 MD033 MD060 -->
