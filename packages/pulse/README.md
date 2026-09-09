# @vielzeug/pulse

> Typed WebSocket client with channels, rooms, presence, reconnect

## Installation

```sh
pnpm add @vielzeug/pulse
npm install @vielzeug/pulse
yarn add @vielzeug/pulse
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
});
pulse.tap((event) => {
  if (event.type === 'error') console.error(event.error);
  if (event.type === 'status-change') console.log('status:', event.status);
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

## Documentation

- [Overview](https://vielzeug.dev/pulse/)
- [Usage Guide](https://vielzeug.dev/pulse/usage)
- [API Reference](https://vielzeug.dev/pulse/api)
- [Examples](https://vielzeug.dev/pulse/examples)
- [Migration Guide](https://vielzeug.dev/pulse/migration)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
