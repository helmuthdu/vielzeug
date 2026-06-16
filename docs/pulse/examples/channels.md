---
title: 'Pulse Examples — Channel Multiplexing'
description: 'Channel multiplexing example for @vielzeug/pulse.'
---

## Channel Multiplexing

### Problem

Your application has several independent subsystems (chat, notifications, live data) that all share one WebSocket connection. Mixing their events into a single flat event map creates coupling and makes per-feature teardown difficult.

### Solution

Use `pulse.channel(name)` with per-channel typed message maps to scope each subsystem to its own namespace. Dispose channels independently without affecting the connection.

```ts
import { createPulse } from '@vielzeug/pulse';

// Per-channel message maps — each subsystem owns its own contract
type ChatServer = { message: { user: string; text: string } };
type ChatClient = { send: { text: string } };

type NotifServer = { alert: { level: 'info' | 'warn' | 'error'; msg: string } };

type PriceServer = { tick: { symbol: string; price: number; change: number } };
type PriceClient = { subscribe: { symbols: string[] } };

// One shared connection
const pulse = createPulse('wss://api.example.com/ws', { reconnect: true });

// Three independent channels
const chat = pulse.channel<ChatServer, ChatClient>('chat');
const notif = pulse.channel<NotifServer>('notifications');
const prices = pulse.channel<PriceServer, PriceClient>('market');

// Each channel has its own typed API
chat.on('message', ({ user, text }) => appendMessage(user, text));

notif.on('alert', ({ level, msg }) => {
  showToast(level, msg);
});

prices.on('tick', ({ symbol, price, change }) => {
  updatePriceCell(symbol, price, change);
});

// Send is scoped to the channel
chat.send('send', { text: 'Hello from chat!' });
prices.send('subscribe', { symbols: ['AAPL', 'GOOGL'] });

// Dispose a channel without closing the connection
notif.dispose();
notif.disposed; // true — chat and prices still active
```

#### Channel `wait()` and `once()`

```ts
// Await the next message within this channel only
const first = await chat.wait('message', { signal: AbortSignal.timeout(5_000) });
console.log('first chat message:', first.text);

// One-shot within a channel
prices.once('tick', ({ symbol, price }) => {
  console.log('initial tick for', symbol, price);
});
```

#### `using` for automatic channel cleanup

```ts
async function runPriceWidget(symbols: string[]) {
  using priceChannel = pulse.channel<PriceServer, PriceClient>('market');

  priceChannel.send('subscribe', { symbols });

  for (const symbol of symbols) {
    priceChannel.on('tick', ({ price }) => updateWidget(symbol, price));
  }

  await someUserAction(); // wait until the widget is hidden
} // priceChannel.dispose() called automatically — listeners removed, underlying connection intact
```

### Pitfalls

- **Each `pulse.channel()` call returns an independent object.** Two calls with the same name do not share listeners. Reuse the returned object for the lifetime of the feature.
- **Disposing a channel does not close the WebSocket.** Only `pulse.dispose()` does that.
- **Channel `send()` is a no-op when the underlying pulse is not open.** The channel does not buffer outgoing messages.

### Related

- [Basic Connection](./basic-connection.md)
- [Rooms and Presence](./rooms-and-presence.md)
