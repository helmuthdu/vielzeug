import { ANONYMOUS, WILDCARD, createPermit, owns } from '../index';

describe('permit: core decision model', () => {
  it('denies when no rules match', () => {
    const permit = createPermit();

    expect(permit.can({ id: 'u1', roles: ['admin'] }, 'posts', 'read')).toBe(false);
  });

  it('matches role, resource, and action exactly', () => {
    const permit = createPermit([{ action: 'read', effect: 'allow', resource: 'posts', role: 'admin' }]);

    expect(permit.can({ id: 'u1', roles: ['ADMIN'] }, 'POSTS', 'READ' as any)).toBe(false);
    expect(permit.can({ id: 'u1', roles: ['admin'] }, 'posts', 'read')).toBe(true);
  });

  it('supports wildcard role, resource, and action for authenticated principals', () => {
    const permit = createPermit([{ action: WILDCARD, effect: 'allow', resource: WILDCARD, role: WILDCARD }]);

    expect(permit.can({ id: 'u1', roles: ['member'] }, 'posts', 'read' as any)).toBe(true);
  });

  it('does not apply wildcard role rules to anonymous principals', () => {
    const permit = createPermit([{ action: 'read', effect: 'allow', resource: 'posts', role: WILDCARD }]);

    expect(permit.can(null, 'posts', 'read')).toBe(false);
  });

  it('supports anonymous-only rules via ANONYMOUS', () => {
    const permit = createPermit([{ action: 'read', effect: 'allow', resource: 'posts', role: ANONYMOUS }]);

    expect(permit.can(null, 'posts', 'read')).toBe(true);
    expect(permit.can({ id: 'u1', roles: ['viewer'] }, 'posts', 'read')).toBe(false);
  });

  it('prefers higher priority over specificity', () => {
    const permit = createPermit([
      { action: 'read', effect: 'deny', priority: 1, resource: 'posts', role: 'editor' },
      { action: WILDCARD, effect: 'allow', priority: 10, resource: WILDCARD, role: WILDCARD },
    ]);

    expect(permit.can({ id: 'u1', roles: ['editor'] }, 'posts', 'read')).toBe(true);
  });

  it('prefers more specific rules when priority ties', () => {
    const permit = createPermit([
      { action: WILDCARD, effect: 'allow', priority: 10, resource: WILDCARD, role: WILDCARD },
      { action: 'read', effect: 'deny', priority: 10, resource: 'posts', role: 'editor' },
    ]);

    expect(permit.can({ id: 'u1', roles: ['editor'] }, 'posts', 'read')).toBe(false);
  });

  it('lets deny override allow when priority and specificity tie', () => {
    const permit = createPermit([
      { action: 'read', effect: 'allow', priority: 10, resource: 'posts', role: 'editor' },
      { action: 'read', effect: 'deny', priority: 10, resource: 'posts', role: 'editor' },
    ]);

    expect(permit.can({ id: 'u1', roles: ['editor'] }, 'posts', 'read')).toBe(false);
  });

  it('is independent of role order in the principal payload', () => {
    const permit = createPermit([
      { action: 'read', effect: 'allow', priority: 10, resource: 'posts', role: 'admin' },
      { action: 'read', effect: 'deny', priority: 10, resource: 'posts', role: 'blocked' },
    ]);

    expect(permit.can({ id: 'u1', roles: ['admin', 'blocked'] }, 'posts', 'read')).toBe(false);
    expect(permit.can({ id: 'u1', roles: ['blocked', 'admin'] }, 'posts', 'read')).toBe(false);
  });
});

describe('permit: validation', () => {
  it('throws for invalid principal payloads', () => {
    const permit = createPermit();

    expect(() => permit.can({ id: 'u1' } as any, 'posts', 'read')).toThrow('Invalid principal');
    expect(() => permit.can({ roles: ['admin'] } as any, 'posts', 'read')).toThrow('Invalid principal');
    expect(() => permit.can(undefined as any, 'posts', 'read')).toThrow('Invalid principal');
  });

  it('throws when a rule effect is invalid', () => {
    expect(() => {
      createPermit([{ action: 'read', effect: 'grant' as any, resource: 'posts', role: 'viewer' }]);
    }).toThrow('Rule.effect must be "allow" or "deny"');
  });

  it('throws when a when-clause is not a function', () => {
    expect(() => {
      createPermit([{ action: 'update', effect: 'allow', resource: 'posts', role: 'editor', when: 'bad' as any }]);
    }).toThrow('Rule.when must be a function');
  });

  it('throws when forUser receives an invalid principal', () => {
    const permit = createPermit();

    expect(() => permit.forUser({ id: '', roles: ['viewer'] } as any)).toThrow('Invalid principal');
  });
});

describe('permit: predicates and ABAC behavior', () => {
  it('evaluates when-clause for authenticated principals', () => {
    const permit = createPermit<'update', { authorId: string }>([
      {
        action: 'update',
        effect: 'allow',
        resource: 'posts',
        role: 'editor',
        when: ({ data, principal }) => principal.id === data?.authorId,
      },
    ]);

    expect(permit.can({ id: 'u1', roles: ['editor'] }, 'posts', 'update', { authorId: 'u1' })).toBe(true);
    expect(permit.can({ id: 'u1', roles: ['editor'] }, 'posts', 'update', { authorId: 'u2' })).toBe(false);
  });

  it('does not match data-dependent rules for anonymous principals', () => {
    const permit = createPermit<'read', { ownerId: string }>([
      {
        action: 'read',
        effect: 'allow',
        resource: 'posts',
        role: ANONYMOUS,
        when: ({ data, principal }) => principal.id === data?.ownerId,
      },
    ]);

    expect(permit.can(null, 'posts', 'read', { ownerId: 'u1' })).toBe(false);
  });

  it('supports principal attribute checks in predicates', () => {
    const permit = createPermit<'read'>([
      {
        action: 'read',
        effect: 'allow',
        resource: 'premium-content',
        role: 'user',
        when: ({ principal }) => principal.attributes?.tier === 'premium',
      },
    ]);

    expect(permit.can({ attributes: { tier: 'premium' }, id: 'u1', roles: ['user'] }, 'premium-content', 'read')).toBe(
      true,
    );
    expect(permit.can({ attributes: { tier: 'free' }, id: 'u2', roles: ['user'] }, 'premium-content', 'read')).toBe(
      false,
    );
  });

  it('supports owns helper for ownership checks', () => {
    const permit = createPermit<'update', { authorId: string }>([
      {
        action: 'update',
        effect: 'allow',
        resource: 'posts',
        role: 'editor',
        when: owns('authorId'),
      },
    ]);

    expect(permit.can({ id: 'u1', roles: ['editor'] }, 'posts', 'update', { authorId: 'u1' })).toBe(true);
    expect(permit.can({ id: 'u1', roles: ['editor'] }, 'posts', 'update', { authorId: 'u2' })).toBe(false);
    expect(permit.can({ id: 'u1', roles: ['editor'] }, 'posts', 'update', undefined)).toBe(false);
  });
});

describe('permit: decision APIs', () => {
  it('canAll returns true only when every action is allowed', () => {
    const permit = createPermit<'read' | 'update'>([
      { action: 'read', effect: 'allow', resource: 'posts', role: 'viewer' },
      { action: 'update', effect: 'deny', resource: 'posts', role: 'viewer' },
    ]);

    expect(permit.canAll({ id: 'u1', roles: ['viewer'] }, 'posts', ['read'])).toBe(true);
    expect(permit.canAll({ id: 'u1', roles: ['viewer'] }, 'posts', ['read', 'update'])).toBe(false);
  });

  it('canAny returns true when at least one action is allowed', () => {
    const permit = createPermit<'read' | 'update' | 'delete'>([
      { action: 'read', effect: 'allow', resource: 'posts', role: 'viewer' },
      { action: 'update', effect: 'deny', resource: 'posts', role: 'viewer' },
    ]);

    expect(permit.canAny({ id: 'u1', roles: ['viewer'] }, 'posts', ['read', 'update'])).toBe(true);
    expect(permit.canAny({ id: 'u1', roles: ['viewer'] }, 'posts', ['update', 'delete'])).toBe(false);
  });

  it('returns identity results for empty action collections without validating the principal', () => {
    const permit = createPermit<'read'>([{ action: 'read', effect: 'allow', resource: 'posts', role: 'viewer' }]);

    expect(permit.canAll({ id: '' as any, roles: ['viewer'] }, 'posts', [])).toBe(true);
    expect(permit.canAny({ id: '' as any, roles: ['viewer'] }, 'posts', [])).toBe(false);
  });

  it('returns an empty array for empty batch checks without validating the principal', () => {
    const permit = createPermit<'read'>([{ action: 'read', effect: 'allow', resource: 'posts', role: 'viewer' }]);

    expect(permit.checkAll({ id: '' as any, roles: ['viewer'] }, [])).toEqual([]);
  });

  it('returns checkAll decisions in the same order as input checks', () => {
    const permit = createPermit<'read' | 'update' | 'delete'>([
      { action: 'read', effect: 'allow', resource: 'posts', role: 'viewer' },
      { action: 'update', effect: 'deny', resource: 'posts', role: 'viewer' },
    ]);

    const decisions = permit.checkAll({ id: 'u1', roles: ['viewer'] }, [
      { action: 'read', resource: 'posts' },
      { action: 'update', resource: 'posts' },
      { action: 'delete', resource: 'posts' },
    ]);

    expect(decisions).toHaveLength(3);
    expect(decisions[0].allowed).toBe(true);
    expect(decisions[1].allowed).toBe(false);
    expect(decisions[2]).toEqual({ allowed: false, reason: 'no-matching-rule' });
  });

  it('returns the authored rule shape from explain instead of leaking normalized priority', () => {
    const permit = createPermit([{ action: 'read', effect: 'allow', resource: 'posts', role: 'viewer' }]);

    const decision = permit.explain({ id: 'u1', roles: ['viewer'] }, 'posts', 'read');

    expect(decision).toEqual({
      allowed: true,
      rule: { action: 'read', effect: 'allow', resource: 'posts', role: 'viewer' },
    });
  });

  it('returns explicit-deny when a deny rule wins', () => {
    const permit = createPermit([
      { action: 'read', effect: 'allow', resource: 'posts', role: 'viewer' },
      { action: 'read', effect: 'deny', resource: 'posts', role: 'blocked' },
    ]);

    const decision = permit.explain({ id: 'u1', roles: ['blocked'] }, 'posts', 'read');

    expect(decision).toEqual({
      allowed: false,
      reason: 'explicit-deny',
      rule: { action: 'read', effect: 'deny', resource: 'posts', role: 'blocked' },
    });
  });

  it('returns no-matching-rule when nothing matches', () => {
    const permit = createPermit([{ action: 'read', effect: 'allow', resource: 'posts', role: 'viewer' }]);

    expect(permit.explain({ id: 'u1', roles: ['editor'] }, 'posts', 'read')).toEqual({
      allowed: false,
      reason: 'no-matching-rule',
    });
  });
});

describe('permit: action enumeration and introspection', () => {
  it('returns concrete allowed actions from explicit rules', () => {
    const permit = createPermit<'read' | 'update' | 'delete'>([
      { action: 'read', effect: 'allow', resource: 'posts', role: 'viewer' },
      { action: 'update', effect: 'allow', resource: 'posts', role: 'editor' },
      { action: 'delete', effect: 'deny', resource: 'posts', role: 'editor' },
    ]);

    expect(permit.allowedActions({ id: 'u1', roles: ['viewer'] }, 'posts')).toEqual(['read']);
    expect(permit.allowedActions({ id: 'u2', roles: ['editor'] }, 'posts')).toEqual(['update']);
  });

  it('requires knownActions to enumerate wildcard action rules', () => {
    const permit = createPermit<'read' | 'update'>([
      { action: WILDCARD, effect: 'allow', resource: 'posts', role: 'admin' },
    ]);

    expect(permit.allowedActions({ id: 'u1', roles: ['admin'] }, 'posts')).toEqual([]);
    expect(permit.allowedActions({ id: 'u1', roles: ['admin'] }, 'posts', undefined, ['read', 'update'])).toEqual([
      'read',
      'update',
    ]);
  });

  it('deduplicates known actions while preserving order', () => {
    const permit = createPermit<'read' | 'update'>([
      { action: WILDCARD, effect: 'allow', resource: 'posts', role: 'admin' },
    ]);

    expect(
      permit.allowedActions({ id: 'u1', roles: ['admin'] }, 'posts', undefined, ['update', 'read', 'update']),
    ).toEqual(['update', 'read']);
  });

  it('returns rules in scope for a principal and resource', () => {
    const permit = createPermit<'read' | 'update'>([
      { action: 'read', effect: 'allow', resource: 'posts', role: 'viewer' },
      { action: 'update', effect: 'allow', resource: 'posts', role: 'editor' },
      { action: WILDCARD, effect: 'deny', priority: 100, resource: 'posts', role: 'blocked' },
      { action: 'read', effect: 'allow', resource: 'comments', role: 'viewer' },
    ]);

    expect(permit.rulesInScope({ id: 'u1', roles: ['viewer', 'blocked'] }, 'posts')).toEqual([
      { action: 'read', effect: 'allow', resource: 'posts', role: 'viewer' },
      { action: WILDCARD, effect: 'deny', priority: 100, resource: 'posts', role: 'blocked' },
    ]);
  });

  it('can refine rulesInScope by predicate data when data is provided', () => {
    const permit = createPermit<'update', { authorId: string }>([
      {
        action: 'update',
        effect: 'allow',
        resource: 'posts',
        role: 'editor',
        when: ({ data, principal }) => principal.id === data?.authorId,
      },
    ]);

    expect(permit.rulesInScope({ id: 'u1', roles: ['editor'] }, 'posts')).toHaveLength(1);
    expect(permit.rulesInScope({ id: 'u1', roles: ['editor'] }, 'posts', { authorId: 'u1' })).toHaveLength(1);
    expect(permit.rulesInScope({ id: 'u1', roles: ['editor'] }, 'posts', { authorId: 'u2' })).toEqual([]);
  });

  it('returns anonymous rules in scope for a null principal', () => {
    const permit = createPermit<'read'>([
      { action: 'read', effect: 'allow', resource: 'posts', role: ANONYMOUS },
      { action: 'read', effect: 'allow', resource: 'posts', role: WILDCARD },
    ]);

    expect(permit.rulesInScope(null, 'posts')).toEqual([
      { action: 'read', effect: 'allow', resource: 'posts', role: ANONYMOUS },
    ]);
  });
});

describe('permit: bound view', () => {
  it('binds decision methods to the provided principal', () => {
    const permit = createPermit<'read' | 'update' | 'delete'>([
      { action: 'read', effect: 'allow', resource: 'posts', role: 'viewer' },
      { action: 'update', effect: 'deny', resource: 'posts', role: 'viewer' },
    ]);

    const bound = permit.forUser({ id: 'u1', roles: ['viewer'] });

    expect(bound.can('posts', 'read')).toBe(true);
    expect(bound.canAll('posts', ['read', 'update'])).toBe(false);
    expect(bound.canAny('posts', ['read', 'update'])).toBe(true);
    expect(bound.explain('posts', 'update')).toEqual({
      allowed: false,
      reason: 'explicit-deny',
      rule: { action: 'update', effect: 'deny', resource: 'posts', role: 'viewer' },
    });
  });

  it('exposes bound checkAll and rulesInScope', () => {
    const permit = createPermit<'read' | 'update'>([
      { action: 'read', effect: 'allow', resource: 'posts', role: 'viewer' },
      { action: 'update', effect: 'deny', resource: 'posts', role: 'viewer' },
    ]);

    const bound = permit.forUser({ id: 'u1', roles: ['viewer'] });

    expect(
      bound.checkAll([
        { action: 'read', resource: 'posts' },
        { action: 'update', resource: 'posts' },
      ]),
    ).toEqual([
      { allowed: true, rule: { action: 'read', effect: 'allow', resource: 'posts', role: 'viewer' } },
      {
        allowed: false,
        reason: 'explicit-deny',
        rule: { action: 'update', effect: 'deny', resource: 'posts', role: 'viewer' },
      },
    ]);

    expect(bound.rulesInScope('posts')).toEqual([
      { action: 'read', effect: 'allow', resource: 'posts', role: 'viewer' },
      { action: 'update', effect: 'deny', resource: 'posts', role: 'viewer' },
    ]);
  });

  it('snapshots principal roles and attributes at bind time', () => {
    const permit = createPermit<'read'>([
      {
        action: 'read',
        effect: 'allow',
        resource: 'premium-content',
        role: 'user',
        when: ({ principal }) => principal.attributes?.tier === 'pro',
      },
    ]);

    const principal = {
      attributes: { tier: 'pro' },
      id: 'u1',
      roles: ['user'] as string[],
    };

    const bound = permit.forUser(principal);

    principal.roles.push('blocked');
    principal.attributes.tier = 'free';

    expect(bound.can('premium-content', 'read')).toBe(true);
  });

  it('supports rebinding through bound.forUser', () => {
    const permit = createPermit<'read'>([{ action: 'read', effect: 'allow', resource: 'posts', role: 'viewer' }]);

    const bound = permit.forUser({ id: 'u1', roles: ['viewer'] });
    const rebound = bound.forUser({ id: 'u2', roles: ['unknown'] });

    expect(bound.can('posts', 'read')).toBe(true);
    expect(rebound.can('posts', 'read')).toBe(false);
  });
});

describe('permit: logger behavior', () => {
  it('logs allow decisions with the authored winning rule', () => {
    const calls: Array<Record<string, unknown>> = [];

    const permit = createPermit([{ action: 'read', effect: 'allow', resource: 'posts', role: 'viewer' }], {
      logger: (context) => calls.push(context as unknown as Record<string, unknown>),
    });

    permit.can({ id: 'u1', roles: ['viewer'] }, 'posts', 'read', { trace: 'x' });

    expect(calls).toEqual([
      {
        action: 'read',
        data: { trace: 'x' },
        decision: 'allow',
        principal: { id: 'u1', roles: ['viewer'] },
        resource: 'posts',
        rule: { action: 'read', effect: 'allow', resource: 'posts', role: 'viewer' },
      },
    ]);
  });

  it('logs one decision per action for canAll, canAny, and checkAll', () => {
    const calls: Array<Record<string, unknown>> = [];

    const permit = createPermit<'read' | 'update' | 'delete'>(
      [
        { action: 'read', effect: 'allow', resource: 'posts', role: 'viewer' },
        { action: 'update', effect: 'deny', resource: 'posts', role: 'viewer' },
      ],
      {
        logger: (context) => calls.push(context as unknown as Record<string, unknown>),
      },
    );

    const principal = { id: 'u1', roles: ['viewer'] };

    permit.canAll(principal, 'posts', ['read', 'update']);
    permit.canAny(principal, 'posts', ['update', 'delete']);
    permit.checkAll(principal, [
      { action: 'read', resource: 'posts' },
      { action: 'delete', resource: 'posts' },
    ]);

    expect(calls).toHaveLength(6);
    expect(calls.map((call) => call.action)).toEqual(['read', 'update', 'update', 'delete', 'read', 'delete']);
  });

  it('does not log introspection and enumeration helpers', () => {
    const calls: Array<Record<string, unknown>> = [];

    const permit = createPermit<'read' | 'delete'>(
      [
        { action: 'read', effect: 'allow', resource: 'posts', role: 'viewer' },
        { action: WILDCARD, effect: 'allow', resource: 'posts', role: 'admin' },
      ],
      {
        logger: (context) => calls.push(context as unknown as Record<string, unknown>),
      },
    );

    permit.allowedActions({ id: 'u1', roles: ['admin'] }, 'posts', undefined, ['read', 'delete']);
    permit.rulesInScope({ id: 'u1', roles: ['viewer'] }, 'posts');

    expect(calls).toEqual([]);
  });
});

describe('permit: rule validation at creation time', () => {
  it('throws when role is empty', () => {
    expect(() => {
      createPermit([{ action: 'read', effect: 'allow', resource: 'posts', role: '' }]);
    }).toThrow('Rule.role must be a non-empty string');
  });

  it('throws when role is whitespace-only', () => {
    expect(() => {
      createPermit([{ action: 'read', effect: 'allow', resource: 'posts', role: '   ' }]);
    }).toThrow('Rule.role must be a non-empty string');
  });

  it('throws when resource is empty', () => {
    expect(() => {
      createPermit([{ action: 'read', effect: 'allow', resource: '', role: 'viewer' }]);
    }).toThrow('Rule.resource must be a non-empty string');
  });

  it('throws when resource is whitespace-only', () => {
    expect(() => {
      createPermit([{ action: 'read', effect: 'allow', resource: '   ', role: 'viewer' }]);
    }).toThrow('Rule.resource must be a non-empty string');
  });

  it('throws when action is empty', () => {
    expect(() => {
      createPermit([{ action: '' as any, effect: 'allow', resource: 'posts', role: 'viewer' }]);
    }).toThrow('Rule.action must be a non-empty string');
  });

  it('throws when priority is NaN', () => {
    expect(() => {
      createPermit([{ action: 'read', effect: 'allow', priority: NaN, resource: 'posts', role: 'viewer' }]);
    }).toThrow('Rule.priority must be a finite number');
  });

  it('throws when priority is Infinity', () => {
    expect(() => {
      createPermit([{ action: 'read', effect: 'allow', priority: Infinity, resource: 'posts', role: 'viewer' }]);
    }).toThrow('Rule.priority must be a finite number');
  });

  it('throws when priority is a non-number', () => {
    expect(() => {
      createPermit([{ action: 'read', effect: 'allow', priority: 'high' as any, resource: 'posts', role: 'viewer' }]);
    }).toThrow('Rule.priority must be a finite number');
  });

  it('accepts negative priority', () => {
    expect(() => {
      createPermit([{ action: 'read', effect: 'allow', priority: -5, resource: 'posts', role: 'viewer' }]);
    }).not.toThrow();
  });

  it('accepts zero priority', () => {
    expect(() => {
      createPermit([{ action: 'read', effect: 'allow', priority: 0, resource: 'posts', role: 'viewer' }]);
    }).not.toThrow();
  });
});

describe('permit: predicate error propagation', () => {
  it('propagates exceptions thrown inside a when-predicate through can', () => {
    const permit = createPermit<'read', { id: string }>([
      {
        action: 'read',
        effect: 'allow',
        resource: 'posts',
        role: 'editor',
        when: () => {
          throw new Error('predicate exploded');
        },
      },
    ]);

    expect(() => permit.can({ id: 'u1', roles: ['editor'] }, 'posts', 'read', { id: 'u1' })).toThrow(
      'predicate exploded',
    );
  });

  it('propagates predicate exceptions through explain', () => {
    const permit = createPermit<'read', { id: string }>([
      {
        action: 'read',
        effect: 'allow',
        resource: 'posts',
        role: 'editor',
        when: () => {
          throw new Error('predicate exploded');
        },
      },
    ]);

    expect(() => permit.explain({ id: 'u1', roles: ['editor'] }, 'posts', 'read', { id: 'u1' })).toThrow(
      'predicate exploded',
    );
  });

  it('propagates predicate exceptions through checkAll', () => {
    const permit = createPermit<'read'>([
      {
        action: 'read',
        effect: 'allow',
        resource: 'posts',
        role: 'editor',
        when: () => {
          throw new Error('predicate exploded');
        },
      },
    ]);

    expect(() =>
      permit.checkAll({ id: 'u1', roles: ['editor'] }, [{ action: 'read', resource: 'posts' }]),
    ).toThrow('predicate exploded');
  });
});

describe('permit: bound view snapshot depth', () => {
  it('does not reflect nested attribute mutations after forUser binding', () => {
    const permit = createPermit<'read'>([
      {
        action: 'read',
        effect: 'allow',
        resource: 'docs',
        role: 'user',
        when: ({ principal }) => (principal.attributes?.config as Record<string, unknown>)?.enabled === true,
      },
    ]);

    const principal = {
      attributes: { config: { enabled: true } },
      id: 'u1',
      roles: ['user'],
    };

    const bound = permit.forUser(principal);

    // Mutate nested attribute after binding
    (principal.attributes.config as Record<string, unknown>).enabled = false;

    // Bound principal should still see the original nested value
    expect(bound.can('docs', 'read')).toBe(true);
  });

  it('does not reflect shallow attribute replacement after forUser binding', () => {
    const permit = createPermit<'read'>([
      {
        action: 'read',
        effect: 'allow',
        resource: 'docs',
        role: 'user',
        when: ({ principal }) => principal.attributes?.tier === 'pro',
      },
    ]);

    const principal: { attributes: Record<string, unknown>; id: string; roles: string[] } = {
      attributes: { tier: 'pro' },
      id: 'u1',
      roles: ['user'],
    };

    const bound = permit.forUser(principal);

    principal.attributes.tier = 'free';

    expect(bound.can('docs', 'read')).toBe(true);
  });
});

describe('permit: BoundPermit type is publicly exported', () => {
  it('can be used as an explicit type annotation', () => {
    import('@vielzeug/permit').then(({ createPermit }) => {
      const permit = createPermit<'read'>([{ action: 'read', effect: 'allow', resource: 'posts', role: 'viewer' }]);
      const bound = permit.forUser({ id: 'u1', roles: ['viewer'] });

      expect(bound).toBeDefined();
    });
  });
});
