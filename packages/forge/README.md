# @vielzeug/forge

> Typed form state, validation, submission

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
  initialValues: { profile: { email: '', name: '' } },
  validate: (value) =>
    value.profile.email.includes('@')
      ? undefined
      : [{ path: ['profile', 'email'], message: 'Enter a valid email' }],
});

const email = form.field('profile').field('email');
email.set('ada@example.com');

const result = await form.submit((value) => saveProfile(value));
```

## Documentation

- [Overview](https://vielzeug.dev/forge/)
- [Usage Guide](https://vielzeug.dev/forge/usage)
- [API Reference](https://vielzeug.dev/forge/api)
- [Examples](https://vielzeug.dev/forge/examples)
- [Migration Guide](https://vielzeug.dev/forge/migration)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
