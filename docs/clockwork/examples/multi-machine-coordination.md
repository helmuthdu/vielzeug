---
title: Multi-Machine Coordination with Events
description: Use Herald to coordinate multiple independent Clockwork state machines.
---

## Problem

Complex features often require multiple interacting state machines:
- A user machine (login, logout, profile updates)
- A session machine (active, idle, expired)
- A notification machine (checking, displaying, clearing)

Hard-coding dependencies between machines creates tight coupling and race conditions. Changes to one machine break assumptions in another.

## Solution

Use Herald as a message bus to decouple machines. Each machine publishes events about state changes, and other machines subscribe and react accordingly. This creates a pub/sub pattern where machines are independent but coordinated.

```ts
import { defineMachine, interpret, assign } from '@vielzeug/clockwork';
import { createEventBus } from '@vielzeug/herald';

// Shared event types
type UserEvent =
  | { type: 'LOGIN'; userId: string; token: string }
  | { type: 'LOGOUT' }
  | { type: 'SESSION_EXPIRED' };

type SessionEvent =
  | { type: 'ACTIVITY' }
  | { type: 'INACTIVITY_WARNING' }
  | { type: 'EXPIRE' };

type NotificationEvent =
  | { type: 'SHOW'; message: string; level: 'info' | 'warning' | 'error' }
  | { type: 'AUTO_DISMISS' }
  | { type: 'DISMISS' };

// Create central event bus
const events = createEventBus<
  | { scope: 'user'; event: UserEvent }
  | { scope: 'session'; event: SessionEvent }
  | { scope: 'notification'; event: NotificationEvent }
>();

// User machine
const userMachine = defineMachine({
  initial: 'logged_out',
  context: {
    userId: '',
    token: '',
    profile: {} as Record<string, unknown>,
  },
  states: {
    logged_out: {
      on: {
        LOGIN: [
          {
            target: 'logged_in',
            actions: [recordLogin, publishLoginEvent],
          },
        ],
      },
    },
    logged_in: {
      on: {
        LOGOUT: [
          {
            target: 'logged_out',
            actions: [clearUser, publishLogoutEvent],
          },
        ],
        SESSION_EXPIRED: [
          {
            target: 'logged_out',
            actions: [clearUser, publishSessionExpiredEvent],
          },
        ],
      },
    },
  },
});

// Session machine
const sessionMachine = defineMachine({
  initial: 'idle',
  context: {
    inactiveSeconds: 0,
    warningShown: false,
  },
  states: {
    idle: {
      on: {
        USER_LOGIN: [{ target: 'active', actions: [resetInactivity] }],
        USER_LOGOUT: [{ target: 'idle' }],
      },
    },
    active: {
      entry: [startActivityTimer],
      exit: [stopActivityTimer],
      on: {
        ACTIVITY: [{ actions: [resetInactivity] }],
        INACTIVITY_WARNING: [
          {
            target: 'warning',
            actions: [markWarningShown, publishWarningEvent],
          },
        ],
        USER_LOGOUT: [{ target: 'idle', actions: [stopActivityTimer] }],
      },
    },
    warning: {
      entry: [showInactivityWarning],
      on: {
        ACTIVITY: [{ target: 'active', actions: [resetInactivity] }],
        EXPIRE: [
          {
            target: 'expired',
            actions: [publishSessionExpireEvent],
          },
        ],
        USER_LOGOUT: [{ target: 'idle' }],
      },
    },
    expired: {
      entry: [expireSession],
      type: 'final',
    },
  },
});

// Notification machine
const notificationMachine = defineMachine({
  initial: 'idle',
  context: {
    message: '',
    level: 'info' as const,
    autoDismissMs: 0,
  },
  states: {
    idle: {
      on: {
        SHOW_NOTIFICATION: [
          {
            target: 'visible',
            actions: [recordNotification, scheduleAutoDismiss],
          },
        ],
      },
    },
    visible: {
      on: {
        DISMISS: [{ target: 'idle', actions: [clearNotification] }],
        AUTO_DISMISS: [{ target: 'idle', actions: [clearNotification] }],
        SHOW_NOTIFICATION: [
          {
            target: 'visible',
            actions: [recordNotification, scheduleAutoDismiss],
          },
        ],
      },
    },
  },
});

// Action factories
const recordLogin = assign(({ event }) => ({
  userId: (event as any).userId,
  token: (event as any).token,
}));

const publishLoginEvent = () => {
  events.emit({ scope: 'user', event: { type: 'LOGIN', userId: '', token: '' } });
};

const publishLogoutEvent = () => {
  events.emit({ scope: 'user', event: { type: 'LOGOUT' } });
};

const publishSessionExpiredEvent = () => {
  events.emit({ scope: 'user', event: { type: 'SESSION_EXPIRED' } });
};

const publishWarningEvent = () => {
  events.emit({
    scope: 'notification',
    event: { type: 'SHOW', message: 'Session expiring soon', level: 'warning' },
  });
};

const publishSessionExpireEvent = () => {
  events.emit({
    scope: 'notification',
    event: {
      type: 'SHOW',
      message: 'Your session has expired. Please log in again.',
      level: 'error',
    },
  });
};

const resetInactivity = assign(() => ({ inactiveSeconds: 0, warningShown: false }));
const markWarningShown = assign(() => ({ warningShown: true }));
const clearUser = assign(() => ({ userId: '', token: '', profile: {} }));
const recordNotification = assign(({ event }) => ({
  message: (event as any).message,
  level: (event as any).level,
}));
const clearNotification = assign(() => ({ message: '', level: 'info' as const }));

const startActivityTimer = () => {
  // Start 15-min idle timer
};

const stopActivityTimer = () => {
  // Cancel timer
};

const showInactivityWarning = () => {
  // Show warning UI
};

const expireSession = () => {
  // Clean up session
};

const scheduleAutoDismiss = ({ context }: any) => {
  // Auto-dismiss after specified duration
};

// Initialize machines
const user = interpret(userMachine);
const session = interpret(sessionMachine);
const notification = interpret(notificationMachine);

// Connect event bus to machines
events.on(({ scope, event }) => {
  if (scope === 'user') {
    if (event.type === 'LOGIN') {
      session.send({ type: 'USER_LOGIN' } as any);
    } else if (event.type === 'LOGOUT') {
      session.send({ type: 'USER_LOGOUT' } as any);
    }
  }

  if (scope === 'notification') {
    if (event.type === 'SHOW') {
      notification.send({
        type: 'SHOW_NOTIFICATION',
        message: event.message,
        level: event.level,
      } as any);
    }
  }
});

// Track user activity
document.addEventListener('mousemove', () => {
  session.send({ type: 'ACTIVITY' } as any);
});

// Idle detection (every 10 min with no activity)
setInterval(() => {
  const ctx = session.context.value;
  if (ctx.inactiveSeconds > 900) {
    session.send({ type: 'INACTIVITY_WARNING' } as any);
  } else {
    session.send({ type: 'ACTIVITY' } as any);
  }
}, 60000);

export const userState = user.state;
export const sessionState = session.state;
export const notificationMessage = notification.context.pipe(c => c.message);
export const notificationLevel = notification.context.pipe(c => c.level);

export function login(userId: string, token: string) {
  user.send({ type: 'LOGIN', userId, token } as any);
}

export function logout() {
  user.send({ type: 'LOGOUT' } as any);
}
```

## Pitfalls

1. **Circular event loops** - If machine A publishes event that notifies B, and B publishes back to A, infinite loops occur. Always use directed dependencies: User → Session → Notification, never cycle back.

2. **Lost events during machine initialization** - Events emitted during setup before machine is interpreting get dropped. Use `interpret()` synchronously before subscribing, or buffer events until all machines are ready.

3. **Race conditions on simultaneous events** - If both user and session emit events that affect notification simultaneously, notification machine may not handle both. Use a queue in the event bus, or ensure events are idempotent.

4. **Tight timing assumptions** - One machine assumes another has completed before reacting. If async operations are involved, use explicit completion events instead of state checks (check for 'expired' state vs listen for 'SESSION_EXPIRED' event).

5. **Hard to debug multi-machine state** - When machines coordinate, debugging requires tracking all states simultaneously. Enable debug hooks on each machine and log to a central registry: `debug: { onTransition: (info) => log({ clockwork: 'session', ...info }) }`.

## Related

- [Herald](../herald/) - Typed event bus and pub/sub
- [Ripple](../ripple/) - Reactive signals for UI synchronization
- [Rune](../rune/) - Structured logging for multi-machine coordination traces
- [Ward](../ward/) - Permission checks during multi-machine workflows
