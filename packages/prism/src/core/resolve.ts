import type { ReadonlySignal } from '@vielzeug/ripple';

import type { MaybeSignal } from '../types';

export function resolve<T>(value: MaybeSignal<T>): T {
  if (value !== null && typeof value === 'object' && 'value' in value && 'subscribe' in value) {
    return (value as ReadonlySignal<T>).value;
  }

  return value as T;
}
