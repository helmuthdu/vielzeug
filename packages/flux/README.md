# @vielzeug/flux

Composable stream primitive with hot/cold semantics, backpressure, and adapters for the vielzeug ecosystem.

## Install

```sh
pnpm add @vielzeug/flux
```

## Usage

```ts
import { flux, merge, fromBus, fromSignal, debounce, toSignal } from '@vielzeug/flux';

// Cold stream — each subscriber gets its own producer
const count$ = flux<number>((observer) => {
  let i = 0;
  const id = setInterval(() => observer.next(i++), 1000);
  return () => clearInterval(id);
});

// Compose with operators
const even$ = count$.pipe(
  filter((n) => n % 2 === 0),
  map((n) => n * 2),
);

// Bridge to ripple signal
const latest = toSignal(even$, { initial: 0 });

// Merge ecosystem sources
const messages = toSignal(
  merge(fromPulse(pulse, 'chat:message'), fromBus(localBus, 'draft')).pipe(debounce(100)),
  { initial: [] },
);
```

## Adapters

```ts
import { fromSignal, toSignal } from '@vielzeug/flux';   // ripple
import { fromBus, toBus } from '@vielzeug/flux';          // herald
import { fromPulse, fromPresence } from '@vielzeug/flux'; // pulse
import { fromSse, fromQuery } from '@vielzeug/flux'; // courier
```

## License

MIT
