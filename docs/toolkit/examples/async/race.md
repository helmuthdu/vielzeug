# race

`race()` was removed from Toolkit. Use `sleep()` to enforce a minimum delay and then await the real promise.

## Replacement Pattern

```ts
import { sleep } from '@vielzeug/toolkit';

await sleep(500);
const data = await fetchQuickData();
```

## Related

- [sleep](./sleep.md) – Simple async delay
- [defer](./defer.md) – Manually controlled promises
