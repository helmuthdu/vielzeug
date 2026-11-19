import { it } from 'vitest';

import { createScope, type ScopeOptions } from '../index';
import type { Scope } from '../types';

export const itScoped = (
  name: string,
  callback: (scope: Scope) => void | Promise<void>,
  options?: ScopeOptions,
): void => {
  it(name, async () => {
    const scope = createScope(options);

    try {
      await scope.run(() => callback(scope));
    } finally {
      scope.dispose();
    }
  });
};
