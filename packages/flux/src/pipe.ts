import type { Operator, PipedStream, Stream, ValidPipe } from './types';

import { applyOperators } from './_pipe';

/** Standalone composition preserves contextual types for inline generic operators. */
export function pipe<Input>(source: Stream<Input>): Stream<Input>;
export function pipe<Input, A>(source: Stream<Input>, operator1: Operator<Input, A>): Stream<A>;
export function pipe<Input, A, B>(
  source: Stream<Input>,
  operator1: Operator<Input, A>,
  operator2: Operator<A, B>,
): Stream<B>;
export function pipe<Input, A, B, C>(
  source: Stream<Input>,
  operator1: Operator<Input, A>,
  operator2: Operator<A, B>,
  operator3: Operator<B, C>,
): Stream<C>;
export function pipe<Input, A, B, C, D>(
  source: Stream<Input>,
  operator1: Operator<Input, A>,
  operator2: Operator<A, B>,
  operator3: Operator<B, C>,
  operator4: Operator<C, D>,
): Stream<D>;
export function pipe<Input, A, B, C, D, E>(
  source: Stream<Input>,
  operator1: Operator<Input, A>,
  operator2: Operator<A, B>,
  operator3: Operator<B, C>,
  operator4: Operator<C, D>,
  operator5: Operator<D, E>,
): Stream<E>;
export function pipe<Input, A, B, C, D, E, F>(
  source: Stream<Input>,
  operator1: Operator<Input, A>,
  operator2: Operator<A, B>,
  operator3: Operator<B, C>,
  operator4: Operator<C, D>,
  operator5: Operator<D, E>,
  operator6: Operator<E, F>,
): Stream<F>;
export function pipe<Input, A, B, C, D, E, F, G>(
  source: Stream<Input>,
  operator1: Operator<Input, A>,
  operator2: Operator<A, B>,
  operator3: Operator<B, C>,
  operator4: Operator<C, D>,
  operator5: Operator<D, E>,
  operator6: Operator<E, F>,
  operator7: Operator<F, G>,
): Stream<G>;
export function pipe<Input, A, B, C, D, E, F, G, H>(
  source: Stream<Input>,
  operator1: Operator<Input, A>,
  operator2: Operator<A, B>,
  operator3: Operator<B, C>,
  operator4: Operator<C, D>,
  operator5: Operator<D, E>,
  operator6: Operator<E, F>,
  operator7: Operator<F, G>,
  operator8: Operator<G, H>,
): Stream<H>;
export function pipe<Input, A, B, C, D, E, F, G, H, I>(
  source: Stream<Input>,
  operator1: Operator<Input, A>,
  operator2: Operator<A, B>,
  operator3: Operator<B, C>,
  operator4: Operator<C, D>,
  operator5: Operator<D, E>,
  operator6: Operator<E, F>,
  operator7: Operator<F, G>,
  operator8: Operator<G, H>,
  operator9: Operator<H, I>,
): Stream<I>;
export function pipe<Input, A, B, C, D, E, F, G, H, I, J>(
  source: Stream<Input>,
  operator1: Operator<Input, A>,
  operator2: Operator<A, B>,
  operator3: Operator<B, C>,
  operator4: Operator<C, D>,
  operator5: Operator<D, E>,
  operator6: Operator<E, F>,
  operator7: Operator<F, G>,
  operator8: Operator<G, H>,
  operator9: Operator<H, I>,
  operator10: Operator<I, J>,
): Stream<J>;
export function pipe<Input, const Operators extends readonly unknown[]>(
  source: Stream<Input>,
  ...operators: Operators & ValidPipe<Input, Operators>
): PipedStream<Input, Operators>;
export function pipe<Input, const Operators extends readonly unknown[]>(
  source: Stream<Input>,
  ...operators: Operators & ValidPipe<Input, Operators>
): PipedStream<Input, Operators> {
  return applyOperators(source as Stream<unknown>, operators) as PipedStream<Input, Operators>;
}
