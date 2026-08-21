---
title: 'Sentinel Examples — Monitor Network Condition'
description: Display online status and optional effective connection information.
---

## Monitor Network Condition

### Problem

An application needs to show connectivity state and avoid assuming the non-standard Network Information API exists. `createNetwork()` combines both values in one snapshot.

### Solution

Render online status and treat connection details as optional enhancement data.

```ts
import { createNetwork } from '@vielzeug/sentinel';

const output = document.createElement('output');
document.body.append(output);

function observeNetwork(): () => void {
  const network = createNetwork();
  const render = () => {
    const { connection, online } = network.value;
    output.value = online ? `Online${connection?.effectiveType ? ` (${connection.effectiveType})` : ''}` : 'Offline';
  };

  render();
  const unsubscribe = network.subscribe(render);

  return () => {
    unsubscribe();
    network.dispose();
  };
}

const stopObserving = observeNetwork();
// Call stopObserving() when this output is removed.
```

### Pitfalls

- Treat `navigator.onLine` as a connectivity hint, not proof that a request will succeed.
- Expect `connection` to be `null` outside browsers that implement the Network Information API.
- Keep request error handling independent from network observation.

### Related

- [Network API](../api.md#createnetwork)
- [Courier](/courier/)
