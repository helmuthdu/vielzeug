---
title: Sourcerer 2.0 Migration
---

# Sourcerer 2.0 Migration

Sourcerer 2.0 replaces source APIs with atomic snapshots.

## Read one snapshot at a time

Update consumers to derive UI and application state from `SourceSnapshot` values. Treat each snapshot as one atomic view of source state instead of reading and combining mutable source fields independently.

## Update source integrations

Migrate local, page, cursor, and infinite source integrations to their 2.0 source and query contracts. Recheck pagination, query patches, loading state, and disposal behavior.

Review the [Usage Guide](./usage.md) and [API Reference](./api.md) for current source, snapshot, query, and pagination contracts.
