---
title: Forge 2.0 Migration
---

# Forge 2.0 Migration

Forge 2.0 replaces the flat controller and Ripple runtime with explicit immutable forms, safe value constraints, and DOM, Spell `customValidator`, and Vault adapters.

## Create explicit forms

Replace flat controller usage with `createForm`. Treat form values and state as immutable snapshots; apply changes through the current form operations.

## Move validation to constraints and adapters

Encode safe value constraints in the form definition. Update validation integrations to use the DOM, Spell `customValidator`, or Vault adapter appropriate to the boundary.

## Recheck submission and persistence

Rework submission, reset, persistence, and disposal flows against the 2.0 form contract. Handle `ForgeSubmitError` and `ForgeValidationError` at existing application error boundaries.

Review the [Usage Guide](./usage.md) and [API Reference](./api.md) for current form, adapter, and error contracts.
