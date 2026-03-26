import { ANONYMOUS, WILDCARD, createPermit, type PermitPolicy } from '../index';

describe('createPermit()', () => {
  it('denies by default', () => {
    const permit = createPermit();

    expect(permit.can({ id: 'u1', roles: ['admin'] }, 'posts', 'read')).toBe(false);
  });

  it('allows setting a static allow rule', () => {
    const permit = createPermit();

    permit.set({ action: 'read', effect: 'allow', resource: 'posts', role: 'admin' });

    expect(permit.can({ id: 'u1', roles: ['admin'] }, 'posts', 'read')).toBe(true);
  });

  it('normalizes role, resource, and action keys', () => {
    const permit = createPermit();

    permit.set({ action: ' Read ', effect: 'allow', resource: ' Posts ', role: ' Admin ' });

    expect(permit.can({ id: 'u1', roles: ['ADMIN'] }, 'POSTS', 'read')).toBe(true);
  });
});

describe('deterministic decision model', () => {
  it('uses deny-overrides-allow for rules with same top precedence', () => {
    const permit = createPermit();

    permit
      .set({ action: 'read', effect: 'allow', priority: 10, resource: 'posts', role: 'editor' })
      .set({ action: 'read', effect: 'deny', priority: 10, resource: 'posts', role: 'editor' });

    expect(permit.can({ id: 'u1', roles: ['editor'] }, 'posts', 'read')).toBe(false);
  });

  it('is independent from role order in the user payload', () => {
    const permit = createPermit();

    permit
      .set({ action: 'read', effect: 'allow', priority: 10, resource: 'posts', role: 'admin' })
      .set({ action: 'read', effect: 'deny', priority: 10, resource: 'posts', role: 'blocked' });

    expect(permit.can({ id: 'u1', roles: ['admin', 'blocked'] }, 'posts', 'read')).toBe(false);
    expect(permit.can({ id: 'u2', roles: ['blocked', 'admin'] }, 'posts', 'read')).toBe(false);
  });

  it('prefers higher priority over specificity', () => {
    const permit = createPermit();

    permit
      .set({ action: 'read', effect: 'deny', priority: 1, resource: 'posts', role: 'editor' })
      .set({ action: WILDCARD, effect: 'allow', priority: 100, resource: WILDCARD, role: WILDCARD });

    expect(permit.can({ id: 'u1', roles: ['editor'] }, 'posts', 'read')).toBe(true);
  });

  it('uses specificity to break ties within the same priority', () => {
    const permit = createPermit();

    permit
      .set({ action: WILDCARD, effect: 'allow', priority: 5, resource: WILDCARD, role: WILDCARD })
      .set({ action: 'read', effect: 'deny', priority: 5, resource: 'posts', role: 'editor' });

    expect(permit.can({ id: 'u1', roles: ['editor'] }, 'posts', 'read')).toBe(false);
  });
});

describe('principal handling', () => {
  it('supports explicit anonymous principal', () => {
    const permit = createPermit();

    permit.set({ action: 'read', effect: 'allow', resource: 'posts', role: ANONYMOUS });

    expect(permit.can({ kind: 'anonymous' }, 'posts', 'read')).toBe(true);
    expect(permit.can(null, 'posts', 'read')).toBe(true);
  });

  it('throws for malformed principal payloads', () => {
    const permit = createPermit();

    expect(() => permit.can({ id: 'u1' } as any, 'posts', 'read')).toThrow('Invalid principal');
    expect(() => permit.can({ roles: ['admin'] } as any, 'posts', 'read')).toThrow('Invalid principal');
  });
});

describe('predicates', () => {
  it('supports predicate-based rules through a registry', () => {
    const permit = createPermit<'update', { authorId: string }>({
      predicates: {
        isOwner: ({ data, principal }) => principal.id === data?.authorId,
      },
    });

    permit.set({ action: 'update', effect: 'allow', resource: 'posts', role: 'editor', when: 'isOwner' });

    expect(permit.can({ id: 'u1', roles: ['editor'] }, 'posts', 'update', { authorId: 'u1' })).toBe(true);
    expect(permit.can({ id: 'u1', roles: ['editor'] }, 'posts', 'update', { authorId: 'u2' })).toBe(false);
  });

  it('throws when setting an unknown predicate', () => {
    const permit = createPermit();

    expect(() => {
      permit.set({ action: 'update', effect: 'allow', resource: 'posts', role: 'editor', when: 'missing' });
    }).toThrow("Unknown predicate 'missing'");
  });

  it('does not evaluate user predicates for anonymous principals', () => {
    const permit = createPermit<'read', { ownerId: string }>({
      predicates: {
        ownerOnly: ({ data, principal }) => principal.id === data?.ownerId,
      },
    });

    permit.set({ action: 'read', effect: 'allow', resource: 'posts', role: ANONYMOUS, when: 'ownerOnly' });

    expect(permit.can({ kind: 'anonymous' }, 'posts', 'read', { ownerId: 'u1' })).toBe(false);
  });
});

describe('wildcards', () => {
  it('supports wildcard role/resource/action matching', () => {
    const permit = createPermit();

    permit.set({ action: WILDCARD, effect: 'allow', resource: WILDCARD, role: WILDCARD });

    expect(permit.can({ id: 'u1', roles: ['any'] }, 'posts', 'read')).toBe(true);
    expect(permit.can({ id: 'u2', roles: [] }, 'comments', 'delete')).toBe(true);
  });
});

describe('withUser()', () => {
  it('returns a user-bound guard', () => {
    const permit = createPermit();

    permit.set({ action: 'read', effect: 'allow', resource: 'posts', role: 'viewer' });

    const guard = permit.withUser({ id: 'u1', roles: ['viewer'] });

    expect(guard.can('posts', 'read')).toBe(true);
    expect(guard.can('posts', 'delete')).toBe(false);
  });
});

describe('policy import/export', () => {
  it('exports and restores JSON-serializable policy', () => {
    const permit = createPermit();

    permit
      .set({ action: 'read', effect: 'allow', priority: 5, resource: 'posts', role: 'viewer' })
      .set({ action: 'delete', effect: 'deny', priority: 10, resource: 'posts', role: 'viewer' });

    const policy = permit.exportPolicy();

    permit.clear();

    expect(permit.can({ id: 'u1', roles: ['viewer'] }, 'posts', 'read')).toBe(false);

    permit.importPolicy(policy);

    expect(permit.can({ id: 'u1', roles: ['viewer'] }, 'posts', 'read')).toBe(true);
    expect(permit.can({ id: 'u1', roles: ['viewer'] }, 'posts', 'delete')).toBe(false);
  });

  it('supports initial policy option', () => {
    const initial: PermitPolicy<'read'> = {
      rules: [{ action: 'read', effect: 'allow', resource: 'posts', role: 'viewer' }],
    };

    const permit = createPermit({ initial });

    expect(permit.can({ id: 'u1', roles: ['viewer'] }, 'posts', 'read')).toBe(true);
  });

  it('returns deep copies from exportPolicy', () => {
    const permit = createPermit();

    permit.set({ action: 'read', effect: 'allow', resource: 'posts', role: 'viewer' });

    const policy = permit.exportPolicy();

    policy.rules[0]!.effect = 'deny';

    expect(permit.can({ id: 'u1', roles: ['viewer'] }, 'posts', 'read')).toBe(true);
  });
});
