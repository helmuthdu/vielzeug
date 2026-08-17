---
title: Ward Migration
description: Migrate Ward middleware guards and configuration validation to Ward 2.
---

[[toc]]

## Ward 2.1 Changes

Ward 2.1 accepts `allow()`/`deny()` results without spread and returns `NormalizedWardRule` from decision APIs.

### Drop Spread Ceremony

`createWard` now accepts a flat mix of single rules and rule arrays. `allow()`/`deny()`/`ruleFor()` results can be passed directly — no `...` spread needed. Existing spread code still works.

```ts
// Before
const ward = createWard([...allow('viewer', 'posts', ['read']), ...deny('blocked', 'posts', ['delete'])]);

// After
const ward = createWard([allow('viewer', 'posts', ['read']), deny('blocked', 'posts', ['delete'])]);
```

### NormalizedWardRule in Decision Output

`WardDecision.rule`, `WardTraceCandidate.rule`, and `WardConflict` rule fields now reference `NormalizedWardRule` — `role` is always `readonly string[]` and `priority` is always `number`. Code that narrowed `decision.rule.role` to `string` should drop the narrowing; the runtime was already normalized.

## Ward 2.0 Changes

Ward 2.0 removes `guardRequest` / `guardRequestWith` middleware wrappers, validates `createWard` options, and warns on common policy misuse.

Removed exports:

- `guardRequest`
- `guardRequestWith`
- `GuardRequestInput`
- `GuardRequestWithInput`
- `GuardResult`
- `PrincipalExtractor`
- `WardRequest`

Added:

- `_dev.ts` development warning for ANONYMOUS-role rules with `when` predicates

## Replace Middleware Guards

Use `explain()` directly at request boundaries:

```ts
// Ward 1
import { guardRequest, guardRequestWith } from '@vielzeug/ward';

const result = guardRequest({ ward, principal, resource: 'posts', action: 'read' });
if (!result.granted) return res.status(403).json({ error: result.reason });
```

```ts
// Ward 2
const decision = ward.explain({ principal, resource: 'posts', action: 'read' });
if (!decision.allowed) return res.status(403).json({ error: decision.reason });
```

For async principal extraction:

```ts
// Ward 1
const result = await guardRequestWith({ ward, req, extractPrincipal, resource: 'posts', action: 'read' });

// Ward 2
const principal = await extractPrincipal(req);
const decision = ward.explain({ principal, resource: 'posts', action: 'read' });
```

## Options Validation

Ward 2 validates `createWard` options at construction time:

- `logger` must be a function or `undefined`.
- `onConflict` must be a function or `undefined`.
- `maxConflicts` must be a finite non-negative number.

Invalid options throw `WardConfigError` before any rules compile.

## Anonymous Predicate Warning

Ward 2 emits a development warning when a rule pairs the `ANONYMOUS` role with a `when` predicate. Predicates are skipped for unauthenticated principals, so the rule can never match anonymous requests. This warning is tree-shaken from production builds.
