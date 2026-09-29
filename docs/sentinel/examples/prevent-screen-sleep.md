---
title: 'Sentinel Examples — Prevent Screen Sleep'
description: Keep the screen awake during active use with a Sentinel-backed wake lock.
---

## Prevent Screen Sleep

### Problem

A long-running interactive session — a game, timer, or presentation — should keep the screen awake, but the Screen Wake Lock API auto-releases when the tab is hidden and must be re-requested on return. Managing that lifecycle by hand is error-prone.

### Solution

Use `createWakeLock()` to acquire the lock once; the Sentinel re-acquires it automatically after visibility changes.

```ts
import { createWakeLock } from '@vielzeug/sentinel';

const wakeLock = createWakeLock();

// Acquire when the active session starts
wakeLock.request();

const unsubscribe = wakeLock.subscribe(() => {
  console.log('Wake lock active:', wakeLock.getSnapshot().active);
});

// Release when the session ends
wakeLock.release();
unsubscribe();
wakeLock.dispose();
```

### Pitfalls

- The Wake Lock API requires a secure context (HTTPS or localhost); it is silently unavailable in non-secure environments.
- The OS may deny or cancel the lock when battery is critically low.
- `request()` is best-effort — check `getSnapshot().supported` if your UI should adapt to unsupported browsers.

### Related

- [Wake Lock API](../api.md#createwakelock)
- [Viewport Tracking](./responsive-viewport-tracking.md)
