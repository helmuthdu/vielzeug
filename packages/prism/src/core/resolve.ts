import { isSignal } from '@vielzeug/ripple';

import type { MaybeSignal } from '../types';

export function resolve<T>(value: MaybeSignal<T>): T {
  return isSignal(value) ? value.value : (value as T);
}
