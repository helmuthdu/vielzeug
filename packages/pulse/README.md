# @vielzeug/pulse

Typed WebSocket sessions with explicit connection ownership, scoped channels, reactive presence, reconnect restoration, and heartbeat support.

## Install

```sh
pnpm add @vielzeug/pulse @vielzeug/ripple
```

## Quick Start

```ts
import { createPulse } from '@vielzeug/pulse';

type ServerEvents = { 'chat:message': { text: string } };
type ClientEvents = { 'chat:send': { text: string } };
type Channels = {
  chat: {
    client: { send: { text: string } };
    server: { message: { text: string } };
  };
};
type Presence = { lobby: { name: string } };

const pulse = createPulse<ServerEvents, ClientEvents, Channels, Presence>('wss://api.example.com/ws', {
  reconnect: true,
  onError: (error) => console.error(error),
});

const chat = pulse.channel('chat');
const lobby = pulse.presence('lobby');

try {
  await pulse.connect();
  chat.send('send', { text: 'Hello!' });
  lobby.update({ name: 'Ada' });
} catch (error) {
  console.error('Pulse connection failed:', error);
}

pulse.dispose();
```

## Key Behavior

- Call `connect()` before sending, joining rooms, or publishing presence.
- Define root events, channel events, and presence state at `createPulse()` so named scopes are type-safe.
- Each `channel()` and `presence()` call returns an independent disposable scope. Server subscriptions and rooms use reference counting.
- Reconnect restores channels, desired rooms, and the last successfully published local presence state.
- `send()` throws `PulseConnectionError` while disconnected; Pulse never silently drops or buffers application messages.
- `onError` receives typed transport and protocol errors.

## Migration

See the [Pulse migration guide](https://vielzeug.dev/pulse/migration).

## Documentation

- [Overview](https://vielzeug.dev/pulse/)
- [Usage](https://vielzeug.dev/pulse/usage)
- [API](https://vielzeug.dev/pulse/api)
- [Examples](https://vielzeug.dev/pulse/examples)
- [Pulse 3.0 Migration](https://vielzeug.dev/pulse/migration)
