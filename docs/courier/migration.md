---
title: Courier 2.0 Migration
---

# Courier 2.0 Migration

Courier 2.0 redesigns HTTP work around one client, query handles, direct mutations, and `AsyncIterable` streams.

## Consolidate client setup

Create one `Courier` instance with `createCourier` and move shared transport, interceptor, and request configuration there.

## Adopt query handles and direct mutations

Replace prior query and mutation integration points with the 2.0 query-handle and direct-mutation contracts. Keep request lifecycle handling at each query or mutation boundary.

## Consume streams as async iterables

Update streaming consumers to iterate over the 2.0 stream API with `for await...of`. Ensure application cleanup still handles abort and disposal.

Review the [Usage Guide](./usage.md) and [API Reference](./api.md) for current client, query, mutation, and stream contracts.
