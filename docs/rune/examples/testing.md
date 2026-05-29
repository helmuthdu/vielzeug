---
title: 'Rune Examples — Testing'
description: 'Testing examples for rune.'
---

## Testing

### Problem

You want to assert in unit tests that specific messages were logged at the right level — without writing to a real console, file, or external service.

### Solution

```ts
import { Rune } from '@vielzeug/rune';
import { afterEach, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.restoreAllMocks();
});

it('emits errors when enabled', () => {
  const log = Rune.child({ logLevel: 'error' });
  const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

  log.error('failure');

  expect(spy).toHaveBeenCalled();
});
```


### Pitfalls

- Asserting only on the final console payload can be brittle. Prefer checking the message and structured context arguments rather than the exact badge formatting.
- Remote handlers run asynchronously. If a test covers remote forwarding, await the microtask that delivers the handler call before asserting.
- Log level filtering applies in tests. If the test logger is created with `logLevel: 'error'`, `logger.debug()` calls produce no output — ensure the test logger level matches the calls under test.

### Related

- [Child Logger Overrides](./child-logger-overrides.md)
- [Module Logger Pattern](./module-logger-pattern.md)
- [Production Setup](./production-setup.md)
