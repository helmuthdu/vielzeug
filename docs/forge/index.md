---
title: Forge — Form state management for TypeScript
description: Framework-agnostic typed form state with path-safe fields, unified validation API, deterministic submit flow, and browser-friendly helpers.
package: forge
category: forms
keywords: [form-state, validation, input, submission, dirty-tracking, controlled, field]
related: [spell, ripple, courier]
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

**When to use:** Typed form state with field validation, dirty tracking, submission handling, and browser helpers. Works with any UI framework or vanilla JS.

**Related:** [Spell](/spell/) · [Ripple](/ripple/) · [Courier](/courier/)

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
  validators: {
    email: (v) => (!String(v).includes('@') ? 'Invalid email' : undefined),
    password: (v) => (String(v).length < 8 ? 'Min 8 chars' : undefined),
  },
});

const { valid, errors } = await form.validate();

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

if (!submission.ok && submission.type === 'validation') {
  console.log(submission.errors);
}
```

## Why Forge?

Native form handling quickly grows repetitive when you need typed values, deterministic submit behavior, and granular subscriptions.

```ts
// Before: manual state and ad-hoc validation sequencing
const errors: Record<string, string> = {};
if (!email.includes('@')) errors.email = 'Invalid email';
if (password.length < 8) errors.password = 'Too short';
if (Object.keys(errors).length === 0) await submit({ email, password });

// After: one form controller with explicit transitions
const form = createForm({
  defaultValues: { email: '', password: '' },
  validators: { email: isEmail, password: min8 },
});
await form.submit(submit);
```

| Feature                    | Forge                                       | React Hook Form | VeeValidate |
| -------------------------- | ------------------------------------------- | --------------- | ----------- |
| Bundle size                | <PackageInfo package="forge" type="size" /> | ~9 kB           | ~16 kB      |
| Framework-agnostic         | ✅                                          | React only      | Vue only    |
| Typed dot-path APIs        | ✅                                          | Partial         | Partial     |
| Result-based submit flow   | ✅                                          | ❌              | ❌          |
| Live field observation     | ✅                                          | ✅              | ✅          |
| Full array helpers         | ✅                                          | ✅              | ✅          |
| Scoped sub-forms           | ✅                                          | ❌              | ❌          |
| Form + field subscriptions | ✅                                          | ✅              | ✅          |
| Zero dependencies          | ✅                                          | ❌              | ❌          |

**Use Forge when** you want one typed form controller that works across frameworks or in vanilla apps with explicit, predictable state transitions.

**Consider framework-specific alternatives when** you need deeply integrated framework bindings and are not sharing form logic across runtimes.

## Features

- Typed field paths with compile-time value inference
- Explicit validation API: `validate()` and `validateFields(fields)`
- Single-field validation with `validateField(name)`
- Streaming validation with `validateStream()` — yields each field result as it resolves, read-only
- Per-connection validation triggers via `connect()` with `ValidationModes` presets
- `connect()` bindings own independent debounce timers; call `disconnect()` on unmount
- `submit(handler)` — returns `{ ok: true, value }` or `{ ok: false, errors }`
- Schema integration: pass any `safeParse`-compatible schema directly to `validator`
- `scope(prefix)` — memoized scoped sub-forms that share parent state with relative field paths
- `subscribeScoped()` — filtered subscription that only fires on changes within the scope's prefix
- `snapshot()` / `restore()` — capture and replay complete form state
- `removeField(name)` — clean conditional field lifecycle
- Full array helpers: `append`, `prepend`, `insert`, `remove`, `move`, `swap`, `replace`
- Explicit synchronous subscriptions: `subscribe`, `subscribeField`, and `subscribeScoped`
- Stable frozen snapshots for `form.state` and `form.field(name)` (external-store friendly)
- Explicit touched and error controls: `touch`, `untouch`, `touchAll`, `untouchAll`, `setError`, `resetErrors`
- Mutation batching with `batch(fn)` and dynamic field validators via `setValidator`
- Baseline-safe `reset`/`replace`/`patch` model
- Browser-first utility: `toFormData`
- Ready-made adapters for React, Vue, and Svelte
- `@vielzeug/forge/validators` adapter: `fieldValidator` and `composeValidators`

## Compatibility

| Environment | Support |
| ----------- | ------- |
| Browser     | ✅      |
| Node.js 22+ | ✅      |

## Documentation

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)

## See Also

- [Spell](/spell/)
- [Courier](/courier/)
- [Ripple](/ripple/)

<!-- markdownlint-enable MD025 MD033 MD060 -->
