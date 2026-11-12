import { CsvScanner, detectDelimiter } from './csv';
import type { TabulaParseOptions } from './types';

/**
 * A `TransformStream<string, string[]>`: push raw text chunks in, complete
 * grid rows come out — rows spanning chunk boundaries are assembled internally,
 * and the delimiter is auto-detected once the first line is available (unless
 * pinned via `delimiter`). Pair with `TextDecoderStream` for files and
 * `@vielzeug/familiar` workers for off-main-thread parsing of large exports.
 */
export function createCsvGridStream(options: TabulaParseOptions = {}): TransformStream<string, string[]> {
  let delimiter: string | undefined = options.delimiter;
  let scanner: CsvScanner | undefined =
    delimiter === undefined ? undefined : new CsvScanner(delimiter, options.skipEmptyLines !== false);
  let pending = '';
  const ensureScanner = (): CsvScanner => {
    if (scanner === undefined) {
      delimiter = detectDelimiter(pending);
      scanner = new CsvScanner(delimiter, options.skipEmptyLines !== false);
    }
    return scanner;
  };
  return new TransformStream<string, string[]>({
    flush(controller) {
      const active = ensureScanner();
      if (pending !== '') active.push(pending, (row) => controller.enqueue(row));
      active.finish((row) => controller.enqueue(row));
    },
    transform(chunk, controller) {
      if (scanner === undefined) {
        pending += chunk;
        // Wait for the first full line so auto-detection sees a complete header.
        if (!/[\n\r]/.test(pending)) return;
        ensureScanner().push(pending, (row) => controller.enqueue(row));
        pending = '';
        return;
      }
      scanner.push(chunk, (row) => controller.enqueue(row));
    },
  });
}
