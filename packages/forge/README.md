---
description: Framework-agnostic typed form state with path-safe fields, unified validation API, deterministic submit flow, and browser-friendly helpers.
package: forge
category: forms
keywords: [form-state, validation, input, submission, dirty-tracking, controlled, field]
related: [sieve, ripple, courier]
exports: [createForm]
---

# /forge

> Framework-agnostic typed form state with path-safe fields, unified validation API, deterministic submit flow, and browser-friendly helpers.

[![npm version](https://img.shields.io/npm/v//forge)](https://www.npmjs.com/package//forge) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<details>
<summary>Quick Reference</summary>

**Package:** `/forge` &nbsp;·&nbsp; **Category:** Forms

**Key exports:** `createForm`

**When to use:** Framework-agnostic typed form state with path-safe fields, unified validation API, deterministic submit flow, and browser-friendly helpers.

**Related:** [@vielzeug/sieve](https://vielzeug.dev/sieve/) · [@vielzeug/ripple](https://vielzeug.dev/ripple/) · [@vielzeug/courier](https://vielzeug.dev/courier/)

</details>

`/forge` is part of Vielzeug and ships as a zero-dependency TypeScript package with ESM+CJS output.

## Installation

```sh
pnpm add /forge
npm install /forge
yarn add /forge
```

## Quick Start

```ts
import { createForm } from '/forge';

const form = createForm({
  defaultValues: { email: '', password: '' },
  validators: {
    email: (v) => (!String(v).includes('@') ? 'Invalid email' : undefined),
    password: (v) => (String(v).length < 8 ? 'Min 8 chars' : undefined),
  },
});

form.set('email', 'alice@example.com');

const result = await form.validateAll();
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
