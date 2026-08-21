// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { createMediaQuery, createNetwork, createViewport, SentinelUnavailableError } from '../index.ts';

describe('browser availability', () => {
  it('rejects window factories outside a browser', () => {
    expect(() => createViewport()).toThrow(SentinelUnavailableError);
    expect(() => createNetwork()).toThrow(SentinelUnavailableError);
    expect(() => createMediaQuery('(min-width: 1px)')).toThrow(SentinelUnavailableError);
  });
});
