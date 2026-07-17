import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { debugWard } from '../devtools';

// ---------------------------------------------------------------------------
// debugWard — basic functionality
// ---------------------------------------------------------------------------

describe('debugWard', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('returns a Ward instance that evaluates decisions correctly', () => {
    const permit = debugWard([{ action: 'read', effect: 'allow', resource: 'posts', role: ['viewer'] }]);

    expect(
      permit.explain({ action: 'read', principal: { id: 'u1', roles: ['viewer'] }, resource: 'posts' }).allowed,
    ).toBe(true);
    expect(
      permit.explain({ action: 'delete' as any, principal: { id: 'u1', roles: ['viewer'] }, resource: 'posts' })
        .allowed,
    ).toBe(false);
  });

  it('calls console.debug for each authorization decision', () => {
    const permit = debugWard([{ action: 'read', effect: 'allow', resource: 'posts', role: ['viewer'] }]);

    permit.explain({ action: 'read', principal: { id: 'u1', roles: ['viewer'] }, resource: 'posts' });

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[ward:decision]'));
  });

  it('logs the allow outcome and rule effect when a rule matches', () => {
    const permit = debugWard([{ action: 'read', effect: 'allow', resource: 'posts', role: ['viewer'] }]);

    permit.explain({ action: 'read', principal: { id: 'u1', roles: ['viewer'] }, resource: 'posts' });

    const logLine: string = consoleSpy.mock.calls[0][0];

    expect(logLine).toContain('allow');
    expect(logLine).toContain('(allow)');
    expect(logLine).toContain('viewer');
    expect(logLine).toContain('posts');
    expect(logLine).toContain('read');
  });

  it('logs no-matching-rule outcome without an effect when nothing matches', () => {
    const permit = debugWard([{ action: 'read', effect: 'allow', resource: 'posts', role: ['viewer'] }]);

    permit.explain({ action: 'delete' as any, principal: { id: 'u1', roles: ['viewer'] }, resource: 'posts' });

    const logLine: string = consoleSpy.mock.calls[0][0];

    expect(logLine).toContain('no-matching-rule');
    expect(logLine).not.toContain('(allow)');
    expect(logLine).not.toContain('(deny)');
  });

  it('logs explicit-deny outcome with deny effect', () => {
    const permit = debugWard([{ action: 'read', effect: 'deny', resource: 'posts', role: ['blocked'] }]);

    permit.explain({ action: 'read', principal: { id: 'u1', roles: ['blocked'] }, resource: 'posts' });

    const logLine: string = consoleSpy.mock.calls[0][0];

    expect(logLine).toContain('explicit-deny');
    expect(logLine).toContain('(deny)');
  });

  it('logs anonymous as principal label for null principal', () => {
    const permit = debugWard([{ action: 'read', effect: 'allow', resource: 'posts', role: '*' }]);

    permit.explain({ action: 'read', principal: null, resource: 'posts' });

    expect(consoleSpy.mock.calls[0][0]).toContain('anonymous');
  });

  it('logs the principal id when roles array is empty', () => {
    const permit = debugWard([{ action: 'read', effect: 'allow', resource: 'posts', role: ['viewer'] }]);

    permit.explain({ action: 'read', principal: { id: 'user-xyz', roles: [] }, resource: 'posts' });

    expect(consoleSpy.mock.calls[0][0]).toContain('user-xyz');
  });

  it('fires logger for explain() but not trace()', () => {
    const permit = debugWard([{ action: 'read', effect: 'allow', resource: 'posts', role: ['viewer'] }]);

    permit.explain({ action: 'read', principal: { id: 'u1', roles: ['viewer'] }, resource: 'posts' });
    permit.trace({ action: 'read', principal: { id: 'u1', roles: ['viewer'] }, resource: 'posts' });

    expect(consoleSpy).toHaveBeenCalledTimes(1);
  });

  it('passes through ward options (strict) when provided', () => {
    expect(() => {
      debugWard(
        [
          { action: 'read', effect: 'allow', resource: 'posts', role: ['viewer'] },
          { action: 'read', effect: 'deny', resource: 'posts', role: ['viewer'] },
        ],
        { strict: true },
      );
    }).toThrow('rule conflict');
  });
});
