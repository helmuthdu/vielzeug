---
title: Forge — Immutable typed form state
description: Framework-neutral form and field state with nested handles, flat validation issues, and explicit integration helpers.
package: forge
category: state
keywords: [forms, validation, fields, immutable, standard schema, formdata]
exports: [createForm]
related: [spell, vault, assay]
environments: [browser, node, ssr, deno]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageHero package="forge" />

## Why Forge?

Forge owns form state without owning rendering or validation timing. Nested field handles keep access typed, flat validation issues compose across arrays and unions, and Forge-owned validation and persistence operations settle on cancellation.

## Quick Start

```ts
import { createForm } from '@vielzeug/forge';

const form = createForm({
  initialValues: { email: '', profile: { name: '' } },
  validate: (values) =>
    values.email.includes('@') ? undefined : [{ path: ['email'], message: 'Invalid email' }],
});

form.field('profile').field('name').set('Ada');
const result = await form.validate();
```

| Feature | Forge | Local component state |
| --- | --- | --- |
| Bundle size | <PackageInfo package="forge" type="size" /> | n/a |
| Nested typed fields | <ore-icon name="check" size="16"></ore-icon> | Manual |
| Flat validation issues | <ore-icon name="check" size="16"></ore-icon> | Manual |
| Abortable validation | <ore-icon name="check" size="16"></ore-icon> | Manual |
| Framework-neutral | <ore-icon name="check" size="16"></ore-icon> | Varies |
| Zero third-party dependencies | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="check" size="16"></ore-icon> |

<div class="decision-callout">

**Use Forge when** several fields need coordinated validation, submission, dirty/touched state, nested updates, or explicit persistence.

**Use local state when** a form has only one or two fields and no shared validation lifecycle.

</div>

## Installation

```sh
pnpm add @vielzeug/forge
```

## Features

<div class="features-grid">

- `createForm()` — deeply readonly form state with structural sharing and cloned dates
- `field().field()` — typed nested field handles
- Flat `{ path, message }` validation issues
- Explicit `validate()` and `submit()` timing
- `/dom` — optional element binding
- `/schema` — validator-agnostic Standard Schema adapter
- `/persist` — explicit structural store integration
- `/form-data` — browser submission serialization

</div>

## Documentation

<div class="doc-links">

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)
- [Migration Guide](./migration.md)

</div>

## See Also

- [Spell](/spell/) — Standard Schema-compatible validation.
- [Vault](/vault/) — durable typed storage for drafts.
- [Assay](/assay/) — DOM test helpers for form interaction.

<!-- markdownlint-enable MD025 MD033 MD060 -->
