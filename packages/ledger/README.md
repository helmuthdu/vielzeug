# @vielzeug/ledger

> Serialized reversible command history with atomic framework-neutral state and cancellation ownership

## Installation

```sh
pnpm add @vielzeug/ledger
npm install @vielzeug/ledger
yarn add @vielzeug/ledger
```

## Quick Start

```ts
import { createLedger } from '@vielzeug/ledger';

let value = 'before';
const ledger = createLedger();

await ledger.do({
  apply: () => { value = 'after'; },
  label: 'Rename value',
  revert: () => { value = 'before'; },
});

await ledger.undo();
console.log(ledger.state.value.undo.length); // 0
ledger.dispose();
```

## Documentation

- [Overview](https://vielzeug.dev/ledger/)
- [Usage Guide](https://vielzeug.dev/ledger/usage)
- [API Reference](https://vielzeug.dev/ledger/api)
- [Examples](https://vielzeug.dev/ledger/examples)
- [Migration Guide](https://vielzeug.dev/ledger/migration)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
