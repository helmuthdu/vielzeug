---
title: 'Wireit Examples — Testing'
description: 'Testing examples for wireit.'
---

## Testing

## Problem

Implement testing in a production-friendly way with `@vielzeug/wireit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/wireit` installed.

### Unit test with createTestContainer

```ts
import { createTestContainer } from '@vielzeug/wireit';

describe('UserService', () => {
  let container: Container;
  const mockDb = {
    users: {
      findById: vi.fn(),
      create: vi.fn(),
    },
  };

  beforeEach(() => {
    container = createTestContainer(appContainer);
    container.value(DbToken, mockDb, { overwrite: true });
  });

  afterEach(() => container.dispose());

  it('returns a user by id', async () => {
    mockDb.users.findById.mockResolvedValue({ id: '1', name: 'Alice' });

    const svc = await container.resolve(ServiceToken);
    const user = await svc.getById('1');

    expect(user.name).toBe('Alice');
    expect(mockDb.users.findById).toHaveBeenCalledWith('1');
  });

  it('throws when user not found', async () => {
    mockDb.users.findById.mockResolvedValue(null);

    const svc = await container.resolve(ServiceToken);
    await expect(svc.getById('unknown')).rejects.toThrow('User not found');
  });
});
```

### Temporary mock with container.mock()

```ts
it('falls back to cache on DB error', async () => {
  const brokenDb = {
    users: { findById: vi.fn().mockRejectedValue(new Error('DB connection lost')) },
  };

  const result = await container.mock(DbToken, { useValue: brokenDb }, async () => {
    const svc = await container.resolve(ServiceToken);
    return svc.getById('1'); // should return cached value
  });

  expect(result).toBeDefined(); // returned from cache
  // DbToken is fully restored after mock()
});
```

### Testing async providers

```ts
it('connects to the database on first resolve', async () => {
  const mockConnect = vi.fn().mockResolvedValue(undefined);
  const fakeDb = { connect: mockConnect, query: vi.fn() };

  await container.mock(
    DbToken,
    {
      useFactory: async () => {
        await fakeDb.connect();
        return fakeDb;
      },
    },
    async () => {
      const db = await container.resolve(DbToken);
      expect(mockConnect).toHaveBeenCalledOnce();
    },
  );
});
```

## Expected Output

- The example runs without type errors in a standard TypeScript setup.
- The main flow produces the behavior described in the recipe title.

## Common Pitfalls

- Forgetting cleanup/dispose calls can leak listeners or stale state.
- Skipping explicit typing can hide integration issues until runtime.
- Not handling error branches makes examples harder to adapt safely.

## Related Recipes

- [Aliases](./aliases.md)
- [Async Providers](./async-providers.md)
- [Basic Setup](./basic-setup.md)
