import type { MountSetup } from '../testing';

import { type ComponentDefinition, define } from '../index';

export const expectType = <T>(_value: T): void => {
  // compile-time-only helper for typing assertions
};

export const uniqueTag = (prefix: string): string => `${prefix}-${Math.random().toString(36).slice(2)}`;

export const register = (tag: string, setup: MountSetup, options: Omit<ComponentDefinition, 'setup'> = {}): string =>
  define(tag, {
    ...options,
    setup,
  });
