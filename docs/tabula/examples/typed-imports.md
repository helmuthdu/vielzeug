---
title: 'Tabula Examples: Typed Import Pipeline'
description: 'Validate CSV uploads with Spell schemas and report every bad row with its line number.'
---

## Typed Import Pipeline

### Problem

CSV hands you strings, so `qty` arrives as `"12"` and one typo in a thousand-row upload
should not cost you the whole file — but it must not silently become `NaN` either.

### Solution

Give [Spell](/spell/) a coercion schema and let `parseTypedRecords` aggregate every failure:

```ts
import { s } from '@vielzeug/spell';
import { parseTypedRecords, TabulaValidationError } from '@vielzeug/tabula';

const importSchema = s.object({
  id: s.string(),
  qty: s.coerce.number(),
  shipped: s.coerce.boolean(), // 'true'/'1' → true, 'false'/'0' → false
});

try {
  const orders = parseTypedRecords(text, importSchema);
  await ingest(orders); // qty is a number, shipped is a boolean
} catch (error) {
  if (error instanceof TabulaValidationError) {
    for (const row of error.errors) {
      report(`line ${row.line}: ${row.issues?.map((i) => (i as { message: string }).message).join(', ')}`);
    }
  }
}
```

Every row is validated even after another fails, so the user fixes the whole upload in one
pass. `line` counts physical lines including the header, matching what a spreadsheet shows.

### Pitfalls

- Schema validation is synchronous; an async schema throws a `TypeError` before any row is produced. Do the async work on the parsed result, not in the schema.
- `s.coerce.boolean()` maps `'true'/'1'` and `'false'/'0'` deliberately — an arbitrary non-empty string like `'yes'` fails validation instead of becoming `true` by accident.
- Empty cells fail required fields; if blank means zero, add `.optional().pipe(...)` or a default to the schema rather than pre-processing rows.

### Related

- [Usage Guide](../usage.md)
- [API Reference](../api.md)
- [Spell](/spell/)
