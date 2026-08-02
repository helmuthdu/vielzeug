import { createListControl, type ListNavigationOptions } from '../nav';

/**
 * Creates a `ListControl` for use in unit tests.
 */
export const createTestListControl = <T>(items: T[], opts?: Partial<ListNavigationOptions<T>>) => {
  return createListControl({
    getItems: () => items,
    ...opts,
  });
};
