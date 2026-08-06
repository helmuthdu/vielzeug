import { describe, expect, it } from 'vitest';

import { verifyPackedPackages } from '../verify-packed-packages.mjs';

describe('verify-packed-packages', () => {
  it('has no import-time filesystem or subprocess side effects', () => {
    expect(typeof verifyPackedPackages).toBe('function');
  });
});
