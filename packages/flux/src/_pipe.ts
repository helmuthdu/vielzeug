import type { Operator, Stream } from './types';

export function applyOperators(source: Stream<unknown>, operators: readonly Operator[]): Stream<unknown> {
  return operators.reduce((current, operator) => operator(current), source);
}
