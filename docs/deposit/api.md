# Depot API Reference

This document describes the public API of the `@vielzeug/deposit` package.

## Classes

### Depot

A generic database abstraction for browser storage, supporting both IndexedDB and LocalStorage adapters.

#### Depot Constructor

```ts
new Depot(adapter: DepositStorageAdapter<S>)
new Depot(config: AdapterConfig<S>)
```

- `adapter`: A custom storage adapter implementing the DepositStorageAdapter interface.
- `config`: An object specifying the adapter type, dbName, version, schema, and optional migration function.

#### Depot Methods

- `bulkDelete(table, keys)` – Delete multiple records by key.
- `bulkPut(table, values, ttl?)` – Insert or update multiple records.
- `clear(table)` – Remove all records from a table.
- `count(table)` – Get the number of records in a table.
- `delete(table, key)` – Delete a record by key.
- `get(table, key, defaultValue?)` – Get a record by key.
- `getAll(table)` – Get all records from a table.
- `put(table, value, ttl?)` – Insert or update a record.
- `query(table)` – Create a QueryBuilder for advanced queries.
- `transaction(tables, fn, ttl?)` – Perform a transaction across tables.
- `patch(table, patches)` – Apply a batch of put/delete/clear operations.

### QueryBuilder

A fluent API for querying and transforming data in a table.

#### QueryBuilder Constructor

```ts
new QueryBuilder(adapter: DepositStorageAdapter<any>, table: string)
```

#### QueryBuilder Methods

- `where(field, predicate)` – Filter by predicate on a field.
- `equals(field, value)` – Filter by equality.
- `between(field, lower, upper)` – Filter by range.
- `startsWith(field, prefix, ignoreCase?)` – Filter by string prefix.
- `filter(fn)` – Filter by custom predicate.
- `not(fn)` – Negate a predicate.
- `and(...fns)` – Combine predicates with AND.
- `or(...fns)` – Combine predicates with OR.
- `orderBy(field, direction)` – Sort results.
- `limit(n)` – Limit result count.
- `offset(n)` – Skip n results.
- `page(pageNumber, pageSize)` – Paginate results.
- `reverse()` – Reverse result order.
- `count()` – Get result count.
- `first()` – Get first result.
- `last()` – Get last result.
- `average(field)` – Average a field.
- `min(field)` – Minimum value.
- `max(field)` – Maximum value.
- `sum(field)` – Sum a field.
- `modify(callback, context?)` – Mutate records in-place.
- `groupBy(field)` – Group by field.
- `search(query, tone?)` – Fuzzy search.
- `reset()` – Reset query builder.
- `toArray()` – Execute and return results.
- `build(conditions)` – Build query from conditions.

### LocalStorageAdapter

Implements DepositStorageAdapter using browser localStorage.

#### LocalStorageAdapter Constructor

```ts
new LocalStorageAdapter(dbName: string, version: number, schema: S)
```

#### LocalStorageAdapter Methods

Implements all DepositStorageAdapter methods: `bulkDelete`, `bulkPut`, `clear`, `count`, `delete`, `get`, `getAll`, `put`.

### IndexedDBAdapter

Implements DepositStorageAdapter using browser IndexedDB.

#### IndexedDBAdapter Constructor

```ts
new IndexedDBAdapter(dbName: string, version: number, schema: S, migrationFn?)
```

- `migrationFn`: Optional migration function for schema upgrades.

#### IndexedDBAdapter Methods

Implements all DepositStorageAdapter methods and `connect()`.

## Types

### DepotDataRecord\<T, K\>

Defines a table schema record.

- `key`: The primary key field name.
- `indexes`: Optional array of index field names.
- `record`: The record type.

### DepositDataSchema\<S\>

Maps table names to DepotDataRecord definitions.

### DepositMigrationFn\<S\>

Migration function signature for IndexedDB upgrades.

### DepositStorageAdapter\<S\>

Interface for storage adapters. Methods:

- `bulkDelete`, `bulkPut`, `clear`, `count`, `delete`, `get`, `getAll`, `put`, `connect?`

## Utility Functions

### runSafe(fn, label?)

Wraps a function to suppress and log errors.

### wrapWithExpiry(value, ttl?)

Wraps a value with an expiry timestamp.

### unwrapWithExpiry(value, now, onExpire?)

Unwraps a value, deleting it if expired.
