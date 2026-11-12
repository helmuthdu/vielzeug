# @vielzeug/patchwork

> RFC 6902 JSON Patch: structural diff, immutable apply, and guarded tryApply for sync protocols.

## Installation

```sh
pnpm add @vielzeug/patchwork
npm install @vielzeug/patchwork
yarn add @vielzeug/patchwork
```

## Quick Start

```ts
import { apply, diff, tryApply } from '@vielzeug/patchwork';

const doc = { items: ['a'], title: 'Cart' };
const patch = diff(doc, { items: ['a', 'b'], title: 'Wagen' });
// [{ op: 'add', path: '/items/-', value: 'b' }, { op: 'replace', path: '/title', value: 'Wagen' }]

const next = apply(doc, patch); // doc untouched; untouched subtrees keep their identity

tryApply(doc, [{ op: 'test', path: '/title', value: 'Other' }]);
// { ok: false, error: { index: 0, path: '/title', reason: 'test', message: … } }
```

Zero runtime dependencies. `apply` is copy-on-write, so memoized selectors recompute only
over the branches a patch actually touched; `tryApply` turns a failed `test` into data you
can log and reply to, which is what conflict handling in sync protocols needs.

## Documentation

- [Overview](https://vielzeug.dev/patchwork/)
- [Usage Guide](https://vielzeug.dev/patchwork/usage)
- [API Reference](https://vielzeug.dev/patchwork/api)
- [Examples](https://vielzeug.dev/patchwork/examples)
- [Migration Guide](https://vielzeug.dev/patchwork/migration)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu): part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
