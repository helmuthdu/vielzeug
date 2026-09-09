# @vielzeug/ward

> Ordered authorization rules with immutable policies and typed decisions

## Installation

```sh
pnpm add @vielzeug/ward
npm install @vielzeug/ward
yarn add @vielzeug/ward
```

## Quick Start

```ts
import { ANONYMOUS, WILDCARD, allow, createWard, deny, predicate } from '@vielzeug/ward';

type Action = 'read' | 'update';
type Resource = 'posts';
type Attributes = { authorId: string };

const ward = createWard<Action, Resource, Attributes>([
  deny('blocked', WILDCARD, [WILDCARD]),
  allow(ANONYMOUS, 'posts', ['read']),
  allow('viewer', 'posts', ['read']),
  allow<Action, Resource, Attributes>('editor', 'posts', ['update'], {
    when: predicate.owns<Attributes>('authorId'),
  }),
]);

const principal = { id: 'u1', roles: ['editor'] };
const decision = ward.decide({
  action: 'update',
  attributes: { authorId: 'u1' },
  principal,
  resource: 'posts',
});

if (decision.effect === 'allow') {
  console.log('update permitted');
}
```

## Documentation

- [Overview](https://vielzeug.dev/ward/)
- [Usage Guide](https://vielzeug.dev/ward/usage)
- [API Reference](https://vielzeug.dev/ward/api)
- [Examples](https://vielzeug.dev/ward/examples)
- [Migration Guide](https://vielzeug.dev/ward/migration)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
