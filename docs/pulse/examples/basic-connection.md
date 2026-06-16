---
title: 'Pulse Examples — Basic Connection'
description: 'Basic connection lifecycle example for @vielzeug/pulse.'
---

## Basic Connection

### Problem

You need to open a typed WebSocket connection, receive server events, send client events, react to connection status changes, and clean up reliably on component or module teardown.

### Solution

Use `createPulse()` with typed `ServerEvents` and `ClientEvents` maps. Subscribe to status via a ripple `effect()` and call `dispose()` — or use a `using` declaration — for cleanup.

```ts
import { createPulse } from '@vielzeug/pulse';
import { effect } from '@vielzeug/ripple';

type ServerEvents = {
  'chat:message': { user: string; text: string };
  'user:joined': { userId: string };
  'user:left': { userId: string };
};

type ClientEvents = {
  'chat:send': { text: string };
};

// Connection opens immediately
const pulse = createPulse<ServerEvents, ClientEvents>('wss://api.example.com/ws', {
  onOpen: () => console.log('connection established'),
  onClose: (code, reason) => console.log('closed', code, reason),
});

// React to status changes
effect(() => {
  const el = document.querySelector('#status')!;
  el.textContent = pulse.status.value;
  el.dataset.open = String(pulse.status.value === 'open');
});

// Subscribe to typed server events
const unsubChat = pulse.on('chat:message', ({ user, text }) => {
  appendMessage(user, text);
});

pulse.on('user:joined', ({ userId }) => showToast(`${userId} joined`));
pulse.on('user:left', ({ userId }) => showToast(`${userId} left`));

// One-shot: await the first message before rendering the chat UI
const firstMessage = await pulse.wait('chat:message', { timeout: 10_000 });
renderChatUI(firstMessage);

// Send a typed client event
document.querySelector('#send-btn')!.addEventListener('click', () => {
  const input = document.querySelector<HTMLInputElement>('#msg')!;
  pulse.send('chat:send', { text: input.value });
  input.value = '';
});

// Explicit cleanup when the page/component unmounts
function teardown() {
  unsubChat();    // optional — pulse.dispose() also removes all listeners
  pulse.dispose();
}
```

#### With `using` (TypeScript 5.2+)

When you want automatic cleanup at block or function exit:

```ts
import { createPulse } from '@vielzeug/pulse';

async function startSession() {
  using pulse = createPulse<ServerEvents, ClientEvents>('wss://api.example.com/ws');

  pulse.on('chat:message', ({ user, text }) => appendMessage(user, text));

  await pulse.wait('user:joined', { timeout: 30_000 });
  console.log('someone joined the session');
} // dispose() called automatically here
```

### Pitfalls

- **`send()` is a no-op before the socket is open.** If you need to send immediately on construction, `await pulse.connect()` first.
- **Disposing does not buffer pending messages.** Any `send()` call after `dispose()` is silently dropped.
- **Multiple instances = multiple sockets.** Create one `createPulse` instance per URL and share it across your application.

### Related

- [Channel Multiplexing](./channels.md)
- [Reconnect and Heartbeat](./reconnect-and-heartbeat.md)
