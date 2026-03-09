---
title: Logit — Examples
description: Real-world recipes and framework integrations for Logit.
---

## Logit Examples

::: tip
These are copy-paste ready recipes. See [Usage Guide](./usage.md) for detailed explanations.
:::

[[toc]]

## Production setup

```ts
import { Logit } from '@vielzeug/logit';

const isProd = typeof process !== 'undefined' && process.env?.NODE_ENV === 'production';

Logit.setConfig({
  logLevel: isProd ? 'warn' : 'debug',
  variant: 'symbol',
  timestamp: true,
  environment: true,
  remote: isProd
    ? {
        logLevel: 'error',
        handler: async (type, data) => {
          await fetch('/api/logs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              level: type,
              timestamp: data.timestamp,
              namespace: data.namespace,
              env: data.env,
              args: data.args.map((a) => (a instanceof Error ? { message: a.message, stack: a.stack } : a)),
            }),
          });
        },
      }
    : {},
});
```

## Module logger pattern

```ts
// logger.ts — create one logger per module
import { Logit } from '@vielzeug/logit';

export const log = {
  api: Logit.scope('api'),
  db: Logit.scope('db'),
  auth: Logit.scope('auth'),
  cache: Logit.scope('cache'),
};

// api/users.ts
import { log } from '../logger';

export async function getUsers() {
  log.api.info('GET /users');
  try {
    const users = await db.query('SELECT * FROM users');
    log.api.success('Users fetched', { count: users.length });
    return users;
  } catch (err) {
    log.api.error('Failed to fetch users', err);
    throw err;
  }
}
```

## Request logging middleware (Express/Hono)

```ts
import { Logit } from '@vielzeug/logit';

const httpLog = Logit.scope('http');

export function requestLogger(req, res, next) {
  const start = Date.now();
  const label = `${req.method} ${req.path}`;

  res.on('finish', () => {
    const duration = `${Date.now() - start}ms`;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    httpLog[level](`${res.statusCode} ${label}`, { ip: req.ip, duration });
  });

  next();
}
```

## React

```tsx
import { Logit } from '@vielzeug/logit';
import { useEffect } from 'react';

// Create logger outside component to avoid re-creation
const log = Logit.scope('UserProfile');

function UserProfile({ userId }: { userId: string }) {
  useEffect(() => {
    log.debug('Mounted', { userId });
    return () => log.debug('Unmounted', { userId });
  }, [userId]);

  async function handleSave(data: unknown) {
    try {
      await api.save(data);
      log.success('Saved', { userId });
    } catch (err) {
      log.error('Save failed', err);
    }
  }

  return <button onClick={() => handleSave({})}>Save</button>;
}
```

## Vue

```ts
// composables/useLogger.ts
import { Logit } from '@vielzeug/logit';

export function useLogger(component: string) {
  return Logit.scope(component);
}
```

```vue
<script setup lang="ts">
import { useLogger } from '@/composables/useLogger';
import { onMounted, onUnmounted } from 'vue';

const log = useLogger('UserProfile');
const props = defineProps<{ userId: string }>();

onMounted(() => log.debug('Mounted', { userId: props.userId }));
onUnmounted(() => log.debug('Unmounted', { userId: props.userId }));
</script>
```

## Svelte

```ts
// lib/logger.ts
import { Logit } from '@vielzeug/logit';
export const logger = Logit.scope('app');
```

```svelte
<script lang="ts">
  import { logger } from '$lib/logger';
  import { onMount, onDestroy } from 'svelte';

  export let userId: string;

  onMount(() => logger.debug('Mounted', { userId }));
  onDestroy(() => logger.debug('Destroyed', { userId }));
</script>
```

## Structured logging with groups

```ts
// groupEnd fires automatically, even if processOrder throws
const order = await Logit.group('Request POST /api/orders', async () => {
  Logit.info('Body', req.body);
  Logit.info('User', req.user?.id);

  const result = await Logit.time('order-processing', () => processOrder(req.body));
  Logit.success('Order created', { orderId: result.id });
  return result;
}, true); // collapsed
```

## Testing

```ts
import { Logit } from '@vielzeug/logit';
import { describe, it, beforeAll, afterAll, vi, expect } from 'vitest';

describe('UserService', () => {
  beforeAll(() => Logit.setConfig({ logLevel: 'off' }));
  afterAll(() => Logit.setConfig({ logLevel: 'debug' }));

  it('logs error on failure', () => {
    Logit.setConfig({ logLevel: 'error' });
    // Logit.error() routes to console.error
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    Logit.error('Something failed');
    expect(spy).toHaveBeenCalled();

    spy.mockRestore();
  });
});
```
