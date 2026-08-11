import { afterEach, describe, expect, it, vi } from 'vitest';

import { persistedCode } from '../persistedCode';

describe('persistedCode', () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('round-trips code for a library', () => {
    persistedCode.set('arsenal', "console.log('hi')");
    expect(persistedCode.get('arsenal')).toBe("console.log('hi')");
  });

  it('returns null for a library with no persisted code', () => {
    expect(persistedCode.get('unknown-lib')).toBeNull();
  });

  it('does not load code persisted before the current REPL API revision', () => {
    localStorage.setItem('vielzeug-repl-code-clockwork', "import { createMachine } from '@vielzeug/clockwork'");

    expect(persistedCode.get('clockwork')).toBeNull();
  });

  it('keeps different libraries in separate slots', () => {
    persistedCode.set('arsenal', 'a');
    persistedCode.set('ripple', 'b');
    expect(persistedCode.get('arsenal')).toBe('a');
    expect(persistedCode.get('ripple')).toBe('b');
  });

  it('clear() removes the persisted code for a library', () => {
    persistedCode.set('arsenal', 'a');
    persistedCode.clear('arsenal');
    expect(persistedCode.get('arsenal')).toBeNull();
  });

  it('swallows a throwing localStorage.setItem instead of propagating', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError');
    });
    expect(() => persistedCode.set('arsenal', 'a')).not.toThrow();
  });

  it('swallows a throwing localStorage.getItem, returning the fallback', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('boom');
    });
    expect(persistedCode.get('arsenal')).toBeNull();
  });
});
