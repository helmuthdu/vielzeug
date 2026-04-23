---
title: 'Permit Examples — Rule Snapshot/Replace for Test Isolation'
description: 'Use rules() and replace() to keep tests isolated and deterministic.'
---

## Rule Snapshot/Replace for Test Isolation

```ts
import { createPermit } from '@vielzeug/permit';

const permit = createPermit();

permit.set({ role: 'viewer', resource: 'posts', action: 'read', effect: 'allow' });

const baselineRules = permit.rules();

beforeEach(() => {
  permit.replace(baselineRules);
});

afterEach(() => {
  permit.clear();
});
```
