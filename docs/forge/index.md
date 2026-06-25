---
title: Forge — Form state management for TypeScript
description: Framework-agnostic typed form state with path-safe fields, unified validation API, deterministic submit flow, and browser-friendly helpers.
package: forge
category: forms
keywords: [form-state, validation, input, submission, dirty-tracking, controlled, field]
related: [spell, ripple, courier]
exports: [createForm, toFormData, ValidationModes, FORM_ERROR]
environments: [browser, node, ssr, deno]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageHero package="forge" />

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

| Feature                    | Forge                                       | React Hook Form                            | VeeValidate                                |
| -------------------------- | ------------------------------------------- | ------------------------------------------ | ------------------------------------------ |
| Bundle size                | <PackageInfo package="forge" type="size" /> | ~9 kB                                      | ~16 kB                                     |
| Framework-agnostic         | <ore-icon name="check" size="16"></ore-icon>  | React only                                 | Vue only                                   |
| Typed dot-path APIs        | <ore-icon name="check" size="16"></ore-icon>  | Partial                                    | Partial                                    |
| Result-based submit flow   | <ore-icon name="check" size="16"></ore-icon>  | <ore-icon name="x" size="16"></ore-icon>     | <ore-icon name="x" size="16"></ore-icon>     |
| Live field observation     | <ore-icon name="check" size="16"></ore-icon>  | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="check" size="16"></ore-icon> |
| Full array helpers         | <ore-icon name="check" size="16"></ore-icon>  | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="check" size="16"></ore-icon> |
| Scoped sub-forms           | <ore-icon name="check" size="16"></ore-icon>  | <ore-icon name="x" size="16"></ore-icon>     | <ore-icon name="x" size="16"></ore-icon>     |
| Form + field subscriptions | <ore-icon name="check" size="16"></ore-icon>  | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="check" size="16"></ore-icon> |
| Zero dependencies          | <ore-icon name="check" size="16"></ore-icon>  | <ore-icon name="x" size="16"></ore-icon>     | <ore-icon name="x" size="16"></ore-icon>     |

<div class="decision-callout">

**Use Forge when** you want one typed form controller that works across frameworks or in vanilla apps with explicit, predictable state transitions.

**Consider framework-specific alternatives when** you need deeply integrated framework bindings and are not sharing form logic across runtimes.

</div>

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

## Features

<div class="features-grid">

- Typed field paths with compile-time value inference
- Explicit validation API: `validate()`, `validate(name)`, and `validate(fields[])`
- Streaming validation with `validateStream()` — yields each field result as it resolves, read-only
- Per-connection validation triggers via `connect()` with `ValidationModes` presets
- `connect()` bindings own independent debounce timers; call `binding.dispose()` on unmount
- `submit(handler)` — returns `{ ok: true, value }` or `{ ok: false, errors }`
- Schema integration: pass any `safeParse`-compatible schema directly to `validator`
- `scope(prefix)` — memoized scoped sub-forms that share parent state with relative field paths
- `subscribeScoped()` — filtered subscription that only fires on changes within the scope's prefix
- `snapshot()` / `restore()` — capture and replay complete form state
- `form.fields.remove(name)` — clean conditional field lifecycle
- Full array helpers: `append`, `prepend`, `insert`, `remove`, `move`, `swap`, `replace`
- Explicit synchronous subscriptions: `subscribe`, `subscribeField`, and `subscribeScoped`
- Stable frozen snapshots for `form.state` and `form.field(name)` (external-store friendly)
- Explicit touched and error controls: `touch`, `untouch`, `touchAll`, `untouchAll`, `setError`, `resetErrors`
- Mutation batching with `batch(fn)` and dynamic field validators via `fields.setValidator`
- Baseline-safe `reset`/`replace`/`patch` model
- Browser-first utility: `toFormData`
- Ready-made adapters for React, Vue, and Svelte
- `@vielzeug/forge/validators` adapter: `fieldValidator` and `composeValidators`

</div>

## Documentation

<div class="doc-links">

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)

</div>

## See Also

<div class="see-also">

- [Spell](/spell/) — schema validation; plug a Spell schema into Forge to validate fields and submission payloads with full type inference
- [Courier](/courier/) — HTTP client; submit Forge's validated payload directly through a Courier mutation with loading and error state wired automatically
- [Ripple](/ripple/) — reactive signals; Forge exposes field values and submission state as signals for fine-grained reactive UI updates

</div>

<!-- markdownlint-enable MD025 MD033 MD060 -->
