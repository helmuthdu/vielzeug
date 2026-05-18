---
description: Framework-agnostic typed form state with path-safe fields, unified validation API, deterministic submit flow, and browser-friendly helpers.
package: formit
category: forms
keywords: [form-state, validation, input, submission, dirty-tracking, controlled, field]
related: [validit, stateit, fetchit]
exports: [createForm]
---

# @vielzeug/formit

> Framework-agnostic typed form state with path-safe fields, unified validation API, deterministic submit flow, and browser-friendly helpers.

[![npm version](https://img.shields.io/npm/v/@vielzeug/formit)](https://www.npmjs.com/package/@vielzeug/formit) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<details>
<summary>Quick Reference</summary>

**Package:** `@vielzeug/formit` &nbsp;·&nbsp; **Category:** Forms

**Key exports:** `createForm`

**When to use:** Framework-agnostic typed form state with path-safe fields, unified validation API, deterministic submit flow, and browser-friendly helpers.

**Related:** [@vielzeug/validit](https://vielzeug.dev/validit/) · [@vielzeug/stateit](https://vielzeug.dev/stateit/) · [@vielzeug/fetchit](https://vielzeug.dev/fetchit/)

</details>

`@vielzeug/formit` is part of Vielzeug and ships as a zero-dependency TypeScript package with ESM+CJS output.

## Installation

```sh
pnpm add @vielzeug/formit
npm install @vielzeug/formit
yarn add @vielzeug/formit
```

## Quick Start

```ts
import { createForm } from '@vielzeug/formit';

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

- [Overview](https://vielzeug.dev/formit/)
- [Usage Guide](https://vielzeug.dev/formit/usage)
- [API Reference](https://vielzeug.dev/formit/api)
- [Examples](https://vielzeug.dev/formit/examples)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
