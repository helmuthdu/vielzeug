---
title: Arsenal Migration
---

# Arsenal 3.0 Migration

Arsenal 3 keeps the typed utility toolkit while removing only exact platform aliases.

## Use platform APIs for removed aliases

```ts
// flatten(values, depth)
values.flat(depth);

// uuid()
crypto.randomUUID();
```

`percent()` was removed because its scale and zero-total policy were ambiguous. Write the intended policy at the call site.

`pad()` is renamed to `padCenter()` so its two-sided behavior is explicit:

```ts
import { padCenter } from '@vielzeug/arsenal/string';

padCenter('5', 3); // ' 5 '
```

Collection, guard, and numeric helpers remain available from category entry points. Their parameters now accept readonly arrays where they do not mutate input. `sum()` and `average()` reject non-finite values; `gcd()` and `lcm()` require safe integers; `linspace()` requires finite bounds and a positive integer point count.

---

# Arsenal 2.0 Migration

## Use category entry points

Package root now exposes common utilities only. Import specialized APIs from category entry points.

```ts
// Before
import { debounce, hash, retry } from '@vielzeug/arsenal';

// After
import { debounce } from '@vielzeug/arsenal/function';
import { hash } from '@vielzeug/arsenal/object';
import { retry } from '@vielzeug/arsenal/async';
```

## Replace parseJSON

`parseJSON` no longer accepts fallback, validator, or generic type arguments.

```ts
// Before
const user = parseJSON<User>(raw, { fallback, validator });

// After
const parsed = tryParseJson(raw);
if (!parsed.ok) return fallback;
const user = UserSchema.parse(parsed.value);
```

## Replace stash

`stash` is replaced by identity-keyed `cache`.

```ts
// Before
const users = stash<User>({ ttlMs: 60_000 });
const user = await users.getOrSet('user:1', () => loadUser(1));

// After
const users = cache<string, User>({ ttlMs: 60_000 });
const user = await users.getOrLoad('user:1', () => loadUser(1));
```

`cache` has no `hash`, `forceRefresh`, `onEvict`, `entries`, or eager timer cleanup. Delete a key before reloading it. Use Vault for persistent storage.

## Replace queue

`queue` is replaced by `taskPool`.

```ts
// Before
const q = queue({ concurrency: 2 });
const result = await q.add(() => loadUser());
await q.onIdle();

// After
const pool = taskPool({ concurrency: 2 });
const result = await pool.run((signal) => loadUser(signal));
await pool.idle();
pool.dispose();
```

`taskPool` has no priorities or settled-result subscriptions. Await returned task promises.

## Make fuzzy fields explicit

```ts
// Before
fuzzyFilter(users, query, { fields: ['name', 'email'] });

// After
fuzzyFilter(users, query, { select: (user) => [user.name, user.email] });
```

Object collections always require `select`. String arrays do not.
