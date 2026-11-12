import { TabulaParseError } from './errors';
import type {
  TabulaParseOptions,
  TabulaRecordOptions,
  TabulaRecordSerializeOptions,
  TabulaSerializeOptions,
} from './types';

const DEFAULT_NEWLINE = '\r\n';

/** A delimiter the scanner can match: exactly one character. */
function assertSingleChar(delimiter: string): string {
  if (delimiter.length !== 1) {
    throw new TabulaParseError(`The delimiter must be a single character, got "${delimiter}".`);
  }
  return delimiter;
}

/** Detect the delimiter from the first line among comma, semicolon, and tab. */
function detectDelimiter(text: string): string {
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
 * Push-based RFC 4180 scanner: feed text, receive complete rows with the
 * 1-based physical line each started on. Rows may span chunks; `finish()`
 * flushes the pending row. Handles BOM, LF/CRLF/CR, quoted fields with
 * embedded delimiters, newlines and `""` escapes.
 *
 * Without a pinned `delimiter` the scanner accumulates until the first line
 * completes, auto-detects, and starts emitting rows.
 */
export class CsvScanner {
  private delimiter: string | undefined;
  private readonly skipEmptyLines: boolean;
  private buffer = '';
  private field = '';
  private row: string[] = [];
  private inQuotes = false;
  private fieldWasQuoted = false;
  private pendingCr = false;
  private started = false;
  private line = 1;
  private rowLine = 1;

  constructor(options: TabulaParseOptions = {}) {
    this.delimiter = options.delimiter === undefined ? undefined : assertSingleChar(options.delimiter);
    this.skipEmptyLines = options.skipEmptyLines !== false;
  }

  /** Emit every completed row with the 1-based physical line it started on. */
  push(text: string, onRow: (row: string[], line: number) => void): void {
    if (this.delimiter === undefined) {
      this.buffer += text;
      // Auto-detection needs a complete first line; hold the chunks until then.
      if (!/[\n\r]/.test(this.buffer)) return;
      this.delimiter = detectDelimiter(this.buffer);
      text = this.buffer;
      this.buffer = '';
    }
    this.scan(text, onRow);
  }

  finish(onRow: (row: string[], line: number) => void): void {
    if (this.buffer !== '') {
      const text = this.buffer;
      this.buffer = '';
      this.delimiter = this.delimiter ?? detectDelimiter(text);
      this.scan(text, onRow);
    }
    if (this.field !== '' || this.row.length > 0 || this.fieldWasQuoted) this.endRow(onRow);
    this.pendingCr = false;
  }

  private scan(text: string, onRow: (row: string[], line: number) => void): void {
    const delimiter = this.delimiter as string;
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
      if (char === delimiter) {
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
export function parseGrid(text: string, options: TabulaParseOptions = {}): string[][] {
  const scanner = new CsvScanner(options);
  const rows: string[][] = [];
  scanner.push(text, (row) => rows.push(row));
  scanner.finish((row) => rows.push(row));
  return rows;
}

/** A row paired with the 1-based physical line it started on. */
type LineRow = { line: number; record: Record<string, string> };

/**
 * Parse into records while keeping each row's physical start line: the shared
 * core of {@link parseRecords} and the typed reader. Headers default to the
 * first row; explicit `headers` make it headerless. Extra cells are dropped,
 * short rows leave keys off.
 */
export function parseTrackedRecords(text: string, options: TabulaRecordOptions = {}): LineRow[] {
  if (options.headers !== undefined && options.headers.length === 0) {
    throw new TabulaParseError('headers must name at least one column');
  }
  const scanner = new CsvScanner(options);
  const rows: [cells: string[], line: number][] = [];
  scanner.push(text, (cells, line) => rows.push([cells, line]));
  scanner.finish((cells, line) => rows.push([cells, line]));
  if (rows.length === 0) return [];
  const headers = options.headers ?? rows[0][0];
  const data = options.headers === undefined ? rows.slice(1) : rows;
  return data.map(([cells, line]) => {
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      const cell = cells[index];
      if (cell !== undefined) record[header] = cell;
    });
    return { line, record };
  });
}

/**
 * Parse CSV text into `Record<string, string>` rows. By default the first row
 * supplies the headers; pass explicit `headers` to read a headerless document.
 * Rows with extra cells lose the overflow; short rows leave keys off the record.
 */
export function parseRecords(text: string, options: TabulaRecordOptions = {}): Record<string, string>[] {
  return parseTrackedRecords(text, options).map(({ record }) => record);
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
  const delimiter = assertSingleChar(options.delimiter ?? ',');
  const newline = options.newline ?? DEFAULT_NEWLINE;
  const quoteAll = options.quoteAll === true;
  const lines: string[] = [];
  for (const row of rows) {
    lines.push(row.map((cell) => serializeCell(cell, delimiter, quoteAll)).join(delimiter));
  }
  return lines.join(newline) + (lines.length > 0 ? newline : '');
}

/**
 * Serialize records to CSV with a header row. Columns are the union of every
 * record's keys in first-seen order unless `columns` overrides the order.
 */
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
