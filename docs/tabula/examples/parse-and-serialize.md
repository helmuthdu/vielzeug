---
title: 'Tabula Examples: Parse and Serialize'
description: 'First steps with @vielzeug/tabula: parse an unknown export, fix it up, and write it back out.'
---

## Parse and Serialize

### Problem

A spreadsheet export just landed in a textarea or an upload handler. You do not know whether
it is comma- or semicolon-delimited, titles contain commas, and some notes contain quotes.

### Solution

Parse without configuring anything, work with records, and serialize with explicit columns:

```ts
import { parseRecords, recordsToCsv } from '@vielzeug/tabula';

const rows = parseRecords(pastedText); // delimiter auto-detected, "" unescaped, CRLF handled
const fixed = rows.map((row) => ({ ...row, title: row.title?.trim() ?? '' }));

const csv = recordsToCsv(fixed, { columns: ['id', 'title', 'total'], newline: '\n' });
```

`recordsToCsv` quotes only the cells that need it, so the output stays readable while still
surviving the round trip: `parseGrid(toCsv(parseGrid(csv)))` equals `parseGrid(csv)`.

For a large uploaded file, stream instead of reading it whole:

```ts
import { createCsvGridStream } from '@vielzeug/tabula';

const rows = file.stream().pipeThrough(new TextDecoderStream()).pipeThrough(createCsvGridStream());
for await (const row of rows) consume(row); // memory stays flat regardless of file size
```

### Pitfalls

- Auto-detection only reads the first line; a degenerate first line (single column) falls back to `,`. Pin `delimiter` when the producer is known.
- Short rows omit keys entirely — check `row.total === undefined`, not `!row.total`, if empty and missing mean different things to you.
- The streaming reader emits the header row too; skip it at the consumer, not by parsing twice.
- `toCsv` defaults to CRLF (RFC 4180). Pass `newline: '\n'` when the consumer diffs or hashes the output.

### Related

- [Usage Guide](../usage.md)
- [API Reference](../api.md)
- [Typed Imports recipe](./typed-imports.md)
