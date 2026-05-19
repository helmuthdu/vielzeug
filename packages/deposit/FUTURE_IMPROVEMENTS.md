# Future Optimization Recommendations for @vielzeug/deposit

## Overview
This document outlines recommended improvements that were not implemented in the current pass, either because they require more significant architectural changes or need additional design decisions.

---

## High-Impact, Medium-Complexity Recommendations

### 1. Flatten `adapter-core.ts` - Reduce Indirection Layers
**Difficulty:** Medium-High  
**Value:** High  
**Effort Estimate:** 2-3 hours  
**Status:** Recommended, not yet implemented

**Current Structure:**
```
createAdapterRuntime
├── createSharedMethods
│   └── createQueryBuilder
├── createSharedReadMethods
│   └── createReadQuery
└── createUpdateMethod
```

**Proposed Structure:**
```
buildAdapterOps (single factory)
├── Returns mutable operations object
└── Used directly by adapters
```

**Benefits:**
- Single source of truth for operation implementation
- Easier to trace method definitions
- Fewer nested function scopes
- Simpler to test and verify

**Implementation Notes:**
- Merge `createSharedMethods`, `createSharedReadMethods`, and `createUpdateMethod` into a single `buildOps` factory
- Remove `createTransactionContext` as separate export (inline into uses)
- Keep the "read ops" vs "mutable ops" distinction at the caller level

---

### 2. Make `transaction()` Method Optional on Base `Adapter`
**Difficulty:** Medium  
**Value:** Medium  
**Effort Estimate:** 1-2 hours  
**Status:** Recommended

**Current Structure:**
```typescript
interface Adapter<S> { /* base ops */ }
interface IndexedDBHandle<S> extends Adapter<S> {
  transaction(): Promise<R>;
}
```

**Proposed Structure:**
```typescript
interface Adapter<S> { 
  transaction?(): Promise<R>; // Optional
}
```

**Alternative:**
```typescript
interface TransactionalAdapter<S> extends Adapter<S> {
  transaction(): Promise<R>;
}
```

**Benefits:**
- Could theoretically support transactions in memory adapter (for testing)
- Clearer contract: not all adapters have transactions
- More flexible for future adapter implementations

**Trade-offs:**
- Breaking change if users rely on `IndexedDBHandle` type
- Adds complexity to type hierarchy

---

### 3. Provide `upsert()` Method
**Difficulty:** Low-Medium  
**Value:** Medium  
**Effort Estimate:** 1 hour  
**Status:** Recommended

**Current Workflow (insert-or-update):**
```typescript
const existing = await db.get('users', id);
if (existing) {
  await db.update('users', id, changes);
} else {
  await db.put('users', changes);
}
```

**Proposed API:**
```typescript
export interface Adapter<S> {
  upsert<K extends keyof S>(
    table: K,
    key: KeyOf<S, K>,
    fn: (existing: RecordOf<S, K> | undefined) => RecordOf<S, K>,
    ttl?: TtlMs,
  ): Promise<RecordOf<S, K>>;
}
```

**Usage:**
```typescript
await db.upsert('users', id, (existing) => ({
  ...existing,
  ...changes,
}));
```

**Benefits:**
- Common use case made ergonomic
- Atomic at application level (even if not DB-atomic)
- Reduces boilerplate

**Implementation:**
- Implement in `adapter-core.ts` as part of `buildOps`
- Compose from `get` + `put`/`update`

---

### 4. Clarify `deleteAll()` Return Value Semantics
**Difficulty:** Low  
**Value:** Low-Medium  
**Effort Estimate:** 0.5 hour  
**Status:** Needs Decision

**Current Ambiguity:**
```typescript
await db.deleteAll('users'); // Returns count: number
```

Question: Does this count include expired TTL records that weren't yet cleaned up?

**Option A: Document As-Is**
- Count is "raw count" before filtering
- Add JSDoc: `@return count of ALL records including expired`

**Option B: Always Filter to Live Records**
```typescript
// Before deleting, ensure only live records are deleted
const live = await getAll(table); // Auto-filters expired
return live.length;
```
- Costs extra read
- More accurate semantics

**Option C: Return void**
- Don't expose the count at all
- Simplify the API

**Recommendation:** Option A (document) for backward compatibility, with clear JSDoc.

---

## Lower-Priority, Ambitious Changes

### 5. Rename `StoredRecord` Fields for Debuggability
**Difficulty:** Medium (Breaking Change)  
**Value:** Medium  
**Effort Estimate:** 2-3 hours  
**Status:** Post-GA-only

**Current:**
```typescript
type StoredRecord<T> = {
  e?: number;      // expireAt timestamp
  v: T;            // value
};
```

**Proposed:**
```typescript
type StoredRecord<T> = {
  expiresAt?: number;
  value: T;
};
```

**Why Wait:**
- Breaking format change to persisted IDB data
- Requires migration strategy
- Should only do post-GA or with clear migration guide

**Migration Strategy:**
```typescript
function migrateStoredRecord(raw: unknown): StoredRecord<any> {
  if (typeof raw === 'object' && raw !== null) {
    const obj = raw as any;
    // Support both old and new formats
    return {
      value: obj.v ?? obj.value,
      expiresAt: obj.e ?? obj.expiresAt,
    };
  }
  return undefined;
}
```

---

### 6. Add Debugging/Introspection API
**Difficulty:** Low-Medium  
**Value:** Low-Medium  
**Effort Estimate:** 2-3 hours  
**Status:** Nice-to-have

**Proposed API:**
```typescript
interface Adapter<S> {
  // Debug introspection
  debug(): {
    schema: S;
    tables: Array<{
      name: string;
      recordCount: number;
      expiredCount: number;
      totalSize: number; // approximate
    }>;
  };
}
```

**Benefits:**
- Easier to debug in development
- Diagnostics for troubleshooting
- Could export as JSON

---

### 7. Batch Operations Optimization
**Difficulty:** Medium-High  
**Value:** Medium  
**Effort Estimate:** 3-4 hours  
**Status:** Future Enhancement

**Current:**
```typescript
await Promise.all(records.map(r => db.put('users', r)));
```

**Proposed:**
```typescript
await db.batch(['users'], async (tx) => {
  for (const record of records) {
    await tx.put('users', record);
  }
});
```

**Benefits:**
- Single transaction for all operations
- Better performance for large bulk ops
- Clearer intent

**Challenges:**
- Need transaction support in all adapters
- Memory adapter needs transaction support
- Type safety for multi-table transactions

---

## Schema and Validation Enhancements

### 8. Richer Schema Definition
**Difficulty:** Medium-High  
**Value:** Medium  
**Effort Estimate:** 3-5 hours  
**Status:** Future Design

**Current:**
```typescript
const schema = {
  users: table<User>('id'),
};
```

**Proposed (Example):**
```typescript
const schema = {
  users: table<User>('id').withIndex('email').ttl(30 * 24 * 60 * 60 * 1000),
  posts: table<Post>('id').withForeignKey('userId', () => schema.users),
};
```

**Benefits:**
- Richer type information
- Can validate relationships
- Could generate indexes for IndexedDB

**Challenges:**
- Major API redesign
- Backward compatibility concerns
- Could be a new major version feature

---

## Performance Monitoring

### 9. Optional Performance Tracking
**Difficulty:** Low  
**Value:** Low  
**Effort Estimate:** 2-3 hours  
**Status:** Optional Feature

**Proposed:**
```typescript
const db = createIndexedDB({
  name: 'app',
  schema,
  onMetrics?: (event: {
    operation: 'put' | 'get' | 'delete' | 'query';
    table: string;
    duration: number;
    size: number;
  }) => void,
});
```

**Benefits:**
- Non-intrusive performance monitoring
- Can integrate with analytics
- Helps identify bottlenecks

**Implementation:**
- Wrap core operations with timing
- Track operation metadata
- Optional callback (no cost if not provided)

---

## Summary Matrix

| # | Recommendation | Difficulty | Value | Priority | Est. Effort |
|---|---|---|---|---|---|
| 1 | Flatten adapter-core | Medium-High | High | Medium | 2-3h |
| 2 | Optional transaction | Medium | Medium | Low | 1-2h |
| 3 | Add upsert | Low-Medium | Medium | Medium | 1h |
| 4 | Clarify deleteAll | Low | Low-Medium | Medium | 0.5h |
| 5 | Rename fields | Medium | Medium | Low | 2-3h* |
| 6 | Debug API | Low-Medium | Low-Medium | Low | 2-3h |
| 7 | Batch ops | Medium-High | Medium | Low | 3-4h |
| 8 | Rich schema | Medium-High | Medium | Low | 3-5h |
| 9 | Perf tracking | Low | Low | Very Low | 2-3h |

*Post-GA only

---

## Recommended Next Steps (Priority Order)

1. **Implement #3 (upsert)** - Quick win, common use case, low risk
2. **Decide #4 (deleteAll)** - Clarify semantics, 30 minutes of documentation
3. **Consider #1 (flatten)** - Post-release refactor for code clarity
4. **Plan #5 (rename)** - Design migration strategy for next breaking release
5. **Monitor #6-9** - Evaluate based on user feedback

---

## Notes

- All recommendations maintain backward compatibility except #5 (which should be post-GA)
- Recommendations 1-4 are all feasible and worth considering
- Recommendations 5-9 are "nice-to-haves" that can be revisited based on usage patterns
- Any changes should be validated against the full monorepo test suite


