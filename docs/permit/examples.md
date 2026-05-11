---
title: Permit — Examples
description: Practical examples and recipes for permit.
---

# Permit Examples

[[toc]]

## How to Use These Examples

These examples cover the current rule model (`set` + decision APIs), deterministic precedence, and common application patterns.

1. Start with the first examples to establish baseline usage.
2. Move to precedence and wildcard examples to tune policy behavior.
3. Use logger and rule-set examples to integrate auditing and testing workflows.

All examples below are aligned with the current `@vielzeug/permit` API, including `forUser(..., cache?)`, `allowedActions()`, and `explain()`.

## Examples Overview

- [Blog Roles](./examples/blog-roles.md)
- [Priority and Overrides](./examples/inheritance-and-overrides.md)
- [Wildcard Action](./examples/wildcard-action.md)
- [Rule Specificity](./examples/disabling-wildcard-fallback.md)
- [Bound Checker in UI Layer](./examples/bound-guard-in-ui-layer.md)
- [Logger for Auditing](./examples/logger-for-auditing.md)
- [Rule Snapshot/Replace for Tests](./examples/snapshot-restore-for-test-isolation.md)
