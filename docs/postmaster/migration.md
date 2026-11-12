---
title: Postmaster Migration
---

# Breaking Changes Since 26.11.11

- `defineJobs()` is replaced by per-job `defineJob()`. The old registry erased every payload to `unknown` (a `JobDefinition<T>` is not assignable to `JobDefinition<unknown>`), so `execute`/`key` had to be written against `unknown` and re-validate inside. `defineJob<T>` infers the payload type from `validate` (a plain function or a `{ parse }` validator object such as a Spell schema), or from an annotated `execute` payload, and the type flows into `key`, `execute`, and `enqueue(name, payload)`. The single-call mapped-type variant does not type-check; inference requires the per-job call.
- Job configuration (versions, `execute`/`key`, retry `maxAttempts`, migration ranges) is validated by `createPostmaster()` instead of `defineJobs()`. The error messages and conditions are unchanged; construction of the processor is now the failure point.
- `retry-scheduled` and `dead-lettered` tap events carry the finalized stored entry, including the stored `failure`. Previously they carried a synthetic pre-transition entry without the failure.

```ts
// Before
const jobs = defineJobs({
  createTodo: {
    version: 1,
    validate: stageValidator, // payload stayed `unknown` inside execute/key
    key: (value) => validateAgain(value).id,
    execute: async (value) => sync(validateAgain(value)),
  },
});

// After
const jobs = {
  createTodo: defineJob({
    version: 1,
    validate: stageValidator, // payload type inferred from the validator
    key: (payload) => payload.id,
    execute: async (payload) => sync(payload),
  }),
};
```

# Postmaster 3.0 Migration

Postmaster 3 makes background startup explicitly synchronous, moves store-author contracts to a dedicated entry point, and replaces open-ended payload migration callbacks with contiguous version steps.

## Replace migration callbacks with version steps

Migration keys are source versions. The lowest key is the earliest stored version you support, and the contiguous range must lead into the current version.

```ts
// Before
const jobs = defineJobs({
  createTodo: {
    version: 3,
    migrate: (payload, fromVersion) => {
      if (fromVersion === 1) return addPriority(payload);
      if (fromVersion === 2) return normalizePriority(payload);
      return payload;
    },
    validate,
    key,
    execute,
  },
});

// After
const jobs = defineJobs({
  createTodo: {
    version: 3,
    migrate: {
      1: addPriority,
      2: normalizePriority,
    },
    validate,
    key,
    execute,
  },
});
```

You may start the range after version 1 when older records are no longer supported. Omit `migrate` when only the current version is supported. Missing steps, thrown steps, and `undefined` results dead-letter the record without executing it.

## Import store contracts from the store entry point

Runtime users continue importing processor APIs from the package root. Custom store implementations import storage contracts from `@vielzeug/postmaster/store`.

```ts
// Before
import type { PostmasterStore, StoredJob, StoreTx } from '@vielzeug/postmaster';

// After
import type { PostmasterStore, StoredJob, StoreTx } from '@vielzeug/postmaster/store';
```

## Stop awaiting start

`start()` starts the background pump and returns immediately. Use `flush()` when you need an awaitable drain.

```ts
// Before
await postmaster.start();

// After
postmaster.start();

// Await all currently eligible work when required.
await postmaster.flush();
```

Existing `await postmaster.start()` expressions still run in JavaScript, but TypeScript no longer exposes a promise return value and promise chaining is not supported.

## Report corrupt IndexedDB records

The IndexedDB adapter now skips malformed durable records instead of allowing one bad value to block the queue. Connect the optional diagnostic to application recovery tooling.

```ts
const store = createIndexedDbPostmasterStore({
  name: 'outbox',
  onCorruptRecord: ({ id, reason }) => reportOutboxCorruption({ id, reason }),
});
```

Postmaster does not delete corrupt records automatically.
