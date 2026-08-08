import type { Readable } from '@vielzeug/ripple';

import { signal } from '@vielzeug/ripple';

import type { PositionerOptions } from './float';
import type { ComputePositionResult, ReferenceElement } from './types';

import { createPositioner, type Positioner } from './float';

export interface ReactivePositioner extends Positioner {
  readonly position: Readable<ComputePositionResult | null>;
}

/** Creates a positioner with its latest result exposed as a Ripple readable. */
export function createReactivePositioner(
  reference: ReferenceElement,
  floating: HTMLElement,
  options: Omit<PositionerOptions, 'apply'> = {},
): ReactivePositioner {
  const position = signal<ComputePositionResult | null>(null);
  const positioner = createPositioner(reference, floating, {
    ...options,
    apply: (result) => {
      position.value = result;
    },
  });

  positioner.start();

  return Object.assign(positioner, { position: position as Readable<ComputePositionResult | null> });
}
