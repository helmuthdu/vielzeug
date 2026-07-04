import type { Flux, Operator } from './types';

/**
 * Builds the shared `pipe()` implementation used by `flux()` and every `Subject` variant —
 * previously copy-pasted once per factory. `getInstance` is called lazily so the returned
 * function can be assigned into an object literal that self-references its own binding
 * (`instance`/`subject`) before that binding is initialised.
 * @internal
 */
export function makePipe<T>(getInstance: () => Flux<T>): Flux<T>['pipe'] {
  return ((...operators: Operator[]) =>
    operators.reduce((f: Flux<unknown>, op) => op(f), getInstance() as Flux<unknown>)) as Flux<T>['pipe'];
}
