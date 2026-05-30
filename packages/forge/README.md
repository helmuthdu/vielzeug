---
description: Framework-agnostic typed form state with path-safe fields, unified validation API, deterministic submit flow, and browser-friendly helpers.
package: forge
category: forms
keywords: [form-state, validation, input, submission, dirty-tracking, controlled, field]
related: [spell, ripple, courier]
exports: [createForm]
---

# @vielzeug/forge

> Framework-agnostic typed form state with path-safe fields, unified validation API, deterministic submit flow, and browser-friendly helpers.

[![npm version](https://img.shields.io/npm/v/@vielzeug/forge)](https://www.npmjs.com/package/@vielzeug/forge) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<details>
<summary>Quick Reference</summary>

**Package:** `@vielzeug/forge` &nbsp;·&nbsp; **Category:** Forms

**Key exports:** `createForm`

**When to use:** Typed form state with field validation, dirty tracking, submission handling, and browser helpers. Works with any UI framework or vanilla JS.

**Related:** [@vielzeug/spell](https://vielzeug.dev/spell/) · [@vielzeug/ripple](https://vielzeug.dev/ripple/) · [@vielzeug/courier](https://vielzeug.dev/courier/)

</details>

`@vielzeug/forge` is part of Vielzeug and ships as a zero-dependency TypeScript package with ESM+CJS output.

## Installation

```sh
pnpm add @vielzeug/forge
npm install @vielzeug/forge
yarn add @vielzeug/forge
```

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

form.set('email', 'alice@example.com');

const result = await form.validate();
console.log(result.valid, result.errors);

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

## Documentation

- [Overview](https://vielzeug.dev/forge/)
- [Usage Guide](https://vielzeug.dev/forge/usage)
- [API Reference](https://vielzeug.dev/forge/api)
- [Examples](https://vielzeug.dev/forge/examples)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
