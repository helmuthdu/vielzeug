import { ANONYMOUS, WILDCARD, createPermit, owns, type PermitRule } from '../index';

describe('createPermit()', () => {
  it('denies by default', () => {
    const permit = createPermit();

    expect(permit.can({ id: 'u1', roles: ['admin'] }, 'posts', 'read')).toBe(false);
  });

  it('allows creating with initial rules', () => {
    const permit = createPermit([{ action: 'read', effect: 'allow', resource: 'posts', role: 'admin' }]);

    expect(permit.can({ id: 'u1', roles: ['admin'] }, 'posts', 'read')).toBe(true);
  });

  it('supports multiple initial rules', () => {
    const permit = createPermit([
      { action: 'read', effect: 'allow', resource: 'posts', role: 'viewer' },
      { action: 'delete', effect: 'allow', resource: 'posts', role: 'admin' },
    ]);

    expect(permit.can({ id: 'u1', roles: ['viewer'] }, 'posts', 'read')).toBe(true);
    expect(permit.can({ id: 'u2', roles: ['admin'] }, 'posts', 'delete')).toBe(true);
  });

  it('uses exact matching for role, resource, and action', () => {
    const permit = createPermit([{ action: 'read', effect: 'allow', resource: 'posts', role: 'admin' }]);

    expect(permit.can({ id: 'u1', roles: ['ADMIN'] }, 'POSTS', 'READ')).toBe(false);
    expect(permit.can({ id: 'u1', roles: ['admin'] }, 'posts', 'read')).toBe(true);
  });
});

describe('decision precedence (table-driven)', () => {
  const precedenceCases: Array<{
    action: string;
    expected: boolean;
    name: string;
    principal: any;
    resource: string;
    rules: PermitRule[];
  }> = [
    {
      action: 'read',
      expected: false,
      name: 'deny-overrides-allow at same priority',
      principal: { id: 'u1', roles: ['editor'] },
      resource: 'posts',
      rules: [
        { action: 'read', effect: 'allow', priority: 10, resource: 'posts', role: 'editor' },
        { action: 'read', effect: 'deny', priority: 10, resource: 'posts', role: 'editor' },
      ],
    },
    {
      action: 'read',
      expected: true,
      name: 'higher priority wins over specificity',
      principal: { id: 'u1', roles: ['editor'] },
      resource: 'posts',
      rules: [
        { action: 'read', effect: 'deny', priority: 1, resource: 'posts', role: 'editor' },
        { action: WILDCARD, effect: 'allow', priority: 100, resource: WILDCARD, role: WILDCARD },
      ],
    },
    {
      action: 'read',
      expected: false,
      name: 'specificity breaks ties within same priority',
      principal: { id: 'u1', roles: ['editor'] },
      resource: 'posts',
      rules: [
        { action: WILDCARD, effect: 'allow', priority: 5, resource: WILDCARD, role: WILDCARD },
        { action: 'read', effect: 'deny', priority: 5, resource: 'posts', role: 'editor' },
      ],
    },
    {
      action: 'read',
      expected: false,
      name: 'independent of role order in user payload',
      principal: { id: 'u1', roles: ['admin', 'blocked'] },
      resource: 'posts',
      rules: [
        { action: 'read', effect: 'allow', priority: 10, resource: 'posts', role: 'admin' },
        { action: 'read', effect: 'deny', priority: 10, resource: 'posts', role: 'blocked' },
      ],
    },
  ];

  precedenceCases.forEach((testCase) => {
    it(testCase.name, () => {
      const permit = createPermit(testCase.rules);

      expect(permit.can(testCase.principal, testCase.resource, testCase.action)).toBe(testCase.expected);
    });
  });
});

describe('principal handling', () => {
  it('supports null anonymous principal', () => {
    const permit = createPermit([{ action: 'read', effect: 'allow', resource: 'posts', role: ANONYMOUS }]);

    expect(permit.can(null, 'posts', 'read')).toBe(true);
  });

  it('does not auto-grant access to anonymous users with wildcard rules', () => {
    const permit = createPermit([{ action: 'read', effect: 'allow', resource: 'posts', role: WILDCARD }]);

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

  it('throws when rule predicate is not a function', () => {
    expect(() => {
      createPermit([{ action: 'update', effect: 'allow', resource: 'posts', role: 'editor', when: 'missing' as any }]);
    }).toThrow('Rule.when must be a function');
  });

  it('does not evaluate user predicates for anonymous principals', () => {
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
});

describe('wildcards', () => {
  it('supports wildcard role/resource/action matching for authenticated users', () => {
    const permit = createPermit([{ action: WILDCARD, effect: 'allow', resource: WILDCARD, role: WILDCARD }]);

    expect(permit.can({ id: 'u1', roles: ['any'] }, 'posts', 'read')).toBe(true);
    expect(permit.can({ id: 'u2', roles: [] }, 'comments', 'delete')).toBe(true);
  });

  it('anonymous principal does not match wildcard role', () => {
    const permit = createPermit([{ action: 'read', effect: 'allow', resource: 'posts', role: WILDCARD }]);

    expect(permit.can(null, 'posts', 'read')).toBe(false);
  });
});

describe('forUser()', () => {
  it('returns a bound permission function', () => {
    const permit = createPermit([{ action: 'read', effect: 'allow', resource: 'posts', role: 'viewer' }]);

    const bound = permit.forUser({ id: 'u1', roles: ['viewer'] });

    expect(bound.can('posts', 'read')).toBe(true);
    expect(bound.can('posts', 'delete')).toBe(false);
  });

  it('captures a snapshot of the bound principal', () => {
    const permit = createPermit([{ action: 'read', effect: 'allow', resource: 'posts', role: 'viewer' }]);

    const principal = { id: 'u1', roles: ['viewer'] as string[] };
    const bound = permit.forUser(principal);

    principal.roles.push('blocked');

    expect(bound.can('posts', 'read')).toBe(true);
  });
});

describe('logger callback', () => {
  it('calls logger with decision context', () => {
    const logCalls: any[] = [];

    const permit = createPermit([{ action: 'read', effect: 'allow', resource: 'posts', role: 'viewer' }], {
      logger: (context) => {
        logCalls.push(context);
      },
    });

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

    const permit = createPermit([], {
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

describe('canAll / canAny', () => {
  it('canAll returns true only if all actions are allowed', () => {
    const permit = createPermit([
      { action: 'read', effect: 'allow', resource: 'posts', role: 'viewer' },
      { action: 'update', effect: 'deny', resource: 'posts', role: 'viewer' },
    ]);

    expect(permit.canAll({ id: 'u1', roles: ['viewer'] }, 'posts', ['read', 'update'])).toBe(false);
    expect(permit.canAll({ id: 'u1', roles: ['viewer'] }, 'posts', ['read'])).toBe(true);
  });

  it('canAny returns true if any action is allowed', () => {
    const permit = createPermit([
      { action: 'read', effect: 'allow', resource: 'posts', role: 'viewer' },
      { action: 'update', effect: 'deny', resource: 'posts', role: 'viewer' },
    ]);

    expect(permit.canAny({ id: 'u1', roles: ['viewer'] }, 'posts', ['read', 'update'])).toBe(true);
    expect(permit.canAny({ id: 'u1', roles: ['viewer'] }, 'posts', ['update', 'delete'])).toBe(false);
  });
});

describe('checkAll', () => {
  it('returns decision objects for each check in order', () => {
    const permit = createPermit<'read' | 'update'>([
      { action: 'read', effect: 'allow', resource: 'posts', role: 'viewer' },
      { action: 'update', effect: 'deny', resource: 'posts', role: 'viewer' },
    ]);

    const decisions = permit.checkAll({ id: 'u1', roles: ['viewer'] }, [
      { action: 'read', resource: 'posts' },
      { action: 'update', resource: 'posts' },
    ]);

    expect(decisions).toHaveLength(2);
    expect(decisions[0].allowed).toBe(true);
    expect(decisions[1].allowed).toBe(false);

    if (!decisions[1].allowed) {
      expect(decisions[1].reason).toBe('explicit-deny');
    }
  });
});

describe('rulesFor', () => {
  it('returns rules that match principal and resource', () => {
    const permit = createPermit<'read' | 'update'>([
      { action: 'read', effect: 'allow', resource: 'posts', role: 'viewer' },
      { action: 'update', effect: 'allow', resource: 'posts', role: 'editor' },
      { action: WILDCARD, effect: 'deny', resource: 'posts', role: 'blocked' },
      { action: 'read', effect: 'allow', resource: 'comments', role: 'viewer' },
    ]);

    const rules = permit.rulesFor({ id: 'u1', roles: ['viewer', 'blocked'] }, 'posts');

    expect(rules).toEqual([
      { action: 'read', effect: 'allow', priority: 0, resource: 'posts', role: 'viewer' },
      { action: WILDCARD, effect: 'deny', priority: 0, resource: 'posts', role: 'blocked' },
    ]);
  });

  it('returns anonymous rules for anonymous principal', () => {
    const permit = createPermit<'read'>([
      { action: 'read', effect: 'allow', resource: 'posts', role: ANONYMOUS },
      { action: 'read', effect: 'allow', resource: 'posts', role: WILDCARD },
    ]);

    const rules = permit.rulesFor(null, 'posts');

    expect(rules).toEqual([{ action: 'read', effect: 'allow', priority: 0, resource: 'posts', role: ANONYMOUS }]);
  });

  it('includes data-dependent predicate rules as part of scoped introspection', () => {
    const permit = createPermit<'update', { authorId: string }>([
      {
        action: 'update',
        effect: 'allow',
        resource: 'posts',
        role: 'editor',
        when: ({ data, principal }) => principal.id === data?.authorId,
      },
    ]);

    const rules = permit.rulesFor({ id: 'u1', roles: ['editor'] }, 'posts');

    expect(rules).toHaveLength(1);
    expect(rules[0].action).toBe('update');
    expect(rules[0].role).toBe('editor');
  });
});

describe('allowedActions', () => {
  it('returns actions the principal can perform on a resource', () => {
    const permit = createPermit<'read' | 'update' | 'delete'>([
      { action: 'read', effect: 'allow', resource: 'posts', role: 'viewer' },
      { action: 'update', effect: 'allow', resource: 'posts', role: 'editor' },
      { action: 'delete', effect: 'deny', resource: 'posts', role: 'editor' },
    ]);

    expect(permit.allowedActions({ id: 'u1', roles: ['viewer'] }, 'posts')).toEqual(['read']);
    expect(permit.allowedActions({ id: 'u2', roles: ['editor'] }, 'posts')).toEqual(['update']);
  });

  it('returns known actions covered by wildcard rules when provided', () => {
    const permit = createPermit<'read' | 'update'>([
      { action: WILDCARD, effect: 'allow', resource: 'posts', role: 'admin' },
    ]);

    expect(permit.allowedActions({ id: 'u1', roles: ['admin'] }, 'posts')).toEqual([]);

    const allowed = permit.allowedActions({ id: 'u1', roles: ['admin'] }, 'posts', undefined, ['read', 'update']);

    expect(allowed).toEqual(['read', 'update']);
  });

  it('deduplicates known actions while preserving order', () => {
    const permit = createPermit<'read' | 'update'>([
      { action: WILDCARD, effect: 'allow', resource: 'posts', role: 'admin' },
    ]);

    const allowed = permit.allowedActions({ id: 'u1', roles: ['admin'] }, 'posts', undefined, [
      'update',
      'read',
      'update',
    ]);

    expect(allowed).toEqual(['update', 'read']);
  });
});

describe('explain', () => {
  it('returns decision with rule on allow', () => {
    const permit = createPermit([{ action: 'read', effect: 'allow', resource: 'posts', role: 'viewer' }]);

    const decision = permit.explain({ id: 'u1', roles: ['viewer'] }, 'posts', 'read');

    expect(decision.allowed).toBe(true);

    if (decision.allowed) {
      expect(decision.rule).toEqual({
        action: 'read',
        effect: 'allow',
        priority: 0,
        resource: 'posts',
        role: 'viewer',
      });
    }
  });

  it('returns reason "explicit-deny" when a deny rule matches', () => {
    const permit = createPermit([
      { action: 'read', effect: 'allow', resource: 'posts', role: 'viewer' },
      { action: 'read', effect: 'deny', resource: 'posts', role: 'blocked' },
    ]);

    const decision = permit.explain({ id: 'u1', roles: ['blocked'] }, 'posts', 'read');

    expect(decision.allowed).toBe(false);

    if (!decision.allowed) {
      expect(decision.reason).toBe('explicit-deny');
      expect(decision.rule).toBeDefined();
    }
  });

  it('returns reason "no-matching-rule" when no rule matches', () => {
    const permit = createPermit([{ action: 'read', effect: 'allow', resource: 'posts', role: 'viewer' }]);

    const decision = permit.explain({ id: 'u1', roles: ['editor'] }, 'posts', 'read');

    expect(decision.allowed).toBe(false);

    if (!decision.allowed) {
      expect(decision.reason).toBe('no-matching-rule');
      expect(decision.rule).toBeUndefined();
    }
  });
});

describe('forUser() with bound methods', () => {
  it('forUser returns decision methods scoped to the bound user', () => {
    const permit = createPermit<'read' | 'update' | 'delete'>([
      { action: 'read', effect: 'allow', resource: 'posts', role: 'viewer' },
      { action: 'update', effect: 'allow', resource: 'posts', role: 'editor' },
    ]);

    const boundUser = permit.forUser({ id: 'u1', roles: ['viewer'] });

    expect(boundUser.can('posts', 'read')).toBe(true);
    expect(boundUser.canAny('posts', ['read', 'update'])).toBe(true);
    expect(boundUser.canAll('posts', ['read', 'update'])).toBe(false);
    expect(boundUser.allowedActions('posts')).toEqual(['read']);

    const decision = boundUser.explain('posts', 'read');

    expect(decision.allowed).toBe(true);
  });

  it('bound permits are independent from each other', () => {
    const permit = createPermit([
      { action: 'read', effect: 'allow', resource: 'posts', role: 'admin' },
      { action: 'read', effect: 'deny', resource: 'posts', role: 'blocked' },
    ]);

    const adminUser = permit.forUser({ id: 'u1', roles: ['admin'] });
    const blockedUser = permit.forUser({ id: 'u2', roles: ['blocked'] });

    expect(adminUser.can('posts', 'read')).toBe(true);
    expect(blockedUser.can('posts', 'read')).toBe(false);
    expect(adminUser.can('posts', 'read')).toBe(true);
  });

  it('supports checkAll and rulesFor on bound permits', () => {
    const permit = createPermit<'read' | 'update'>([
      { action: 'read', effect: 'allow', resource: 'posts', role: 'viewer' },
      { action: 'update', effect: 'deny', resource: 'posts', role: 'viewer' },
    ]);

    const bound = permit.forUser({ id: 'u1', roles: ['viewer'] });

    const decisions = bound.checkAll([
      { action: 'read', resource: 'posts' },
      { action: 'update', resource: 'posts' },
    ]);

    expect(decisions).toHaveLength(2);
    expect(decisions[0].allowed).toBe(true);
    expect(decisions[1].allowed).toBe(false);

    const rules = bound.rulesFor('posts');

    expect(rules).toEqual([
      { action: 'read', effect: 'allow', priority: 0, resource: 'posts', role: 'viewer' },
      { action: 'update', effect: 'deny', priority: 0, resource: 'posts', role: 'viewer' },
    ]);
  });
});

describe('attributes on UserPrincipal', () => {
  it('allows checking principal attributes in predicates', () => {
    const permit = createPermit<'read', { tier: string }>([
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
});

describe('owns() helper', () => {
  it('matches when principal id equals the data field', () => {
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
  });

  it('returns false when data is missing or invalid', () => {
    const permit = createPermit<'update', { ownerId: string }>([
      {
        action: 'update',
        effect: 'allow',
        resource: 'posts',
        role: 'editor',
        when: owns('ownerId'),
      },
    ]);

    expect(permit.can({ id: 'u1', roles: ['editor'] }, 'posts', 'update', undefined)).toBe(false);
    expect(permit.can({ id: 'u1', roles: ['editor'] }, 'posts', 'update', { ownerId: null } as any)).toBe(false);
  });
});
