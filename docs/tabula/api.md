---
title: 'Tabula: API Reference'
description: 'Public API of @vielzeug/tabula: parsers, serializer, delimiter detection, streaming reader, typed rows, types, and errors.'
---

[[toc]]

## API Overview

| Symbol                | Purpose                                              | Execution | Common gotcha                                                        |
| --------------------- | ---------------------------------------------------- | --------- | -------------------------------------------------------------------- |
| `parseGrid`           | RFC 4180 text → string grid                          | Sync      | Blank lines skipped unless `skipEmptyLines: false`                   |
| `parseRecords`        | First row (or `headers`) as keys                     | Sync      | Short rows omit keys; extra cells are dropped                        |
| `toCsv`               | Grid → CSV text                                      | Sync      | CRLF by default; pass `newline: '\n'` for LF output                  |
| `recordsToCsv`        | Records → CSV text with column union                 | Sync      | Without `columns`, order comes from first-seen keys                  |
| `createCsvGridStream` | `TransformStream<string, string[]>` for chunked text | Async     | The header row is emitted like any other row                         |
| `parseTypedRecords`   | Records through a standard schema                    | Sync      | Async schemas throw; failures aggregate into `TabulaValidationError` |
| `CsvScanner`          | Push-based state machine behind every parser         | Sync      | Call `finish()` after the last `push()`; auto-detects when unpinned  |

## Package Entry Point

```ts
import { parseGrid, parseRecords, recordsToCsv, toCsv } from '@vielzeug/tabula';
```

## Functions

### parseGrid

```ts
function parseGrid(text: string, options?: TabulaParseOptions): string[][];
```

Parses CSV text into rows of cells. A leading BOM is stripped; `\r\n`, `\r`, and `\n` all
terminate records; `""` inside quoted fields is an escaped quote; quotes inside unquoted
fields are literal (spreadsheet producers emit them constantly). `delimiter` must be a single
character and defaults to auto-detection: the scanner counts `,`, `;`, and tab outside quotes on
the first line and takes the winner (ties go to `,`).

### parseRecords

```ts
function parseRecords(text: string, options?: TabulaRecordOptions): Record<string, string>[];
```

Reads the first row as headers unless `headers` is supplied (then the first row is data).
Extra cells beyond the header are dropped; missing cells leave the key off the record.
Empty `headers` throws `TabulaParseError`.

### toCsv

```ts
function toCsv(rows: Iterable<readonly unknown[]>, options?: TabulaSerializeOptions): string;
```

Serializes a grid. Fields are quoted only when they contain the delimiter, a quote, `\r`,
`\n`, or leading/trailing spaces — or when `quoteAll` is set. `null`/`undefined` become empty
cells; other values go through `String()`. Lines end with `\r\n` unless `newline` says
otherwise.

### recordsToCsv

```ts
function recordsToCsv(records: Iterable<Record<string, unknown>>, options?: TabulaRecordSerializeOptions): string;
```

Writes a header row plus one row per record. Columns are `options.columns` or the first-seen
union of record keys. Missing keys serialize as empty cells.

### createCsvGridStream

```ts
function createCsvGridStream(options?: TabulaParseOptions): TransformStream<string, string[]>;
```

Transforms streamed text into completed rows. Until the first newline arrives (needed for
delimiter auto-detection unless `delimiter` is pinned) input is buffered by the scanner; after
that rows are emitted as they complete.

### parseTypedRecords

```ts
function parseTypedRecords<T>(
  text: string,
  schema: StandardSchemaV1<Record<string, unknown>, T>,
  options?: TabulaRecordOptions,
): T[];
```

Validates every record through `schema['~standard'].validate`. Valid rows accumulate;
invalid rows produce a `TabulaRowError` with the row's 1-based physical line number, exactly
as a spreadsheet would show it. All rows are attempted, then failures throw as one `TabulaValidationError`.

### CsvScanner

```ts
class CsvScanner {
  constructor(options?: TabulaParseOptions);
  push(text: string, onRow: (row: string[], line: number) => void): void;
  finish(onRow: (row: string[], line: number) => void): void;
}
```

The push-based state machine every parser shares — split a fetch body however you like and
semantics stay identical. Without a pinned `delimiter` it holds input until the first line
completes, auto-detects, and starts emitting. `push` may be called with any chunk boundary,
mid-quote included.
Each row arrives with the 1-based physical line it started on (quoted newlines and blank
lines included), which is what `TabulaRowError.line` reports.

## Types

| Type                           | Purpose                                            |
| ------------------------------ | -------------------------------------------------- |
| `TabulaOptions`                | `{ delimiter? }` shared by parsers and serializers |
| `TabulaParseOptions`           | `+ { skipEmptyLines? }` (default `true`)           |
| `TabulaRecordOptions`          | `+ { headers? }` for headerless documents          |
| `TabulaSerializeOptions`       | `{ delimiter?, quoteAll?, newline? }`              |
| `TabulaRecordSerializeOptions` | `+ { columns? }` for explicit column order         |

## Errors

| Error                   | Thrown when                                                                       |
| ----------------------- | --------------------------------------------------------------------------------- |
| `TabulaError`           | Base class for every tabula error                                                 |
| `TabulaParseError`      | A request cannot be honored (`headers: []`, multi-char `delimiter`, async schema) |
| `TabulaRowError`        | One row failed schema validation (`line`, `issues`)                               |
| `TabulaValidationError` | Typed parse finished with any invalid rows (`errors: TabulaRowError[]`)           |
