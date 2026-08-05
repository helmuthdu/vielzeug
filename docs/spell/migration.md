---
title: Spell 2.0 Migration
---

# Spell 2.0 Migration

Spell 2.0 groups secondary APIs, removes aliases, makes asynchronous checks explicit, and requires declarative definitions for JSON Schema export.

## Update secondary API imports

Move secondary operations to their 2.0 grouped entry points. Replace removed aliases with the canonical API name before upgrading.

## Make asynchronous checks explicit

Audit validation flows that may perform asynchronous work. Use the explicit 2.0 asynchronous check contract rather than relying on synchronous parsing paths.

## Define schemas declaratively for JSON Schema

JSON Schema export now requires a declarative schema definition. Update generated-schema integrations to provide that definition instead of inferring it from unsupported schema forms.

Review the [Usage Guide](./usage.md) and [API Reference](./api.md) for current schema, parser, diagnostics, and JSON Schema contracts.
