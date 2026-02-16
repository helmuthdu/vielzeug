<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-~0.7KB-success" alt="Size">
</div>

# waitFor

Wait for a condition to become true by polling. Useful for waiting for DOM elements, API states, or other conditions.

## Signature

```typescript
function waitFor(
  condition: () => boolean | Promise<boolean>,
  options?: {
    timeout?: number;
    interval?: number;
    signal?: AbortSignal;
  },
): Promise<void>;
```

## Parameters

- `condition` – Function that returns true when condition is met
- `options.timeout` – Maximum time to wait in ms (default: 5000)
- `options.interval` – Polling interval in ms (default: 100)
- `options.signal` – AbortSignal to cancel waiting

## Returns

Promise that resolves when condition becomes true.

## Examples

### Wait for DOM Element

```typescript
import { waitFor } from '@vielzeug/toolkit';
await waitFor(() => document.querySelector('#myElement') !== null, { timeout: 5000, interval: 100 });
console.log('Element appeared!');
```

### Wait for API to be Ready

```typescript
import { waitFor } from '@vielzeug/toolkit';
await waitFor(
  async () => {
    try {
      const res = await fetch('/api/health');
      return res.ok;
    } catch {
      return false;
    }
  },
  { timeout: 30000, interval: 1000 },
);
console.log('API is ready!');
```

### Wait for State Change

```typescript
import { waitFor } from '@vielzeug/toolkit';
await waitFor(() => window.myGlobal !== undefined, { timeout: 10000, interval: 200 });
console.log('Global variable initialized!');
```

### With AbortSignal

```typescript
import { waitFor } from '@vielzeug/toolkit';
const controller = new AbortController();
// Abort after 10 seconds
setTimeout(() => controller.abort(), 10000);
try {
  await waitFor(() => checkCondition(), {
    timeout: 15000,
    interval: 200,
    signal: controller.signal,
  });
} catch (error) {
  console.log('Waiting cancelled');
}
```

### Wait for Job Completion

```typescript
import { waitFor } from '@vielzeug/toolkit';
async function waitForJobCompletion(jobId: string) {
  await waitFor(
    async () => {
      const status = await fetch(`/api/jobs/${jobId}`).then((r) => r.json());
      return status.completed === true;
    },
    { timeout: 60000, interval: 2000 },
  );
  return fetch(`/api/jobs/${jobId}/result`).then((r) => r.json());
}
```

## Related

- [sleep](./sleep.md) – Simple async delay
- [race](./race.md) – Race with minimum delay
