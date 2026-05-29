---
title: 'Rune Examples — Testing'
description: 'Testing example for @vielzeug/rune.'
---

## Testing

### Problem

You want to assert in unit tests that specific messages were logged at the right level — without writing to a real console, file, or external service.

### Solution

Use a test transport to capture log entries directly. This gives full access to the `LogEntry` structure (level, message, context, bindings) without brittle console output assertions.

```ts
import { createLogger } from '@vielzeug/rune';
import type { LogEntry, Transport } from '@vielzeug/rune';
import { expect, it } from 'vitest';

function createTestTransport() {
  const entries: LogEntry[] = [];
  const transport: Transport = (entry) => entries.push(entry);
  return { entries, transport };
}

it('emits errors when enabled', () => {
  const { entries, transport } = createTestTransport();
  const log = createLogger({ logLevel: 'error', transports: [transport] });

  log.error('failure');

  expect(entries).toHaveLength(1);
  expect(entries[0].level).toBe('error');
  expect(entries[0].message).toBe('failure');
});

it('suppresses debug when logLevel is warn', () => {
  const { entries, transport } = createTestTransport();
  const log = createLogger({ logLevel: 'warn', transports: [transport] });

  log.debug('silent');
  log.warn('loud');

  expect(entries).toHaveLength(1);
});

it('includes pinned bindings in every entry', () => {
  const { entries, transport } = createTestTransport();
  const log = createLogger({ transports: [transport] }).withBindings({ requestId: 'abc' });

  log.info('ok');

  expect(entries[0].bindings).toMatchObject({ requestId: 'abc' });
});
```

When testing `consoleTransport` output directly, spy on the relevant `console` method:

```ts
import { afterEach, expect, it, vi } from 'vitest';
import { consoleTransport, createLogger } from '@vielzeug/rune';

afterEach(() => vi.restoreAllMocks());

it('writes error to console.error', () => {
  const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
  const log = createLogger({ transports: [consoleTransport({ timestamp: false })] });

  log.error('boom');

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
- [Testing Patterns (Sieve)](/sieve/examples/)
