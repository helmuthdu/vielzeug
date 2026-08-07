---
title: Vault 2.0 Migration
---

# Vault 2.0 Migration

Vault 2.0 redesigns storage around portable keys, fixed envelopes, capability-specific stores, and `observe()`.

- Replace `Adapter` with `VaultStore`.
- Replace `IndexedDbAdapter` with `IndexedDbVaultStore`.
- Replace `watch`, `observeMany`, signals, and streams with per-table `observe()`.
- Remove codecs and versioned codecs. Start a new storage namespace or migrate data outside Vault before construction.
- Move atomic code to `createIndexedDB().batch()`.

## Replace removed APIs

| Before | After |
| --- | --- |
| `Adapter` / `MemoryAdapter` | `VaultStore` from `createMemory()`, `createLocalStorage()`, or `createSessionStorage()` |
| `IndexedDbAdapter` | `IndexedDbVaultStore` from `createIndexedDB()` |
| Codecs and versioned codecs | Fixed envelopes; migrate existing encoded data before construction |
| `watch`, `observeMany`, signals, and streams | Per-table `store.observe()` |
| Atomic adapter operations | `createIndexedDB().batch()` |

## Move to portable keys and fixed envelopes

Update persisted records and key construction to the 2.0 portable-key and fixed-envelope contracts. Plan and test data migration before deploying the new storage format.

## Use capability-specific stores

Replace broad store access with the narrow store capability required by each operation. Update adapters and transactions to the 2.0 store types.

## Observe storage changes

Use `observe()` for reactive integrations instead of polling or application-managed storage subscriptions. Retain and invoke its unsubscribe handle during cleanup.

Review the [Usage Guide](./usage.md), [API Reference](./api.md), and [plugin examples](./examples/plugins.md) for current store, adapter, migration, and observation contracts.
