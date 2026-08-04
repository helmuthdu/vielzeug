import type { PipedStream, Stream, ValidPipe } from './types';

import { applyOperators } from './_pipe';

/** Standalone composition keeps unlimited operator chains type-safe. */
export function pipe<Input, const Operators extends readonly unknown[]>(
  source: Stream<Input>,
  ...operators: Operators & ValidPipe<Input, Operators>
): PipedStream<Input, Operators> {
  return applyOperators(source as Stream<unknown>, operators) as PipedStream<Input, Operators>;
}
