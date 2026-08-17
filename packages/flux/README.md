# @vielzeug/flux

Minimal push streams for TypeScript. Streams are reusable; subscriptions own cancellation; async buffering is explicit. Provide an `error` observer when caller owns recovery.

## Install

```sh
pnpm add @vielzeug/flux
```

## Usage

```ts
import { toArray, interval, map, pipe, take } from '@vielzeug/flux';

const values = pipe(
  interval({ every: 100 }),
  map((value) => value * 2),
  take(3),
);

console.log(await toArray(values, { maxItems: 3 })); // [0, 2, 4]
```

## Channels

```ts
import { createChannel } from '@vielzeug/flux/subjects';

const events = createChannel<string>({ replay: 1 });
events.stream.subscribe(console.log);
events.send('connected');
events.dispose();
```

## Adapters

```ts
import { fromQuery } from '@vielzeug/flux/courier';
import { fromBus } from '@vielzeug/flux/herald';
import { fromRoomPresence } from '@vielzeug/flux/pulse';
import { fromSignal, toSignal } from '@vielzeug/flux/ripple';
```

## License

MIT
