---
title: Conduit 2.0 Migration
---

# Conduit 2.0 Migration

Conduit 2.0 redesigns dependency registration around dependency-first asynchronous factories.

## Make dependencies explicit

Rewrite registrations so each factory declares and resolves its dependencies before producing a value. Update synchronous factory assumptions to await the 2.0 factory contract.

## Recheck scopes and disposal

Review container scopes, lifetime choices, and teardown paths. Handle `ConduitCircularDependencyError`, `ConduitDisposedError`, and `ConduitScopedResolutionError` at existing application boundaries.

Review the [Usage Guide](./usage.md) and [API Reference](./api.md) for current `createContainer`, token, scope, factory, and lifetime contracts.
