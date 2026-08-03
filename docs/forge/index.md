---
title: Forge — Immutable form state for TypeScript
description: Framework-agnostic immutable form state with focused object fields and explicit validation results.
package: forge
category: forms
keywords: [form-state, validation, immutable, input, submission]
related: [spell, vault, courier]
exports: [createForm, toFormData, bindField, customValidator, saveForm, loadForm]
environments: [browser, node, ssr, deno]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageHero package="forge" />

## Why Forge?

Native form state becomes difficult to inspect once values, validation, draft restoration, and UI bindings share mutable objects. Forge owns one immutable value tree and gives you typed handles for object branches without string paths, scoped controllers, or framework state.

```ts
// Before
const values = { email: '', password: '' };
const errors: Record<string, string> = {};

function submit() {
  errors.email = values.email.includes('@') ? '' : 'Invalid email';
  errors.password = values.password.length >= 8 ? '' : 'Use at least eight characters';
}

// After
const form = createForm({
  initialValues: { email: '', password: '' },
  validate: (value) => ({
    fields: {
      email: value.email.includes('@') ? undefined : 'Invalid email',
      password: value.password.length >= 8 ? undefined : 'Use at least eight characters',
    },
  }),
});
```

| Feature | Forge | Native form state | Framework-owned form state |
| --- | --- | --- | --- |
| Bundle size | <PackageInfo package="forge" type="size" /> | <ore-icon name="check" size="16"></ore-icon> | Varies |
| Zero external dependencies | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon> |
| Immutable nested values | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon> | Varies |
| Typed object field handles | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon> | Varies |
| Framework-independent state | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon> |

<div class="decision-callout">

**Use Forge when** form state needs framework-independent immutable values, typed object fields, and one explicit validation boundary.

**Consider framework-owned form state when** application only needs a single UI framework's native input bindings.

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

Install `@vielzeug/spell` or `@vielzeug/vault` only when importing Forge's matching optional adapter.

## Quick Start

Create a form, update a focused field, and submit only after validation passes.

```ts
import { createForm } from '@vielzeug/forge';

const form = createForm({
  initialValues: { profile: { email: '', name: '' } },
  validate: (value) => ({
    fields: { profile: { email: value.profile.email.includes('@') ? undefined : 'Invalid email' } },
  }),
});

form.field('profile').field('email').set('ada@example.com');

const result = await form.submit(async (value) => {
  const response = await fetch('/api/profile', {
    body: JSON.stringify(value),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  });

  return response.ok;
});

if (!result.ok && result.type === 'validation') console.log(result.errors);
```

## Features

<div class="features-grid">

- `form.value` exposes one immutable nested value tree.
- `form.field(key)` selects typed object branches without string paths.
- `field.set(updater)` replaces array values without index handles.
- `form.validate()` returns valid, invalid, or aborted results.
- `form.submit(handler)` touches, validates, and invokes the handler when valid.
- `bindField()` connects one DOM element without owning validation timing.
- `customValidator()` maps Spell schema errors into Forge fields.
- `saveForm()` and `loadForm()` persist explicit Vault draft records.

</div>

## Documentation

<div class="doc-links">

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)

</div>

## See Also

<div class="see-also">

- [Spell](/spell/) — adapt a Spell schema through `customValidator()`.
- [Vault](/vault/) — save and restore explicit Forge draft records.
- [Courier](/courier/) — send a validated form value through a mutation.

</div>

<!-- markdownlint-enable -->
