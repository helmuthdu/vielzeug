---
title: 'Tabula: typed CSV and TSV'
description: 'Typed CSV and TSV: RFC 4180 parser with schema-validated rows, streaming reader, and safe serializer.'
package: tabula
category: utilities
keywords: [csv, tsv, delimiter, spreadsheet, import, export, parser, serializer, rfc-4180, data-exchange]
exports: [parseGrid, parseRecords, toCsv, recordsToCsv, createCsvGridStream, parseTypedRecords, CsvScanner]
related: [spell, archive]
environments: [browser, node]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageHero package="tabula" />

## Why Tabula?

CSV is the format every spreadsheet, analytics tool, and finance department speaks — and the
format most hand-rolled parsers get subtly wrong: an embedded comma in a quoted title, a
double-quote escape, a CRLF that silently becomes part of a value. Tabula implements RFC 4180
exactly, with one scanner behind every entry point, so paste-box input, uploaded files, and
Node streams all parse with identical semantics.

```ts
// Before: a join that dies on the first comma inside a product name
const rows = orders.map((o) => [o.id, o.title, o.total].join(',')); // title: "Red, Metallic" → corrupt

// After: quoting, CRLF, and escaping are the library's problem
import { parseRecords, recordsToCsv } from '@vielzeug/tabula';

const csv = recordsToCsv(orders); // every field quoted only when needed, round-trips exactly
```

Records are plain objects, and `parseTypedRecords` hands them straight to a
[Spell](/spell/) standard schema — strings in, typed rows out, with per-line issues aggregated
into one error. The streaming reader processes chunks and blobs without ever buffering the
whole document.

## Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/tabula
```

```sh [npm]
npm install @vielzeug/tabula
```

```sh [yarn]
yarn add @vielzeug/tabula
```

:::

## Quick Start

```ts
import { parseRecords, recordsToCsv } from '@vielzeug/tabula';

const grid = parseRecords('id,total\n7,"1,200.00"\n8,99.50\n');
// [{ id: '7', total: '1,200.00' }, { id: '8', total: '99.50' }]

console.log(recordsToCsv([{ a: 1, b: 'x,y' }]));
// a,b
// 1,"x,y"
```

## Features

<div class="features-grid">

- **`parseGrid`**: RFC 4180 scanner into a string grid — BOM stripped, CRLF/CR/LF endings, `""` escapes, configurable delimiter.
- **`parseRecords`**: first row as keys (or your own `headers`), short rows omit keys instead of inventing `undefined`.
- **Delimiter auto-detection**: `,`, `;`, and tab are counted outside quotes on the first line — no content sniffing, and pinning `delimiter` skips it.
- **`toCsv` / `recordsToCsv`**: quotes only when needed, `quoteAll` for spreadsheet paranoia, CRLF by default.
- **`createCsvGridStream`**: a `TransformStream` of rows for uploads and Node streams; even delimiter auto-detection buffers at most one line.
- **`parseTypedRecords`**: rows through any Spell/standard-schema validator — one `TabulaValidationError` with every row's line number and issues.
- **One scanner everywhere**: `CsvScanner` is push-based; sync parse, streams, and typed parsing share the exact same state machine.

</div>

## Documentation

<div class="doc-links">

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)

</div>

## See Also

<div class="see-also">

- [Spell](/spell/): the schema engine behind `parseTypedRecords`.
- [Archive](/archive/): stores the files these rows came from.
- [Tempo](/tempo/): parse and serialize the dates that live in CSV columns.

</div>

<!-- markdownlint-enable MD025 MD033 MD060 -->
