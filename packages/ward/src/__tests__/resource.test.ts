import { createWard, matchesPattern, patternCovers, WILDCARD } from '../index';

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
    const ward = createWard([{ action: 'read', effect: 'allow', resource: 'posts:*' }]);

    expect(ward.decide({ action: 'read', resource: 'posts:123' }).effect).toBe('allow');
    expect(ward.decide({ action: 'read', resource: 'posts:draft:1' }).effect).toBe('allow');
    expect(ward.decide({ action: 'read', resource: 'comments:1' }).effect).toBe('deny');
  });

  it('exact resource rule does not match namespace-wildcard resource', () => {
    const ward = createWard([{ action: 'read', effect: 'allow', resource: 'posts' }]);

    expect(ward.decide({ action: 'read', resource: 'posts' }).effect).toBe('allow');
    expect(ward.decide({ action: 'read', resource: 'posts:123' }).effect).toBe('deny');
  });

  it('ordered first-match with namespace and global wildcards', () => {
    const ward = createWard([
      { action: 'read', effect: 'deny', resource: 'posts:*' },
      { action: 'read', effect: 'allow', resource: WILDCARD },
    ]);

    // posts:123 matches the deny rule first
    expect(ward.decide({ action: 'read', resource: 'posts:123' }).effect).toBe('deny');
    // other resources fall through to the allow rule
    expect(ward.decide({ action: 'read', resource: 'comments:1' }).effect).toBe('allow');
  });
});

// ---------------------------------------------------------------------------
// patternCovers
// ---------------------------------------------------------------------------

describe('patternCovers', () => {
  it('global wildcard covers everything', () => {
    expect(patternCovers(WILDCARD, 'posts')).toBe(true);
    expect(patternCovers(WILDCARD, 'posts:*')).toBe(true);
    expect(patternCovers(WILDCARD, WILDCARD)).toBe(true);
  });

  it('nothing covers global wildcard except itself', () => {
    expect(patternCovers('posts', WILDCARD)).toBe(false);
    expect(patternCovers('posts:*', WILDCARD)).toBe(false);
  });

  it('namespace wildcard covers exact IDs in same namespace', () => {
    expect(patternCovers('posts:*', 'posts:123')).toBe(true);
    expect(patternCovers('posts:*', 'posts:abc')).toBe(true);
  });

  it('namespace wildcard covers same namespace wildcard', () => {
    expect(patternCovers('posts:*', 'posts:*')).toBe(true);
  });

  it('namespace wildcard covers nested namespace wildcards', () => {
    expect(patternCovers('posts:*', 'posts:sub:*')).toBe(true);
    expect(patternCovers('posts:*', 'posts:draft:42')).toBe(true);
  });

  it('namespace wildcard does not cover different namespace', () => {
    expect(patternCovers('posts:*', 'comments:123')).toBe(false);
    expect(patternCovers('posts:*', 'comments:*')).toBe(false);
  });

  it('exact pattern covers only itself', () => {
    expect(patternCovers('posts', 'posts')).toBe(true);
    expect(patternCovers('posts', 'posts:123')).toBe(false);
    expect(patternCovers('posts', 'comments')).toBe(false);
  });
});
