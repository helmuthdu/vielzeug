import { WILDCARD, createWard, matchesPattern } from '../index';

// ---------------------------------------------------------------------------
// matchesPattern — hierarchical pattern matching (resources and actions)
// ---------------------------------------------------------------------------

describe('ward: matchesPattern', () => {
  it('WILDCARD matches any value', () => {
    expect(matchesPattern('*', 'posts')).toBe(true);
    expect(matchesPattern('*', 'posts:123')).toBe(true);
    expect(matchesPattern('*', '')).toBe(true);
  });

  it('exact string matches itself only', () => {
    expect(matchesPattern('posts', 'posts')).toBe(true);
    expect(matchesPattern('posts', 'comments')).toBe(false);
    expect(matchesPattern('posts', 'posts:123')).toBe(false);
  });

  it('namespace wildcard matches values with the same prefix and colon separator', () => {
    expect(matchesPattern('posts:*', 'posts:123')).toBe(true);
    expect(matchesPattern('posts:*', 'posts:draft:42')).toBe(true);
    expect(matchesPattern('posts:*', 'posts')).toBe(false);
    expect(matchesPattern('posts:*', 'comments:1')).toBe(false);
  });

  it('exact namespaced value matches only itself', () => {
    expect(matchesPattern('posts:42', 'posts:42')).toBe(true);
    expect(matchesPattern('posts:42', 'posts:43')).toBe(false);
    expect(matchesPattern('posts:42', 'posts:*')).toBe(false);
  });

  it('action namespace wildcard matches sub-actions', () => {
    expect(matchesPattern('read:*', 'read:own')).toBe(true);
    expect(matchesPattern('read:*', 'read:all')).toBe(true);
    expect(matchesPattern('read:*', 'write:all')).toBe(false);
    expect(matchesPattern('read:*', 'read')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Hierarchical resource matching in createWard
// ---------------------------------------------------------------------------

describe('ward: hierarchical resource patterns in rules', () => {
  it('a namespace-wildcard rule matches concrete resource IDs', () => {
    const permit = createWard([{ action: 'read', effect: 'allow', resource: 'posts:*', role: 'viewer' }]);

    expect(permit.can({ id: 'u1', roles: ['viewer'] }, 'posts:123', 'read')).toBe(true);
    expect(permit.can({ id: 'u1', roles: ['viewer'] }, 'posts:draft:1', 'read')).toBe(true);
    expect(permit.can({ id: 'u1', roles: ['viewer'] }, 'comments:1', 'read')).toBe(false);
  });

  it('exact resource rule does not match namespace-wildcard resource', () => {
    const permit = createWard([{ action: 'read', effect: 'allow', resource: 'posts', role: 'viewer' }]);

    expect(permit.can({ id: 'u1', roles: ['viewer'] }, 'posts', 'read')).toBe(true);
    expect(permit.can({ id: 'u1', roles: ['viewer'] }, 'posts:123', 'read')).toBe(false);
  });

  it('namespace wildcard and global wildcard interact with specificity', () => {
    // posts:* is more specific than * — it should win when principal matches both
    const permit = createWard([
      { action: 'read', effect: 'allow', resource: WILDCARD, role: 'viewer' },
      { action: 'read', effect: 'deny', resource: 'posts:*', role: 'viewer' },
    ]);

    // posts:123 matches both rules; posts:* is more specific, deny wins
    expect(permit.can({ id: 'u1', roles: ['viewer'] }, 'posts:123', 'read')).toBe(false);
    // other resources only match the wildcard rule — allow
    expect(permit.can({ id: 'u1', roles: ['viewer'] }, 'comments:1', 'read')).toBe(true);
  });

  it('rulesInScope returns namespace-wildcard rules for matching resources', () => {
    const permit = createWard<'read'>([
      { action: 'read', effect: 'allow', resource: 'posts:*', role: 'viewer' },
      { action: 'read', effect: 'allow', resource: 'comments', role: 'viewer' },
    ]);

    expect(permit.rulesInScope({ id: 'u1', roles: ['viewer'] }, 'posts:123')).toHaveLength(1);
    expect(permit.rulesInScope({ id: 'u1', roles: ['viewer'] }, 'posts:123')[0].resource).toBe('posts:*');
    expect(permit.rulesInScope({ id: 'u1', roles: ['viewer'] }, 'comments')).toHaveLength(1);
  });
});
