---
title: 'Ward Examples — Conflict Detection'
description: 'Detect shadowed and duplicate policy rules with @vielzeug/ward.'
---

## Conflict Detection

### Problem

As a policy grows, rules can inadvertently shadow each other. You want to detect unreachable rules at startup or in a CI step rather than discovering them as silent authorization bugs.

### Solution

Use `ward.detectConflicts()` to find duplicate or shadowed predicate-free rules. The result is lazily computed and cached, so calling it repeatedly is cheap after the first call.

```ts
import { createWard } from '@vielzeug/ward';

const ward = createWard([
  { role: 'editor', resource: 'posts', action: 'update', effect: 'allow' },
  // Duplicate: same (role, resource, action) — this rule can never fire
  { role: 'editor', resource: 'posts', action: 'update', effect: 'deny' },

  // Shadowed: the wildcard rule covers everything the next rule could match
  { role: '*', resource: 'posts', action: '*', effect: 'allow', priority: 10 },
  { role: 'viewer', resource: 'posts', action: 'read', effect: 'deny' },
]);

const conflicts = ward.detectConflicts();
// [
//   { kind: 'duplicate', indexA: 0, indexB: 1, ruleA: …, ruleB: … },
//   { kind: 'shadowed', shadowedIndex: 3, shadowedRule: …, shadowingIndex: 2, shadowingRule: … },
// ]

conflicts.forEach((c) => {
  if (c.kind === 'duplicate') {
    console.warn(`[ward] duplicate: Rule[${c.indexB}] unreachable (Rule[${c.indexA}] always wins)`);
  } else {
    console.warn(`[ward] shadowed: Rule[${c.shadowedIndex}] unreachable (shadowed by Rule[${c.shadowingIndex}])`);
  }
});
```

### Detect at creation time with `onConflict`

For early-fail detection, pass `onConflict` (or set `strict: true`) to `createWard`:

```ts
const ward = createWard(
  [
    { role: 'editor', resource: 'posts', action: 'update', effect: 'allow' },
    { role: 'editor', resource: 'posts', action: 'update', effect: 'deny' },
  ],
  {
    // Called synchronously for each conflict at creation time:
    onConflict: (c) =>
      c.kind === 'duplicate'
        ? console.error(`Policy conflict: Rule[${c.indexB}] duplicate of Rule[${c.indexA}]`)
        : console.error(`Policy conflict: Rule[${c.shadowedIndex}] shadowed by Rule[${c.shadowingIndex}]`),
  },
);
```

To throw on the first conflict (e.g. in a test environment):

```ts
const ward = createWard(rules, { strict: true }); // throws if any conflict exists
```

### Cap analysis cost for large policies

`detectConflicts` is O(n²). For large auto-generated policies, cap the number of conflicts returned:

```ts
const ward = createWard(rules, { maxConflicts: 50 });

const conflicts = ward.detectConflicts(); // at most 50 entries
```

### What is excluded from conflict detection?

Rules with a `when` predicate are excluded from both `'duplicate'` and `'shadowed'` detection. Their applicability can only be determined at runtime based on contextual data, so they cannot be statically flagged as unreachable.

```ts
const ward = createWard([
  // NOT flagged — the predicate may fail and cause the rule to not match
  { role: 'editor', resource: 'posts', action: 'update', effect: 'allow', when: owns('authorId') },
  { role: 'editor', resource: 'posts', action: 'update', effect: 'deny', when: owns('authorId') },
]);

ward.detectConflicts(); // []
```

### Pitfalls

- `detectConflicts` only checks static shadowing — it does not model `priority` interactions beyond identifying which rule has higher priority.
- `'shadowed'` requires the shadowing rule to have **no** `when` predicate. A predicate-bearing rule with higher priority may still fail at runtime, so it is not treated as a static shadow.
- For very large dynamically generated policies (thousands of rules), prefer `maxConflicts` to avoid O(n²) cost on every startup.

### Related

- [Inheritance And Overrides](./inheritance-and-overrides.md)
- [Wildcard Action](./wildcard-action.md)
