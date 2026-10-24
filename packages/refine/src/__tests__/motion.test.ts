import { afterEach, describe, expect, it } from 'vitest';

import { getMotionMode, setMotionMode } from '../motion';

describe('motion mode', () => {
  afterEach(() => {
    setMotionMode('system');
  });

  it('defaults to system with no attribute', () => {
    expect(getMotionMode()).toBe('system');
    expect(document.documentElement.hasAttribute('data-motion')).toBe(false);
  });

  it('writes data-motion for the explicit modes', () => {
    expect(setMotionMode('reduced')).toBe('reduced');
    expect(document.documentElement.getAttribute('data-motion')).toBe('reduced');
    expect(getMotionMode()).toBe('reduced');

    expect(setMotionMode('full')).toBe('full');
    expect(document.documentElement.getAttribute('data-motion')).toBe('full');
    expect(getMotionMode()).toBe('full');
  });

  it('removes the attribute for system', () => {
    setMotionMode('reduced');
    setMotionMode('system');
    expect(document.documentElement.hasAttribute('data-motion')).toBe(false);
    expect(getMotionMode()).toBe('system');
  });

  it('reads an attribute set directly (theme.css is the contract, not the setter)', () => {
    document.documentElement.setAttribute('data-motion', 'full');
    expect(getMotionMode()).toBe('full');
  });

  it('rejects unknown modes', () => {
    expect(() => setMotionMode('calm' as never)).toThrow(RangeError);
  });
});
