import { TabulaParseError } from './errors';
import type {
  TabulaParseOptions,
  TabulaRecordOptions,
  TabulaRecordSerializeOptions,
  TabulaSerializeOptions,
} from './types';

const DEFAULT_NEWLINE = '\r\n';

/** Detect the delimiter from the first line among comma, semicolon, and tab. */
export function detectDelimiter(text: string): string {
  const firstLine = text.slice(0, 2_048).split(/[\n\r]/, 1)[0] ?? '';
  let best = ',';
  let bestCount = -1;
  for (const candidate of ['\t', ';', ',']) {
    let count = 0;
    let quoted = false;
    for (let i = 0; i < firstLine.length; i += 1) {
      const char = firstLine[i];
      if (char === '"') quoted = !quoted;
      else if (char === candidate && !quoted) count += 1;
    }
    if (count > bestCount) {
      best = candidate;
      bestCount = count;
    }
  }
  return bestCount > 0 ? best : ',';
}

/**
 * Push-based RFC 4180 scanner: feed text, receive complete rows. Rows may span
 * chunks; `finish()` flushes the pending row. Handles BOM, LF/CRLF/CR, quoted
 * fields with embedded delimiters, newlines and `""` escapes.
 */
export class CsvScanner {
  private readonly delimiter: string;
  private readonly skipEmptyLines: boolean;
  private field = '';
  private row: string[] = [];
  private inQuotes = false;
  private fieldWasQuoted = false;
  private pendingCr = false;
  private started = false;
  private line = 1;
  private rowLine = 1;

  constructor(delimiter: string, skipEmptyLines = true) {
    this.delimiter = delimiter;
    this.skipEmptyLines = skipEmptyLines;
  }

  /** Emit every completed row with the 1-based physical line it started on. */
  push(text: string, onRow: (row: string[], line: number) => void): void {
    for (let i = 0; i < text.length; i += 1) {
      let char = text[i] as string;
      if (this.pendingCr) {
        this.pendingCr = false;
        if (char === '\n') continue;
      }
      if (!this.started && i === 0 && char === '\uFEFF') continue; // strip BOM
      this.started = true;
      if (char === '\r') {
        this.pendingCr = true;
        char = '\n';
      }
      if (this.inQuotes) {
        if (char === '\n') this.line += 1; // newlines inside quotes are still physical lines
        if (char === '"') {
          if (text[i + 1] === '"') {
            this.field += '"';
            i += 1;
          } else {
            this.inQuotes = false;
          }
        } else {
          this.field += char;
        }
        continue;
      }
      if (char === '"' && !this.fieldWasQuoted && this.field === '') {
        this.inQuotes = true;
        this.fieldWasQuoted = true;
        continue;
      }
      if (char === '"') {
        // A stray quote inside an unquoted field: keep it literally (forgiving mode).
        this.field += '"';
        continue;
      }
      if (char === this.delimiter) {
        this.row.push(this.field);
        this.field = '';
        this.fieldWasQuoted = false;
        continue;
      }
      if (char === '\n') {
        this.endRow(onRow);
        this.fieldWasQuoted = false;
        continue;
      }
      this.field += char;
    }
  }

  finish(onRow: (row: string[], line: number) => void): void {
    if (this.field !== '' || this.row.length > 0 || this.fieldWasQuoted) this.endRow(onRow);
    this.pendingCr = false;
  }

  private endRow(onRow: (row: string[], line: number) => void): void {
    this.row.push(this.field);
    this.field = '';
    const isBlank = this.row.length === 1 && this.row[0] === '';
    if (!isBlank || !this.skipEmptyLines) onRow(this.row, this.rowLine);
    this.row = [];
    this.line += 1;
    this.rowLine = this.line;
  }
}

/**
 * Parse CSV/TSV text into a raw grid of string cells. Quoted fields may contain
 * the delimiter, newlines, and escaped quotes; blank lines are skipped by
 * default. This is the untyped core every other tabula reader builds on.
 */
function scan(text: string, options: TabulaParseOptions, onRow: (row: string[], line: number) => void): void {
  const delimiter = options.delimiter ?? detectDelimiter(text);
  const scanner = new CsvScanner(delimiter, options.skipEmptyLines !== false);
  scanner.push(text, onRow);
  scanner.finish(onRow);
}

/** A row paired with the 1-based physical line it started on. */
export type LineRow = { line: number; record: Record<string, string> };

/** Parse into records while keeping each row's physical start line (for error reporting). */
export function parseRecordsWithLines(text: string, options: TabulaRecordOptions = {}): LineRow[] {
  if (options.headers !== undefined && options.headers.length === 0) {
    throw new TabulaParseError('headers must name at least one column');
  }
  const rows: { cells: string[]; line: number }[] = [];
  scan(text, options, (cells, line) => rows.push({ cells, line }));
  if (rows.length === 0) return [];
  const headers = options.headers ?? ((rows[0] as { cells: string[] }).cells as readonly string[]);
  const data = options.headers === undefined ? rows.slice(1) : rows;
  return data.map(({ cells, line }) => {
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      const cell = cells[index];
      if (cell !== undefined) record[header] = cell;
    });
    return { line, record };
  });
}

export function parseGrid(text: string, options: TabulaParseOptions = {}): string[][] {
  const rows: string[][] = [];
  scan(text, options, (row) => rows.push(row));
  return rows;
}

/**
 * Parse CSV text into `Record<string, string>` rows. By default the first row
 * supplies the headers; pass explicit `headers` to read a headerless document.
 * Rows with extra cells lose the overflow; short rows leave keys off the record.
 */
export function parseRecords(text: string, options: TabulaRecordOptions = {}): Record<string, string>[] {
  return parseRecordsWithLines(text, options).map(({ record }) => record);
}

function needsQuotes(value: string, delimiter: string): boolean {
  return (
    value.includes(delimiter) ||
    value.includes('"') ||
    value.includes('\n') ||
    value.includes('\r') ||
    value !== value.trim()
  );
}

function serializeCell(raw: unknown, delimiter: string, quoteAll: boolean): string {
  const value = raw === null || raw === undefined ? '' : String(raw);
  if (!quoteAll && !needsQuotes(value, delimiter)) return value;
  return `"${value.replaceAll('"', '""')}"`;
}

/** Serialize a grid of values to CSV text (RFC 4180 quoting, CRLF lines by default). */
export function toCsv(rows: Iterable<readonly unknown[]>, options: TabulaSerializeOptions = {}): string {
  const delimiter = options.delimiter ?? ',';
  const newline = options.newline ?? DEFAULT_NEWLINE;
  const quoteAll = options.quoteAll === true;
  const lines: string[] = [];
  for (const row of rows) {
    lines.push(row.map((cell) => serializeCell(cell, delimiter, quoteAll)).join(delimiter));
  }
  return lines.join(newline) + (lines.length > 0 ? newline : '');
}

/** Serialize records to CSV with a header row; `columns` overrides column order. */
export function recordsToCsv(
  records: Iterable<Record<string, unknown>>,
  options: TabulaRecordSerializeOptions = {},
): string {
  const list = [...records];
  const columns = options.columns ?? [...new Set(list.flatMap((record) => Object.keys(record)))];
  const rows: (readonly unknown[])[] = [columns];
  for (const record of list) rows.push(columns.map((column) => record[column] ?? ''));
  return toCsv(rows, options);
}
