# @vielzeug/pulse

Typed WebSocket client with channel multiplexing, room management, reactive presence, auto-reconnect, and heartbeat — built on `@vielzeug/ripple` signals.

## Install

```sh
pnpm add @vielzeug/pulse @vielzeug/ripple
```

## Quick Start

```ts
import { createPulse } from '@vielzeug/pulse';
import { effect } from '@vielzeug/ripple';

type ServerEvents = {
  'chat:message': { user: string; text: string };
  'user:joined': { userId: string };
};

type ClientEvents = {
  'chat:send': { text: string };
};

const pulse = createPulse<ServerEvents, ClientEvents>('wss://api.example.com/ws', {
  reconnect: { maxAttempts: 5 },
  heartbeat: true,
});

// Reactive status via ripple signal
effect(() => console.log('status:', pulse.status.value));

// Typed server events
pulse.on('chat:message', ({ user, text }) => console.log(`${user}: ${text}`));

// Typed client messages
pulse.send('chat:send', { text: 'Hello!' });

// Isolated channel namespace
const notif = pulse.channel<{ alert: { level: string; msg: string } }>('notifications');
notif.on('alert', ({ level, msg }) => console.log(`[${level}] ${msg}`));

// Reactive presence tracking
const lobby = pulse.presence<{ name: string; status: string }>('lobby');
effect(() => console.log('online:', [...lobby.state.value.keys()]));
lobby.update({ name: 'Alice', status: 'active' });

// Clean disposal
using _ = pulse;
```

## Features

- **Typed event maps** — `TServer` and `TClient` generics enforce payload types at compile time
- **`on()` / `once()` / `wait()`** — persistent, one-shot, and async-await subscriptions
- **`channel()`** — isolated namespaces multiplexed over the shared connection
- **`join()` / `leave()`** — room membership with server-confirmation promises
- **`presence()`** — reactive `Signal<Map<memberId, T>>` with `onJoin`/`onLeave` callbacks
- **Middleware** — intercept outgoing `send()` calls; omit `next()` to suppress
- **Auto-reconnect** — exponential backoff, configurable `maxAttempts` and `delay`
- **Heartbeat** — ping/pong keep-alive with dead-connection detection
- **Reactive signals** — `pulse.status` and `pulse.rooms` are ripple `ReadonlySignal`s
- **`dispose()` + `[Symbol.dispose]`** — deterministic teardown via `using` declarations

## Documentation

Full docs at [vielzeug.dev/pulse](https://vielzeug.dev/pulse/).
