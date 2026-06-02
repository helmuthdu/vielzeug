# race

`race()` was removed from Arsenal. Use `sleep()` to enforce a minimum delay and then await the real promise.

## Replacement Pattern

```ts
import { sleep } from '@vielzeug/arsenal';

await sleep(500);
const data = await fetchQuickData();
```

## Related

- [sleep](./sleep.md) – Simple async delay
- [defer](./defer.md) – Manually controlled promises
