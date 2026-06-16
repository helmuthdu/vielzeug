---
title: 'Spell Examples — Schema Traversal with walk()'
description: 'Schema traversal example for @vielzeug/spell.'
---

## Schema Traversal with walk()

### Problem

You need to inspect or transform a schema tree at runtime — for example, to collect all field names, extract required fields, or generate a field list for a UI form builder. Direct instanceof checks against internal classes are brittle and couple you to implementation details.

### Solution

Use `walk()` with a `SchemaWalker` visitor object. Each handler receives the typed schema for that kind; add an `unknown` fallback to handle any kind you do not explicitly list.

```ts
import { s, type SchemaWalker } from '@vielzeug/spell';

// Collect all leaf field names from an object schema tree.
function collectLeafFields(schema: ReturnType<typeof s.object>): string[] {
  const fields: string[] = [];

  const visitor: SchemaWalker<void> = {
    object(node) {
      for (const [key, child] of Object.entries(node.shape)) {
        const childKind = child.kind;

        if (childKind === 'object') {
          child.walk(visitor);
        } else {
          fields.push(key);
        }
      }
    },
    unknown() {},
  };

  schema.walk(visitor);

  return fields;
}

const User = s.object({
  email: s.string().email(),
  name: s.string().min(1),
  profile: s.object({
    bio: s.string().optional(),
    website: s.string().url().optional(),
  }),
});

console.log(collectLeafFields(User));
// ['email', 'name', 'bio', 'website']
```

#### Checking required fields

```ts
import { s, type SchemaWalker } from '@vielzeug/spell';

function requiredFields(schema: ReturnType<typeof s.object>): string[] {
  const required: string[] = [];

  const visitor: SchemaWalker<void> = {
    object(node) {
      for (const [key, child] of Object.entries(node.shape)) {
        if (!child.isOptional) required.push(key);
      }
    },
    unknown() {},
  };

  schema.walk(visitor);

  return required;
}

const Signup = s.object({
  email: s.string().email(),
  name: s.string().min(1),
  referral: s.string().optional(),
});

console.log(requiredFields(Signup)); // ['email', 'name']
```

### Pitfalls

- If no handler matches and no `unknown` fallback is provided, `walk()` returns `null`. Add an `unknown` handler when the calling code must receive a non-null value for every schema.
- `walk()` does not recurse automatically — you must call `child.walk(visitor)` inside your `object` handler to descend into nested schemas.
- Wrapper schemas (`optional`, `nullable`, `nullish`) reflect as their inner `kind`, so `s.string().optional().kind` is `'string'`, not `'optional'`.

### Related

- [Schema Introspection and Round-Trips](./introspection.md)
- [Validating API Payloads](./api.md)
