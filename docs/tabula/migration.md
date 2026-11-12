---
title: 'Tabula Migration'
---

# Tabula Migration

## The scanner owns detection; the surface shrank

`CsvScanner` now takes the shared options object and auto-detects the delimiter itself, holding
input until the first line completes:

```ts
// Before
const scanner = new CsvScanner(undefined); // delimiter required up front; detection lived in createCsvGridStream

// After
import { CsvScanner } from '@vielzeug/tabula';

const scanner = new CsvScanner(); // or new CsvScanner({ delimiter: ';' })
```

Three exports were removed as part of the same move:

- `detectDelimiter`: detection is internal (every parse entry point still auto-detects; pin
  `delimiter` when the producer is known).
- `parseRecordsWithLines` and `LineRow`: undocumented row-line tracking stays internal;
  `parseTypedRecords` reports lines through `TabulaRowError.line`.

Multi-character delimiters, which previously parsed into a single-column mystery, now throw
`TabulaParseError` on both parse and serialize.
