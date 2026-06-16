---
title: 'Pulse Examples — Reconnect and Heartbeat'
description: 'Auto-reconnect and heartbeat keep-alive configuration for @vielzeug/pulse.'
---

## Reconnect and Heartbeat

### Problem

A WebSocket connection can drop for many reasons — network interruption, server restart, idle timeout. You need the client to recover automatically, with sensible back-off, and to detect silently dead connections before users notice.

### Solution

Set `reconnect` and `heartbeat` in `PulseOptions`. React to status transitions using the `pulse.status` ripple signal to show UI feedback.

```ts
import { createPulse } from '@vielzeug/pulse';
import { effect } from '@vielzeug/ripple';

type ServerEvents = { 'chat:message': { user: string; text: string } };

const pulse = createPulse<ServerEvents>('wss://api.example.com/ws', {
  reconnect: {
    maxAttempts: 8,
    // Custom delay: exponential backoff 500 ms → 30 s
    delay: (attempt) => Math.min(500 * Math.pow(2, attempt), 30_000),
  },
  heartbeat: {
    interval: 20_000,  // send a ping every 20 s
    timeout: 8_000,    // treat connection as dead if no pong within 8 s
  },
  onOpen: () => console.log('connected / reconnected'),
  onClose: (code, reason) => console.log('closed', code, reason),
});

// Reflect connection health in the UI
effect(() => {
  const status = pulse.status.value;
  const banner = document.querySelector<HTMLElement>('#conn-banner')!;

  banner.hidden = status === 'open';
  banner.textContent =
    status === 'connecting' ? 'Connecting…' :
    status === 'reconnecting' ? 'Connection lost. Reconnecting…' :
    'Disconnected';
});

pulse.on('chat:message', ({ user, text }) => appendMessage(user, text));
```

#### Fixed delay reconnect

Use a number for a fixed delay (useful in tests and controlled environments):

```ts
const pulse = createPulse('wss://api.example.com/ws', {
  reconnect: { delay: 2_000, maxAttempts: 3 },
});
```

#### Disable reconnect after explicit disconnect

`pulse.disconnect()` closes the connection without triggering reconnect, regardless of `reconnect` settings.

```ts
pulse.disconnect(1000, 'user signed out');
// status → 'closed', no reconnect attempt
```

#### Detect exhausted reconnect budget

When `maxAttempts` is exhausted, status transitions to `'closed'`. Listen to the `onClose` callback or watch the status signal.

```ts
const pulse = createPulse('wss://api.example.com/ws', {
  reconnect: { maxAttempts: 3 },
  onClose: (code) => {
    if (code !== 1000) {
      showErrorPage('Could not reconnect. Please refresh.');
    }
  },
});
```

### Pitfalls

- **`reconnect: true` enables reconnect with defaults** (`maxAttempts: 5`, full-jitter exponential backoff capped at 30 s).
- **Heartbeat operates independently of reconnect.** A dead-connection detected by heartbeat closes the socket; if `reconnect` is enabled, a reconnect attempt follows automatically.
- **Status `'reconnecting'` fires before any attempt.** Showing "reconnecting…" immediately on unexpected close gives better perceived reliability.
- **Reconnect only triggers on unexpected closes.** Calling `disconnect()` sets status to `'closed'` without any retry.

### Related

- [Basic Connection](./basic-connection.md)
- [Outgoing Middleware](./middleware.md)
