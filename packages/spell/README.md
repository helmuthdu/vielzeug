# @vielzeug/spell

> Zero-dependency schema validation with Standard Schema interoperability

## Installation

```sh
pnpm add @vielzeug/spell
npm install @vielzeug/spell
yarn add @vielzeug/spell
```

## Quick Start

```ts
import { s, type Infer } from '@vielzeug/spell';

const UserSchema = s.object({
  id: s.coerce.number().int().positive(),
  name: s.string().trim().min(1),
  email: s.string().trim().email(),
  role: s.union('admin', 'editor', 'viewer').default('viewer'),
  tags: s.array(s.string()).unique().default([]),
});

type User = Infer<typeof UserSchema>;

const result = UserSchema.safeParse({ id: '42', name: 'Ada', email: 'ada@example.com' });

if (result.success) {
  const user: User = result.data;
  console.log(user.id); // 42

  // Assertion form — narrows type, throws SpellValidationError on failure
  UserSchema.assert(result.data, 'user');
} else {
  const { fieldErrors, formErrors } = result.error.flattenFirst();
  console.log(fieldErrors, formErrors);
}
```

## Documentation

- [Overview](https://vielzeug.dev/spell/)
- [Usage Guide](https://vielzeug.dev/spell/usage)
- [API Reference](https://vielzeug.dev/spell/api)
- [Examples](https://vielzeug.dev/spell/examples)
- [Migration Guide](https://vielzeug.dev/spell/migration)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
