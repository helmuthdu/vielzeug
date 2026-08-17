# @vielzeug/pulse

Typed WebSocket sessions with explicit connection ownership, scoped channels, ref-counted rooms with reactive presence, reconnect restoration, and heartbeat support.

## Install

```sh
pnpm add @vielzeug/pulse @vielzeug/ripple
```

## Quick Start

```ts
import { createPulse } from '@vielzeug/pulse';

type Schema = {
  server: { 'chat:message': { text: string } };
  client: { 'chat:send': { text: string } };
  channels: {
    chat: {
      client: { send: { text: string } };
      server: { message: { text: string } };
    };
  };
  rooms: {
    lobby: { presence: { name: string } };
  };
};

const pulse = createPulse<Schema>('wss://api.example.com/ws', {
  reconnect: true,
  onError: (error) => console.error(error),
});

const chat = pulse.channel('chat');
const lobby = pulse.room('lobby');

try {
  await pulse.connect();
  chat.send('send', { text: 'Hello!' });
  await lobby.joined;
  lobby.updatePresence({ name: 'Ada' });
} catch (error) {
  console.error('Pulse connection failed:', error);
}

pulse.dispose();
```

## Key Behavior

- Call `connect()` before sending messages or publishing presence. Room scopes can be created before connecting — joins are sent after the connection opens.
- Define server events, client events, channel schemas, and room schemas at `createPulse()` so named scopes are type-safe.
- Each `channel()` and `room()` call returns an independent disposable scope. Server subscriptions and room memberships use reference counting.
- Reconnect restores channels, room memberships, and the last successfully published local presence state.
- `send()` throws `PulseConnectionError` while disconnected; Pulse never silently drops or buffers application messages.
- `room()` returns a `RoomScope` with a `joined` promise. When the room definition includes `presence`, the scope also exposes reactive presence state, `updatePresence()`, and `onJoin()`/`onLeave()` handlers.
- `onError` receives typed transport and protocol errors.

## Migration

See the [Pulse migration guide](https://vielzeug.dev/pulse/migration).

## Documentation

- [Overview](https://vielzeug.dev/pulse/)
- [Usage](https://vielzeug.dev/pulse/usage)
- [API](https://vielzeug.dev/pulse/api)
- [Examples](https://vielzeug.dev/pulse/examples)
- [Pulse Migration](https://vielzeug.dev/pulse/migration)
