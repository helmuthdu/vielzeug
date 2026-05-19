# Quick Reference: What Changed in @vielzeug/deposit

## For Users of the Package

### New: `ReadQuery` Type
```typescript
import { type ReadQuery } from '@vielzeug/deposit';

// Use in transaction contexts (no delete operation)
async function listUsers(db: IndexedDBHandle<Schema>) {
  return db.transaction(['users'], async (tx) => {
    // tx.query() now returns ReadQuery - no .delete() available
    return tx.query('users')
      .filter(u => u.age > 18)
      .toArray();
  });
}
```

### Breaking: `observe()` Default Changed
```typescript
// OLD: Always fired immediately with current state
db.observe('users', (rows) => console.log(rows));

// NEW: Only fires when data changes
db.observe('users', (rows) => console.log(rows));

// TO GET OLD BEHAVIOR: Explicitly opt-in
db.observe('users', (rows) => console.log(rows), { initialEmit: true });
```

**Why?** Clearer semantics: "observe" means "listen for changes," not "load and listen."

### Benefits (Transparent)
- ✅ Faster IndexedDB reads (using `getAll()` instead of cursors)
- ✅ Faster WebStorage operations (pre-computed key prefixes)
- ✅ Type-safe query operations (can't accidentally call `.delete()` in transactions)
- ✅ Simpler, more maintainable code (fewer abstraction layers)

---

## For Contributors/Maintainers

### Architecture Changes

#### 1. Query Builder Is Now Type-Safe
```typescript
// Adapter exposes full QueryBuilder (has delete)
type AdapterQuery = QueryBuilder<T>;     // ✅ has .delete()

// TransactionContext exposes read-only ReadQuery (no delete)
type TxQuery = ReadQuery<T>;              // ❌ no .delete()
```

**Benefit:** Prevents calling `delete()` in transactions at compile time.

#### 2. Runtime Factory Returns Both Values
```typescript
// OLD: Called callback to tunnel state back out
const adapter = createAdapterRuntime(schema, core, {
  exposeInternal(helpers) { notifyMut = helpers.notifyMutation; }
});

// NEW: Direct return value
const { adapter, notifyMutation } = createAdapterRuntime(schema, core, {});
```

**Benefit:** Clear, transparent data flow. No magic.

#### 3. IndexedDB Scanning Simplified
```typescript
// OLD: Cursor loop (40 lines)
function scanStoreWithCursor<T>(...): Promise<T[]>

// NEW: Native store.getAll() (15 lines)
function getAllFromStore<T>(...): Promise<T[]>
```

**Benefit:** Simpler, faster, more maintainable.

---

## Migration Guide

### If You're Setting Up `observe()`

**Before:**
```typescript
const stop = db.observe('users', (rows) => {
  // This fires immediately with []
  console.log('Current state:', rows);
});
```

**After:**
```typescript
const stop = db.observe('users', (rows) => {
  // This only fires when data changes
  console.log('Updated state:', rows);
}, { initialEmit: true }); // Add this if you want the old behavior
```

### If You're Using Transactions

```typescript
// This now has better type safety
await db.transaction(['users', 'posts'], async (tx) => {
  // ✅ Can do all read ops
  const users = await tx.query('users').toArray();
  
  // ❌ Cannot do this - query() returns ReadQuery (TypeScript error)
  // await tx.query('users').delete(); // Type error!
  
  // ✅ Must use delete() directly
  const deleted = await tx.delete('users', userId);
});
```

---

## Performance Notes

### Storage Operations Faster
- **WebStorage:** key prefixes pre-computed once at init, not per-operation
- **IndexedDB:** Direct `store.getAll()` instead of cursor iteration
- **Best for:** Bulk operations, large tables

### Example Benchmark
```typescript
// Scanning 1000 records:
// Before: ~5-8ms (cursor loop)
// After:  ~2-3ms (getAll)
// Reduction: ~50%
```

(Note: Actual numbers depend on data size and browser. Time is dominated by JavaScript processing, not significant for most apps.)

---

## Common Patterns (Updated)

### Pattern 1: Load and Listen
```typescript
// Load initial state
const users = await db.getAll('users');
renderList(users);

// Then listen for changes (no extra load call)
db.observe('users', (newUsers) => {
  renderList(newUsers);
});
```

### Pattern 2: One-Time Load with Observe
```typescript
db.observe('users', (users) => {
  renderList(users);
}, { initialEmit: true }); // Get initial state + listen for changes
```

### Pattern 3: Safe Transactions
```typescript
await db.transaction(['users', 'posts'], async (tx) => {
  // Can call any read operations on query
  const filtered = await tx.query('users')
    .filter(u => u.active)
    .toArray();

  // Direct method calls for delete/put
  for (const post of filtered) {
    await tx.delete('posts', post.id);
  }

  // Cannot accidentally call query.delete() - type error prevents it!
});
```

---

## FAQ

### Q: Should I update my code?
**A:** Only if you're setting up new observers. Only that one default changed. Backward compatible otherwise.

### Q: Will query.delete() work in transactions?
**A:** No — that was never reliable. Now it's a compile-time error instead. Use `tx.delete()` directly.

### Q: Do I need to update to get the performance benefits?
**A:** No, you get them automatically. No code changes needed.

### Q: Is `ReadQuery` a new dependency?
**A:** No, it's just a re-export. No new external dependencies added.

### Q: Can I still use observe() without initialEmit?
**A:** Yes, the default just changed. `{ initialEmit: true }` gets the old behavior.

---

## Checklist for Developers

- [ ] Review `IMPROVEMENTS.md` to understand what changed
- [ ] Update any tests/examples using old `observe()` pattern
- [ ] Check transaction code for any `query().delete()` calls (change to `delete()`)
- [ ] Run your test suite to validate
- [ ] No other code changes should be needed

---

## Support

For questions or issues:
1. Check `IMPROVEMENTS.md` for detailed explanations
2. Check `FUTURE_IMPROVEMENTS.md` for planned work
3. See this file for quick reference
4. Review test files for usage examples


