---
title: 'Ward Examples — Wildcard Exceptions'
description: 'Override a broad wildcard policy through rule order.'
---

## Wildcard Exceptions

### Problem

One sensitive resource must override a broad permission.

### Solution

Put the exact exception before the broad wildcard allow.

```ts
import { allow, createWard, deny, WILDCARD } from '@vielzeug/ward';

const ward = createWard([
  deny('editor', 'secrets', ['read']),
  allow('editor', WILDCARD, ['read']),
]);

const editor = { id: 'u1', roles: ['editor'] };
ward.decide({ action: 'read', principal: editor, resource: 'secrets' }).effect; // deny
ward.decide({ action: 'read', principal: editor, resource: 'posts' }).effect; // allow
```

### Pitfalls

A broad rule placed first makes later exceptions unreachable.

### Related

- [Wildcard action](./wildcard-action.md)
