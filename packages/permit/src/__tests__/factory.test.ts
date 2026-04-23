import { ANONYMOUS, WILDCARD, createPermit, type PermitRule } from '../index';

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

  it('uses exact matching for role, resource, and action', () => {
    const permit = createPermit();

    permit.set({ action: 'read', effect: 'allow', resource: 'posts', role: 'admin' });

    expect(permit.can({ id: 'u1', roles: ['ADMIN'] }, 'POSTS', 'READ')).toBe(false);
    expect(permit.can({ id: 'u1', roles: ['admin'] }, 'posts', 'read')).toBe(true);
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
  it('supports null anonymous principal', () => {
    const permit = createPermit();

    permit.set({ action: 'read', effect: 'allow', resource: 'posts', role: ANONYMOUS });

    expect(permit.can(null, 'posts', 'read')).toBe(true);
  });

  it('does not auto-grant access to anonymous users with wildcard rules', () => {
    const permit = createPermit();

    // This is the critical fix: anonymous shouldn't implicitly match WILDCARD
    permit.set({ action: 'read', effect: 'allow', resource: 'posts', role: WILDCARD });

    expect(permit.can(null, 'posts', 'read')).toBe(false);
    expect(permit.can({ id: 'u1', roles: ['viewer'] }, 'posts', 'read')).toBe(true);
  });

  it('throws for malformed principal payloads', () => {
    const permit = createPermit();

    expect(() => permit.can({ id: 'u1' } as any, 'posts', 'read')).toThrow('Invalid principal');
    expect(() => permit.can({ roles: ['admin'] } as any, 'posts', 'read')).toThrow('Invalid principal');
    expect(() => permit.can(undefined as any, 'posts', 'read')).toThrow('Invalid principal');
  });
});

describe('predicates', () => {
  it('supports predicate-based rules directly on the rule', () => {
    const permit = createPermit<'update', { authorId: string }>();

    permit.set({
      action: 'update',
      effect: 'allow',
      resource: 'posts',
      role: 'editor',
      when: ({ data, principal }) => principal.id === data?.authorId,
    });

    expect(permit.can({ id: 'u1', roles: ['editor'] }, 'posts', 'update', { authorId: 'u1' })).toBe(true);
    expect(permit.can({ id: 'u1', roles: ['editor'] }, 'posts', 'update', { authorId: 'u2' })).toBe(false);
  });

  it('throws when rule predicate is not a function', () => {
    const permit = createPermit();

    expect(() => {
      permit.set({ action: 'update', effect: 'allow', resource: 'posts', role: 'editor', when: 'missing' as any });
    }).toThrow('Rule.when must be a function');
  });

  it('does not evaluate user predicates for anonymous principals', () => {
    const permit = createPermit<'read', { ownerId: string }>();

    permit.set({
      action: 'read',
      effect: 'allow',
      resource: 'posts',
      role: ANONYMOUS,
      when: ({ data, principal }) => principal.id === data?.ownerId,
    });

    expect(permit.can(null, 'posts', 'read', { ownerId: 'u1' })).toBe(false);
  });
});

describe('wildcards', () => {
  it('supports wildcard role/resource/action matching for authenticated users', () => {
    const permit = createPermit();

    permit.set({ action: WILDCARD, effect: 'allow', resource: WILDCARD, role: WILDCARD });

    expect(permit.can({ id: 'u1', roles: ['any'] }, 'posts', 'read')).toBe(true);
    expect(permit.can({ id: 'u2', roles: [] }, 'comments', 'delete')).toBe(true);
  });

  it('anonymous principal does not match wildcard role', () => {
    const permit = createPermit();

    permit.set({ action: 'read', effect: 'allow', resource: 'posts', role: WILDCARD });

    expect(permit.can(null, 'posts', 'read')).toBe(false);
  });
});

describe('forUser()', () => {
  it('returns a bound permission function', () => {
    const permit = createPermit();

    permit.set({ action: 'read', effect: 'allow', resource: 'posts', role: 'viewer' });

    const can = permit.forUser({ id: 'u1', roles: ['viewer'] });

    expect(can('posts', 'read')).toBe(true);
    expect(can('posts', 'delete')).toBe(false);
  });

  it('captures a snapshot of the bound principal', () => {
    const permit = createPermit();

    permit.set({ action: 'read', effect: 'allow', resource: 'posts', role: 'viewer' });

    const principal = { id: 'u1', roles: ['viewer'] as string[] };
    const can = permit.forUser(principal);

    principal.roles.push('blocked');

    expect(can('posts', 'read')).toBe(true);
  });
});

describe('logger callback', () => {
  it('calls logger with decision context (object form)', () => {
    const logCalls: any[] = [];

    const permit = createPermit({
      logger: (context) => {
        logCalls.push(context);
      },
    });

    permit.set({ action: 'read', effect: 'allow', resource: 'posts', role: 'viewer' });

    permit.can({ id: 'u1', roles: ['viewer'] }, 'posts', 'read', { extra: 'data' });

    expect(logCalls).toHaveLength(1);
    expect(logCalls[0]).toEqual({
      action: 'read',
      data: { extra: 'data' },
      decision: 'allow',
      principal: { id: 'u1', roles: ['viewer'] },
      resource: 'posts',
      rule: { action: 'read', effect: 'allow', priority: 0, resource: 'posts', role: 'viewer' },
    });
  });

  it('logs deny decision', () => {
    const logCalls: any[] = [];

    const permit = createPermit({
      logger: (context) => {
        logCalls.push(context);
      },
    });

    permit.can({ id: 'u1', roles: ['viewer'] }, 'posts', 'delete');

    expect(logCalls).toHaveLength(1);
    expect(logCalls[0].decision).toBe('deny');
    expect(logCalls[0].rule).toBeUndefined();
  });
});

describe('rules()', () => {
  it('returns a snapshot of the current rules', () => {
    const permit = createPermit();

    permit.set({ action: 'read', effect: 'allow', resource: 'posts', role: 'viewer' });

    const rules = permit.rules();

    rules[0]!.effect = 'deny';

    expect(permit.can({ id: 'u1', roles: ['viewer'] }, 'posts', 'read')).toBe(true);
  });

  it('supports initial rules option', () => {
    const initial: PermitRule<'read'>[] = [{ action: 'read', effect: 'allow', resource: 'posts', role: 'viewer' }];

    const permit = createPermit({ initial });

    expect(permit.can({ id: 'u1', roles: ['viewer'] }, 'posts', 'read')).toBe(true);
  });

  it('replaces all rules', () => {
    const permit = createPermit();

    permit.set({ action: 'read', effect: 'allow', resource: 'posts', role: 'viewer' });
    permit.replace([{ action: 'delete', effect: 'allow', resource: 'posts', role: 'viewer' }]);

    expect(permit.can({ id: 'u1', roles: ['viewer'] }, 'posts', 'read')).toBe(false);
    expect(permit.can({ id: 'u1', roles: ['viewer'] }, 'posts', 'delete')).toBe(true);
  });
});
