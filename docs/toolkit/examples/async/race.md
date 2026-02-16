<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-~0.3KB-success" alt="Size">
</div>

# race

Race multiple promises with a guaranteed minimum delay. Useful for showing loading states for at least a minimum duration.

## Signature

```typescript
function race<T>(promises: Promise<T> | Promise<T>[], minDelay: number): Promise<T>;
```

## Parameters

- `promises` – Single promise or array of promises to race
- `minDelay` – Minimum delay in milliseconds before resolving

## Returns

Promise that resolves with the first result after the minimum delay.

## Examples

### Basic Usage

```typescript
import { race } from '@vielzeug/toolkit';
// Show loading spinner for at least 500ms
const data = await race(fetchQuickData(), 500);
```

### Prevent Flickering UI

```typescript
import { race } from '@vielzeug/toolkit';
// Even if data loads in 50ms, show spinner for at least 300ms
async function loadUserProfile(userId: string) {
  showLoadingSpinner();
  const user = await race(
    fetchUser(userId),
    300, // Minimum 300ms
  );
  hideLoadingSpinner();
  return user;
}
```

### With Multiple Promises

```typescript
import { race } from '@vielzeug/toolkit';
const result = await race(
  [fetch('/api/endpoint1'), fetch('/api/endpoint2'), fetch('/api/endpoint3')],
  1000, // Ensure at least 1 second
);
```

### Better UX for Fast Operations

```typescript
import { race } from '@vielzeug/toolkit';
async function saveData(data: any) {
  setSaving(true);
  // Even if save is instant, show "Saving..." for 500ms
  await race(api.save(data), 500);
  setSaving(false);
  showSuccessMessage();
}
```

## Related

- [sleep](./sleep.md) – Simple async delay
- [defer](./defer.md) – Manually controlled promises
