---
title: 'Ward Examples — Rule Specificity'
description: 'Rule specificity example for @vielzeug/ward.'
---

## Rule Specificity

```ts
import { WILDCARD, createWard } from '@vielzeug/ward';

const ward = createWard([
  { role: 'editor', resource: WILDCARD, action: 'read', effect: 'allow', priority: 10 },
  { role: 'editor', resource: 'posts', action: 'read', effect: 'deny', priority: 10 },
]);

ward.explain({ principal: { id: 'u1', roles: ['editor'] }, resource: 'posts', action: 'read' }).allowed; // false
ward.explain({ principal: { id: 'u1', roles: ['editor'] }, resource: 'comments', action: 'read' }).allowed; // true
```
