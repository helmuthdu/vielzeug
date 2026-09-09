# @vielzeug/clockwork

> Framework-neutral finite state machines with pure transitions and actors

## Installation

```sh
pnpm add @vielzeug/clockwork
npm install @vielzeug/clockwork
yarn add @vielzeug/clockwork
```

## Quick Start

```ts
import { defineMachine } from '@vielzeug/clockwork';

type Event = { type: 'INC' } | { type: 'RESET' };

const counter = defineMachine<{ count: number }, Event>()({
  context: { count: 0 },
  initial: 'idle',
  states: {
    idle: {
      on: {
        INC: { reduce: ({ context }) => ({ count: context.count + 1 }), target: 'idle' },
        RESET: { reduce: () => ({ count: 0 }), target: 'idle' },
      },
    },
  },
});

const actor = counter.createActor();
actor.send({ type: 'INC' });

console.log(actor.snapshot);
// { state: 'idle', context: { count: 1 } }

actor.dispose();
```

## Documentation

- [Overview](https://vielzeug.dev/clockwork/)
- [Usage Guide](https://vielzeug.dev/clockwork/usage)
- [API Reference](https://vielzeug.dev/clockwork/api)
- [Examples](https://vielzeug.dev/clockwork/examples)
- [Migration Guide](https://vielzeug.dev/clockwork/migration)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
