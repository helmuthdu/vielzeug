import { CsvScanner } from './csv';
import type { TabulaParseOptions } from './types';

/**
 * A `TransformStream<string, string[]>`: push raw text chunks in, complete
 * grid rows come out. The {@link CsvScanner} assembles rows across chunk
 * boundaries and auto-detects the delimiter once the first line is available
 * (unless pinned via `delimiter`). Pair with `TextDecoderStream` for files and
 * `@vielzeug/familiar` workers for off-main-thread parsing of large exports.
 */
export function createCsvGridStream(options: TabulaParseOptions = {}): TransformStream<string, string[]> {
  const scanner = new CsvScanner(options);
  return new TransformStream<string, string[]>({
    flush(controller) {
      scanner.finish((row) => controller.enqueue(row));
    },
    transform(chunk, controller) {
      scanner.push(chunk, (row) => controller.enqueue(row));
    },
  });
}
