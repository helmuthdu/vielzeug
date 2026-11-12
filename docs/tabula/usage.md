---
title: 'Tabula: Usage Guide'
description: 'How to use @vielzeug/tabula: parsing grids and records, delimiter detection, serializing, streaming, and schema-typed rows.'
---

[[toc]]

## Basic Usage

Everything is strings in, strings out — CSV has no types, and tabula does not pretend
otherwise. Parse to a grid when you need positional access, or to records when the first row
is a header:

```ts
import { parseGrid, parseRecords } from '@vielzeug/tabula';

parseGrid('a,b\n"x,y",z\n');
// [['a', 'b'], ['x,y', 'z']]

parseRecords('id,total\n7,"1,200.00"\n');
// [{ id: '7', total: '1,200.00' }]
```

A few parser behaviors worth knowing because every hand-rolled parser gets them wrong:

- A BOM is stripped, and `\r\n`, `\r`, and `\n` all end a record.
- `""` inside a quoted field is an escaped quote; fields are quoted only as needed on output.
- A row longer than the header is truncated to the header; a shorter row simply omits keys
  (no surprise `undefined` values in your records).
- Blank lines are skipped by default; pass `skipEmptyLines: false` to keep them as `['']`.

## Delimiter Detection

`detectDelimiter` counts `,`, `;`, and tab occurrences outside quotes on the first line and
returns the winner (ties go to `,`). Every parse entry point defaults to it, so a paste box
and an uploaded `.csv` both just work:

```ts
import { parseGrid } from '@vielzeug/tabula';

parseGrid('a;b\n1;2\n'); // German Excel export: delimiter is ';'
```

Pin `delimiter` whenever the source is known — it is faster (the parser never counts) and it
makes a stray comma in a title harmless.

## Serializing

`toCsv` writes a grid; `recordsToCsv` writes records, taking the column order from explicit
`columns` or from the first-seen key order. Fields are quoted only when they contain the
delimiter, a quote, a newline, or leading/trailing spaces:

```ts
import { recordsToCsv, toCsv } from '@vielzeug/tabula';

toCsv([['note'], ['said "hi"']]);
// note\r\n"said ""hi"""

recordsToCsv([{ b: 2, a: 1 }], { columns: ['a', 'b'], newline: '\n' });
// a,b\n1,2
```

`null` and `undefined` serialize as empty cells; everything else goes through `String()`.
Use `quoteAll: true` when the consumer is a spreadsheet import wizard that guesses column
types from the first rows.

## Streaming

`createCsvGridStream` is a `TransformStream<string, string[]>`: pipe a text stream through it
and consume rows as they complete. Even when auto-detecting the delimiter it buffers at most
one line, so gigabyte exports never touch memory:

```ts
import { createCsvGridStream } from '@vielzeug/tabula';

const rows = file.stream().pipeThrough(new TextDecoderStream()).pipeThrough(createCsvGridStream());
for await (const row of rows) consume(row);
```

The header row is emitted like any other row — decide what to do with it at the consumer.

## Typed Rows

`parseTypedRecords` runs every record through a Spell (or any standard-schema) validator and
aggregates failures: one `TabulaValidationError` carrying a `TabulaRowError` per bad row with
its 1-based line number, so a broken export is reported in full rather than at the first bad
cell.

```ts
import { s } from '@vielzeug/spell';
import { parseTypedRecords } from '@vielzeug/tabula';

const orderSchema = s.object({ id: s.string(), qty: s.coerce.number() });
const orders = parseTypedRecords(text, orderSchema); // qty arrives as a number
```

Schema validation must be synchronous; an async schema throws a `TypeError` immediately
rather than half-parsing the file.

## Error Handling

All errors extend `TabulaError`. Parsing is deliberately forgiving of stray quotes
(spreadsheet producers emit them constantly), so `TabulaParseError` fires only on requests
that cannot be honored, such as `headers: []`. Row-level validation failures arrive as one
`TabulaValidationError` whose `errors` lists a `TabulaRowError` per bad line — report those
per line, not as one opaque message.

## Best Practices

- Pin `delimiter` and `quote` when the producer is known; auto-detect only for paste boxes and unknown uploads.
- Feed user imports through `parseTypedRecords` with Spell schemas — CSV hands you strings, and the coercion is where bugs live.
- Serialize with `recordsToCsv` and explicit `columns` for exports; key insertion order is accidental API otherwise.
- For files larger than a few MB, stream: `createCsvGridStream` keeps memory flat and shares the exact scanner semantics of `parseGrid`.
