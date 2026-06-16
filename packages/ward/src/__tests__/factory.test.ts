import { vi } from 'vitest';

import type { BoundWard, WardLoggerContext, WardPredicate } from '../index';

import { ANONYMOUS, createWard, owns, WardPredicateError, WILDCARD } from '../index';

const can = (
  ward: ReturnType<typeof createWard>,
  principal: Parameters<typeof ward.explain>[0],
  resource: string,
  action: Parameters<typeof ward.explain>[2],
  data?: Parameters<typeof ward.explain>[3],
) => ward.explain(principal, resource, action, data).allowed;

// ---------------------------------------------------------------------------
// Core decision model
// ---------------------------------------------------------------------------

describe('ward: core decision model', () => {
  it('denies when no rules match', () => {
    const permit = createWard();

    expect(can(permit, { id: 'u1', roles: ['admin'] }, 'posts', 'read')).toBe(false);
  });

  it('matches role, resource, and action exactly', () => {
    const permit = createWard([{ action: 'read', effect: 'allow', resource: 'posts', role: ['admin'] }]);

    expect(can(permit, { id: 'u1', roles: ['ADMIN'] }, 'POSTS', 'READ' as any)).toBe(false);
    expect(can(permit, { id: 'u1', roles: ['admin'] }, 'posts', 'read')).toBe(true);
  });

  it('supports wildcard role, resource, and action for authenticated principals', () => {
    const permit = createWard([{ action: WILDCARD, effect: 'allow', resource: WILDCARD, role: WILDCARD }]);

    expect(can(permit, { id: 'u1', roles: ['member'] }, 'posts', 'read' as any)).toBe(true);
  });

  it('does not apply wildcard role rules to anonymous principals', () => {
    const permit = createWard([{ action: 'read', effect: 'allow', resource: 'posts', role: WILDCARD }]);

    expect(can(permit, null, 'posts', 'read')).toBe(false);
  });

  it('supports anonymous-only rules via ANONYMOUS', () => {
    const permit = createWard([{ action: 'read', effect: 'allow', resource: 'posts', role: ANONYMOUS }]);

    expect(can(permit, null, 'posts', 'read')).toBe(true);
    expect(can(permit, { id: 'u1', roles: ['viewer'] }, 'posts', 'read')).toBe(false);
  });

  it('prefers higher priority over specificity', () => {
    const permit = createWard([
      { action: 'read', effect: 'deny', priority: 1, resource: 'posts', role: ['editor'] },
      { action: WILDCARD, effect: 'allow', priority: 10, resource: WILDCARD, role: WILDCARD },
    ]);

    expect(can(permit, { id: 'u1', roles: ['editor'] }, 'posts', 'read')).toBe(true);
  });

  it('prefers more specific rules when priority ties', () => {
    const permit = createWard([
      { action: WILDCARD, effect: 'allow', priority: 10, resource: WILDCARD, role: WILDCARD },
      { action: 'read', effect: 'deny', priority: 10, resource: 'posts', role: ['editor'] },
    ]);

    expect(can(permit, { id: 'u1', roles: ['editor'] }, 'posts', 'read')).toBe(false);
  });

  it('lets deny override allow when priority and specificity tie', () => {
    const permit = createWard([
      { action: 'read', effect: 'allow', priority: 10, resource: 'posts', role: ['editor'] },
      { action: 'read', effect: 'deny', priority: 10, resource: 'posts', role: ['editor'] },
    ]);

    expect(can(permit, { id: 'u1', roles: ['editor'] }, 'posts', 'read')).toBe(false);
  });

  it('is independent of role order in the principal payload', () => {
    const permit = createWard([
      { action: 'read', effect: 'allow', priority: 10, resource: 'posts', role: ['admin'] },
      { action: 'read', effect: 'deny', priority: 10, resource: 'posts', role: ['blocked'] },
    ]);

    expect(can(permit, { id: 'u1', roles: ['admin', 'blocked'] }, 'posts', 'read')).toBe(false);
    expect(can(permit, { id: 'u1', roles: ['blocked', 'admin'] }, 'posts', 'read')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Multi-role rules
// ---------------------------------------------------------------------------

describe('ward: multi-role rules', () => {
  it('matches when the principal holds any of the listed roles', () => {
    const permit = createWard([{ action: 'read', effect: 'allow', resource: 'posts', role: ['viewer', 'editor'] }]);

    expect(can(permit, { id: 'u1', roles: ['viewer'] }, 'posts', 'read')).toBe(true);
    expect(can(permit, { id: 'u2', roles: ['editor'] }, 'posts', 'read')).toBe(true);
    expect(can(permit, { id: 'u3', roles: ['admin'] }, 'posts', 'read')).toBe(false);
  });

  it('reduces rule count when multiple roles share the same permissions', () => {
    const permit = createWard([
      { action: 'read', effect: 'allow', resource: 'docs', role: ['member', 'editor', 'admin'] },
      { action: 'update', effect: 'allow', resource: 'docs', role: ['editor', 'admin'] },
    ]);

    expect(can(permit, { id: 'u1', roles: ['member'] }, 'docs', 'read')).toBe(true);
    expect(can(permit, { id: 'u1', roles: ['member'] }, 'docs', 'update')).toBe(false);
    expect(can(permit, { id: 'u2', roles: ['editor'] }, 'docs', 'read')).toBe(true);
    expect(can(permit, { id: 'u2', roles: ['editor'] }, 'docs', 'update')).toBe(true);
    expect(can(permit, { id: 'u3', roles: ['admin'] }, 'docs', 'read')).toBe(true);
    expect(can(permit, { id: 'u3', roles: ['admin'] }, 'docs', 'update')).toBe(true);
  });

  it('multi-role rules score as specific (not wildcard) in priority resolution', () => {
    // A multi-role allow at same priority as a wildcard deny should win (higher score)
    const permit = createWard([
      { action: 'read', effect: 'deny', priority: 0, resource: 'posts', role: WILDCARD },
      { action: 'read', effect: 'allow', priority: 0, resource: 'posts', role: ['viewer', 'editor'] },
    ]);

    expect(can(permit, { id: 'u1', roles: ['viewer'] }, 'posts', 'read')).toBe(true);
  });

  it('preserves authored multi-role array in returned rule shape', () => {
    const permit = createWard([{ action: 'read', effect: 'allow', resource: 'posts', role: ['viewer', 'editor'] }]);

    const decision = permit.explain({ id: 'u1', roles: ['viewer'] }, 'posts', 'read');

    expect(decision.allowed).toBe(true);

    if (decision.allowed) {
      expect(decision.rule.role).toEqual(['viewer', 'editor']);
    }
  });
});

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

describe('ward: validation', () => {
  it('throws for invalid principal payloads', () => {
    const permit = createWard();

    expect(() => permit.explain({ id: 'u1' } as any, 'posts', 'read')).toThrow('Invalid principal');
    expect(() => permit.explain({ roles: ['admin'] } as any, 'posts', 'read')).toThrow('Invalid principal');
    expect(() => permit.explain(undefined as any, 'posts', 'read')).toThrow('Invalid principal');
  });

  it('throws when a rule effect is invalid', () => {
    expect(() => {
      createWard([{ action: 'read', effect: 'grant' as any, resource: 'posts', role: ['viewer'] }]);
    }).toThrow('Rule[0].effect must be "allow" or "deny"');
  });

  it('throws when a when-clause is not a function', () => {
    expect(() => {
      createWard([{ action: 'update', effect: 'allow', resource: 'posts', role: ['editor'], when: 'bad' as any }]);
    }).toThrow('Rule[0].when must be a function');
  });

  it('throws when forUser receives an invalid principal', () => {
    const permit = createWard();

    expect(() => permit.forUser({ id: '', roles: ['viewer'] } as any)).toThrow('Invalid principal');
  });

  it('includes the rule index in validation error messages', () => {
    expect(() => {
      createWard([
        { action: 'read', effect: 'allow', resource: 'posts', role: ['viewer'] },
        { action: 'read', effect: 'allow', resource: 'posts', role: ['editor'] },
        { action: 'read', effect: 'grant' as any, resource: 'posts', role: ['admin'] },
      ]);
    }).toThrow('Rule[2].effect');
  });

  it('throws when a multi-role array contains a non-string', () => {
    expect(() => {
      createWard([{ action: 'read', effect: 'allow', resource: 'posts', role: ['viewer', 123 as any] }]);
    }).toThrow('Rule[0].role');
  });

  it('throws when a multi-role array is empty', () => {
    expect(() => {
      createWard([{ action: 'read', effect: 'allow', resource: 'posts', role: [] as any }]);
    }).toThrow('Rule[0].role');
  });

  it('throws when a principal has a whitespace-only role string', () => {
    const permit = createWard([{ action: 'read', effect: 'allow', resource: 'posts', role: ['viewer'] }]);

    expect(() => permit.explain({ id: 'u1', roles: ['   '] }, 'posts', 'read')).toThrow(
      'roles must be an array of non-empty strings',
    );
  });

  it('deduplicates roles in the compiled rule', () => {
    const permit = createWard([
      { action: 'read', effect: 'allow', resource: 'posts', role: ['editor', 'editor', 'viewer'] },
    ]);

    const decision = permit.explain({ id: 'u1', roles: ['editor'] }, 'posts', 'read');

    expect(decision.allowed).toBe(true);

    if (decision.allowed) {
      expect(decision.rule.role).toEqual(['editor', 'viewer']);
    }
  });
});

// ---------------------------------------------------------------------------
// Predicates and ABAC
// ---------------------------------------------------------------------------

describe('ward: predicates and ABAC behavior', () => {
  it('evaluates when-clause for authenticated principals', () => {
    const permit = createWard<'update', { authorId: string }>([
      {
        action: 'update',
        effect: 'allow',
        resource: 'posts',
        role: ['editor'],
        when: ({ data, principal }) => principal.id === data?.authorId,
      },
    ]);

    expect(can(permit, { id: 'u1', roles: ['editor'] }, 'posts', 'update', { authorId: 'u1' })).toBe(true);
    expect(can(permit, { id: 'u1', roles: ['editor'] }, 'posts', 'update', { authorId: 'u2' })).toBe(false);
  });

  it('does not match data-dependent rules for anonymous principals', () => {
    const permit = createWard<'read', { ownerId: string }>([
      {
        action: 'read',
        effect: 'allow',
        resource: 'posts',
        role: ANONYMOUS,
        when: ({ data, principal }) => principal.id === data?.ownerId,
      },
    ]);

    expect(can(permit, null, 'posts', 'read', { ownerId: 'u1' })).toBe(false);
  });

  it('supports principal attribute checks in predicates', () => {
    const permit = createWard<'read'>([
      {
        action: 'read',
        effect: 'allow',
        resource: 'premium-content',
        role: ['user'],
        when: ({ principal }) => principal.attributes?.tier === 'premium',
      },
    ]);

    expect(can(permit, { attributes: { tier: 'premium' }, id: 'u1', roles: ['user'] }, 'premium-content', 'read')).toBe(
      true,
    );
    expect(can(permit, { attributes: { tier: 'free' }, id: 'u2', roles: ['user'] }, 'premium-content', 'read')).toBe(
      false,
    );
  });

  it('supports owns helper for ownership checks', () => {
    const permit = createWard<'update', { authorId: string }>([
      {
        action: 'update',
        effect: 'allow',
        resource: 'posts',
        role: ['editor'],
        when: owns('authorId'),
      },
    ]);

    expect(can(permit, { id: 'u1', roles: ['editor'] }, 'posts', 'update', { authorId: 'u1' })).toBe(true);
    expect(can(permit, { id: 'u1', roles: ['editor'] }, 'posts', 'update', { authorId: 'u2' })).toBe(false);
    expect(can(permit, { id: 'u1', roles: ['editor'] }, 'posts', 'update', undefined)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Decision APIs
// ---------------------------------------------------------------------------

describe('ward: decision APIs', () => {
  it('checkAll returns true/false per action', () => {
    const permit = createWard<'read' | 'update'>([
      { action: 'read', effect: 'allow', resource: 'posts', role: ['viewer'] },
      { action: 'update', effect: 'deny', resource: 'posts', role: ['viewer'] },
    ]);
    const principal = { id: 'u1', roles: ['viewer'] };

    expect(permit.checkAll(principal, [{ action: 'read', resource: 'posts' }])[0].allowed).toBe(true);
    expect(permit.checkAll(principal, [{ action: 'update', resource: 'posts' }])[0].allowed).toBe(false);
  });

  it('allowedActions filters to only allowed actions', () => {
    const permit = createWard<'read' | 'update' | 'delete'>([
      { action: 'read', effect: 'allow', resource: 'posts', role: ['viewer'] },
      { action: 'update', effect: 'deny', resource: 'posts', role: ['viewer'] },
    ]);
    const principal = { id: 'u1', roles: ['viewer'] };

    expect(permit.allowedActions(principal, 'posts', ['read', 'update'])).toEqual(['read']);
    expect(permit.allowedActions(principal, 'posts', ['update', 'delete'])).toEqual([]);
  });

  it('returns an empty array for empty batch checks without validating the principal', () => {
    const permit = createWard<'read'>([{ action: 'read', effect: 'allow', resource: 'posts', role: ['viewer'] }]);

    expect(permit.checkAll({ id: '' as any, roles: ['viewer'] }, [])).toEqual([]);
  });

  it('returns checkAll decisions in the same order as input checks', () => {
    const permit = createWard<'read' | 'update' | 'delete'>([
      { action: 'read', effect: 'allow', resource: 'posts', role: ['viewer'] },
      { action: 'update', effect: 'deny', resource: 'posts', role: ['viewer'] },
    ]);

    const decisions = permit.checkAll({ id: 'u1', roles: ['viewer'] }, [
      { action: 'read', resource: 'posts' },
      { action: 'update', resource: 'posts' },
      { action: 'delete', resource: 'posts' },
    ]);

    expect(decisions).toHaveLength(3);
    expect(decisions[0].allowed).toBe(true);
    expect(decisions[1].allowed).toBe(false);
    expect(decisions[0]).toMatchObject({ action: 'read', resource: 'posts' });
    expect(decisions[1]).toMatchObject({ action: 'update', resource: 'posts' });
    expect(decisions[2]).toEqual({ action: 'delete', allowed: false, reason: 'no-matching-rule', resource: 'posts' });
  });

  it('returns the normalized rule shape from explain, including priority: 0 when not authored', () => {
    const permit = createWard([{ action: 'read', effect: 'allow', resource: 'posts', role: ['viewer'] }]);

    const decision = permit.explain({ id: 'u1', roles: ['viewer'] }, 'posts', 'read');

    expect(decision).toEqual({
      allowed: true,
      rule: { action: 'read', effect: 'allow', priority: 0, resource: 'posts', role: ['viewer'] },
    });
  });

  it('returns explicit-deny when a deny rule wins', () => {
    const permit = createWard([
      { action: 'read', effect: 'allow', resource: 'posts', role: ['viewer'] },
      { action: 'read', effect: 'deny', resource: 'posts', role: ['blocked'] },
    ]);

    const decision = permit.explain({ id: 'u1', roles: ['blocked'] }, 'posts', 'read');

    expect(decision).toEqual({
      allowed: false,
      reason: 'explicit-deny',
      rule: { action: 'read', effect: 'deny', priority: 0, resource: 'posts', role: ['blocked'] },
    });
  });

  it('returns no-matching-rule when nothing matches', () => {
    const permit = createWard([{ action: 'read', effect: 'allow', resource: 'posts', role: ['viewer'] }]);

    expect(permit.explain({ id: 'u1', roles: ['editor'] }, 'posts', 'read')).toEqual({
      allowed: false,
      reason: 'no-matching-rule',
    });
  });
});

// ---------------------------------------------------------------------------
// allowedActions (knownActions required)
// ---------------------------------------------------------------------------

describe('ward: allowedActions', () => {
  it('returns allowed actions from the provided knownActions list', () => {
    const permit = createWard<'read' | 'update' | 'delete'>([
      { action: 'read', effect: 'allow', resource: 'posts', role: ['viewer'] },
      { action: 'update', effect: 'allow', resource: 'posts', role: ['editor'] },
      { action: 'delete', effect: 'deny', resource: 'posts', role: ['editor'] },
    ]);

    expect(permit.allowedActions({ id: 'u1', roles: ['viewer'] }, 'posts', ['read', 'update', 'delete'])).toEqual([
      'read',
    ]);
    expect(permit.allowedActions({ id: 'u2', roles: ['editor'] }, 'posts', ['read', 'update', 'delete'])).toEqual([
      'update',
    ]);
  });

  it('resolves wildcard-action rules when knownActions is provided', () => {
    const permit = createWard<'read' | 'update'>([
      { action: WILDCARD, effect: 'allow', resource: 'posts', role: ['admin'] },
    ]);

    expect(permit.allowedActions({ id: 'u1', roles: ['admin'] }, 'posts', ['read', 'update'])).toEqual([
      'read',
      'update',
    ]);
  });

  it('returns empty array when knownActions is empty', () => {
    const permit = createWard<'read'>([{ action: 'read', effect: 'allow', resource: 'posts', role: ['admin'] }]);

    expect(permit.allowedActions({ id: 'u1', roles: ['admin'] }, 'posts', [])).toEqual([]);
  });

  it('deduplicates knownActions while preserving order', () => {
    const permit = createWard<'read' | 'update'>([
      { action: WILDCARD, effect: 'allow', resource: 'posts', role: ['admin'] },
    ]);

    expect(permit.allowedActions({ id: 'u1', roles: ['admin'] }, 'posts', ['update', 'read', 'update'])).toEqual([
      'update',
      'read',
    ]);
  });

  it('respects data-dependent rules when data is passed', () => {
    const permit = createWard<'update', { authorId: string }>([
      { action: 'update', effect: 'allow', resource: 'posts', role: ['editor'], when: owns('authorId') },
    ]);

    expect(permit.allowedActions({ id: 'u1', roles: ['editor'] }, 'posts', ['update'], { authorId: 'u1' })).toEqual([
      'update',
    ]);
    expect(permit.allowedActions({ id: 'u1', roles: ['editor'] }, 'posts', ['update'], { authorId: 'u2' })).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// rulesInScope
// ---------------------------------------------------------------------------

describe('ward: rulesInScope', () => {
  it('returns rules in scope for a principal and resource', () => {
    const permit = createWard<'read' | 'update'>([
      { action: 'read', effect: 'allow', resource: 'posts', role: ['viewer'] },
      { action: 'update', effect: 'allow', resource: 'posts', role: ['editor'] },
      { action: WILDCARD, effect: 'deny', priority: 100, resource: 'posts', role: ['blocked'] },
      { action: 'read', effect: 'allow', resource: 'comments', role: ['viewer'] },
    ]);

    expect(permit.rulesInScope({ id: 'u1', roles: ['viewer', 'blocked'] }, 'posts')).toEqual([
      { action: 'read', effect: 'allow', priority: 0, resource: 'posts', role: ['viewer'] },
      { action: WILDCARD, effect: 'deny', priority: 100, resource: 'posts', role: ['blocked'] },
    ]);
  });

  it('can refine rulesInScope by predicate data when data is provided', () => {
    const permit = createWard<'update', { authorId: string }>([
      {
        action: 'update',
        effect: 'allow',
        resource: 'posts',
        role: ['editor'],
        when: ({ data, principal }) => principal.id === data?.authorId,
      },
    ]);

    expect(permit.rulesInScope({ id: 'u1', roles: ['editor'] }, 'posts')).toHaveLength(1);
    expect(permit.rulesInScope({ id: 'u1', roles: ['editor'] }, 'posts', { authorId: 'u1' })).toHaveLength(1);
    expect(permit.rulesInScope({ id: 'u1', roles: ['editor'] }, 'posts', { authorId: 'u2' })).toEqual([]);
  });

  it('returns anonymous rules in scope for a null principal', () => {
    const permit = createWard<'read'>([
      { action: 'read', effect: 'allow', resource: 'posts', role: ANONYMOUS },
      { action: 'read', effect: 'allow', resource: 'posts', role: WILDCARD },
    ]);

    expect(permit.rulesInScope(null, 'posts')).toEqual([
      { action: 'read', effect: 'allow', priority: 0, resource: 'posts', role: [ANONYMOUS] },
    ]);
  });

  it('includes predicate-gated rules when data is omitted (predicate skip)', () => {
    const neverTrue: WardPredicate<{ authorId: string }> = () => false;
    const permit = createWard<'update', { authorId: string }>([
      { action: 'update', effect: 'allow', resource: 'posts', role: 'editor', when: neverTrue },
    ]);

    const withoutData = permit.rulesInScope({ id: 'u1', roles: ['editor'] }, 'posts');
    const withData = permit.rulesInScope({ id: 'u1', roles: ['editor'] }, 'posts', { authorId: 'other' });

    expect(withoutData).toHaveLength(1);
    expect(withData).toHaveLength(0);
  });

  it('includes multi-role rules when principal holds any matching role', () => {
    const permit = createWard<'read'>([
      { action: 'read', effect: 'allow', resource: 'posts', role: ['viewer', 'editor'] },
    ]);

    expect(permit.rulesInScope({ id: 'u1', roles: ['editor'] }, 'posts')).toHaveLength(1);
    expect(permit.rulesInScope({ id: 'u2', roles: ['admin'] }, 'posts')).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Bound view
// ---------------------------------------------------------------------------

describe('ward: bound view', () => {
  it('binds decision methods to the provided principal', () => {
    const permit = createWard<'read' | 'update' | 'delete'>([
      { action: 'read', effect: 'allow', resource: 'posts', role: ['viewer'] },
      { action: 'update', effect: 'deny', resource: 'posts', role: ['viewer'] },
    ]);

    const bound = permit.forUser({ id: 'u1', roles: ['viewer'] });

    expect(bound.explain('posts', 'read').allowed).toBe(true);
    expect(
      bound
        .checkAll([
          { action: 'read', resource: 'posts' },
          { action: 'update', resource: 'posts' },
        ])
        .every((d) => d.allowed),
    ).toBe(false);
    expect(
      bound
        .checkAll([
          { action: 'read', resource: 'posts' },
          { action: 'update', resource: 'posts' },
        ])
        .some((d) => d.allowed),
    ).toBe(true);
    expect(bound.explain('posts', 'update')).toEqual({
      allowed: false,
      reason: 'explicit-deny',
      rule: { action: 'update', effect: 'deny', priority: 0, resource: 'posts', role: ['viewer'] },
    });
  });

  it('exposes bound checkAll and rulesInScope', () => {
    const permit = createWard<'read' | 'update'>([
      { action: 'read', effect: 'allow', resource: 'posts', role: ['viewer'] },
      { action: 'update', effect: 'deny', resource: 'posts', role: ['viewer'] },
    ]);

    const bound = permit.forUser({ id: 'u1', roles: ['viewer'] });

    expect(
      bound.checkAll([
        { action: 'read', resource: 'posts' },
        { action: 'update', resource: 'posts' },
      ]),
    ).toEqual([
      {
        action: 'read',
        allowed: true,
        resource: 'posts',
        rule: { action: 'read', effect: 'allow', priority: 0, resource: 'posts', role: ['viewer'] },
      },
      {
        action: 'update',
        allowed: false,
        reason: 'explicit-deny',
        resource: 'posts',
        rule: { action: 'update', effect: 'deny', priority: 0, resource: 'posts', role: ['viewer'] },
      },
    ]);

    expect(bound.rulesInScope('posts')).toEqual([
      { action: 'read', effect: 'allow', priority: 0, resource: 'posts', role: ['viewer'] },
      { action: 'update', effect: 'deny', priority: 0, resource: 'posts', role: ['viewer'] },
    ]);
  });

  it('exposes allowedActions on the bound view', () => {
    const permit = createWard<'read' | 'update' | 'delete'>([
      { action: 'read', effect: 'allow', resource: 'posts', role: ['viewer'] },
      { action: 'update', effect: 'deny', resource: 'posts', role: ['viewer'] },
    ]);

    const bound = permit.forUser({ id: 'u1', roles: ['viewer'] });

    expect(bound.allowedActions('posts', ['read', 'update', 'delete'])).toEqual(['read']);
  });

  it('snapshots principal roles and attributes at bind time', () => {
    const permit = createWard<'read'>([
      {
        action: 'read',
        effect: 'allow',
        resource: 'premium-content',
        role: ['user'],
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

    expect(bound.explain('premium-content', 'read').allowed).toBe(true);
  });

  it('does not expose forUser on BoundWard', () => {
    const permit = createWard<'read'>([{ action: 'read', effect: 'allow', resource: 'posts', role: ['viewer'] }]);
    const bound = permit.forUser({ id: 'u1', roles: ['viewer'] });

    expect((bound as any).forUser).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Logger behavior
// ---------------------------------------------------------------------------

describe('ward: logger behavior', () => {
  it('logs allow decisions with the authored winning rule', () => {
    const calls: WardLoggerContext[] = [];

    const permit = createWard([{ action: 'read', effect: 'allow', resource: 'posts', role: ['viewer'] }], {
      logger: (context) => calls.push(context),
    });

    permit.explain({ id: 'u1', roles: ['viewer'] }, 'posts', 'read', { trace: 'x' } as any);

    expect(calls[0].allowed).toBe(true);
    expect(calls[0].action).toBe('read');

    if (calls[0].allowed) {
      expect(calls[0].rule.role).toEqual(['viewer']);
    }

    expect(calls[0].data).toEqual({ trace: 'x' });
  });

  it('logger context distinguishes allow, explicit-deny, and no-matching-rule', () => {
    const calls: WardLoggerContext[] = [];

    const permit = createWard(
      [
        { action: 'read', effect: 'allow', resource: 'posts', role: ['viewer'] },
        { action: 'update', effect: 'deny', resource: 'posts', role: ['viewer'] },
      ],
      { logger: (ctx) => calls.push(ctx) },
    );

    const principal = { id: 'u1', roles: ['viewer'] };

    permit.explain(principal, 'posts', 'read'); // allow
    permit.explain(principal, 'posts', 'update'); // explicit-deny
    permit.explain(principal, 'posts', 'delete'); // no-matching-rule

    expect(calls[0].allowed).toBe(true);
    expect(calls[1].allowed).toBe(false);
    expect(calls[2].allowed).toBe(false);
    // explicit-deny includes the rule, no-matching-rule does not
    expect('rule' in calls[1]).toBe(true);
    expect('rule' in calls[2]).toBe(false);
  });

  it('logs one decision per action for checkAll', () => {
    const calls: WardLoggerContext[] = [];

    const permit = createWard<'read' | 'update' | 'delete'>(
      [
        { action: 'read', effect: 'allow', resource: 'posts', role: ['viewer'] },
        { action: 'update', effect: 'deny', resource: 'posts', role: ['viewer'] },
      ],
      {
        logger: (context) => calls.push(context),
      },
    );

    const principal = { id: 'u1', roles: ['viewer'] };

    permit.checkAll(principal, [
      { action: 'read', resource: 'posts' },
      { action: 'update', resource: 'posts' },
      { action: 'delete', resource: 'posts' },
    ]);

    expect(calls).toHaveLength(3);
    expect(calls.map((call) => call.action)).toEqual(['read', 'update', 'delete']);
  });

  it('does not log introspection and enumeration helpers', () => {
    const calls: WardLoggerContext[] = [];

    const permit = createWard<'read' | 'delete'>(
      [
        { action: 'read', effect: 'allow', resource: 'posts', role: ['viewer'] },
        { action: WILDCARD, effect: 'allow', resource: 'posts', role: ['admin'] },
      ],
      {
        logger: (context) => calls.push(context),
      },
    );

    permit.allowedActions({ id: 'u1', roles: ['admin'] }, 'posts', ['read', 'delete']);
    permit.rulesInScope({ id: 'u1', roles: ['viewer'] }, 'posts');

    expect(calls).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Rule validation at creation time
// ---------------------------------------------------------------------------

describe('ward: rule validation at creation time', () => {
  it('throws when role is empty', () => {
    expect(() => {
      createWard([{ action: 'read', effect: 'allow', resource: 'posts', role: '' }]);
    }).toThrow('Rule[0].role');
  });

  it('throws when role is whitespace-only', () => {
    expect(() => {
      createWard([{ action: 'read', effect: 'allow', resource: 'posts', role: ['   '] }]);
    }).toThrow('Rule[0].role');
  });

  it('throws when resource is empty', () => {
    expect(() => {
      createWard([{ action: 'read', effect: 'allow', resource: '', role: ['viewer'] }]);
    }).toThrow('Rule[0].resource');
  });

  it('throws when resource is whitespace-only', () => {
    expect(() => {
      createWard([{ action: 'read', effect: 'allow', resource: '   ', role: ['viewer'] }]);
    }).toThrow('Rule[0].resource');
  });

  it('throws when action is empty', () => {
    expect(() => {
      createWard([{ action: '' as any, effect: 'allow', resource: 'posts', role: ['viewer'] }]);
    }).toThrow('Rule[0].action');
  });

  it('throws when priority is NaN', () => {
    expect(() => {
      createWard([{ action: 'read', effect: 'allow', priority: NaN, resource: 'posts', role: ['viewer'] }]);
    }).toThrow('Rule[0].priority');
  });

  it('throws when priority is Infinity', () => {
    expect(() => {
      createWard([{ action: 'read', effect: 'allow', priority: Infinity, resource: 'posts', role: ['viewer'] }]);
    }).toThrow('Rule[0].priority');
  });

  it('throws when priority is a non-number', () => {
    expect(() => {
      createWard([{ action: 'read', effect: 'allow', priority: 'high' as any, resource: 'posts', role: ['viewer'] }]);
    }).toThrow('Rule[0].priority');
  });

  it('accepts negative priority', () => {
    expect(() => {
      createWard([{ action: 'read', effect: 'allow', priority: -5, resource: 'posts', role: ['viewer'] }]);
    }).not.toThrow();
  });

  it('accepts zero priority', () => {
    expect(() => {
      createWard([{ action: 'read', effect: 'allow', priority: 0, resource: 'posts', role: ['viewer'] }]);
    }).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Predicate error propagation
// ---------------------------------------------------------------------------

describe('ward: predicate error propagation', () => {
  it('propagates predicate exceptions through explain, enriched with rule index', () => {
    const permit = createWard<'read', { id: string }>([
      {
        action: 'read',
        effect: 'allow',
        resource: 'posts',
        role: ['editor'],
        when: () => {
          throw new Error('predicate exploded');
        },
      },
    ]);

    expect(() => permit.explain({ id: 'u1', roles: ['editor'] }, 'posts', 'read', { id: 'u1' })).toThrow(
      '[ward] Rule[0] threw: predicate exploded',
    );
  });

  it('thrown error is an instance of WardPredicateError with correct ruleIndex', () => {
    const permit = createWard<'read', { id: string }>([
      {
        action: 'read',
        effect: 'allow',
        resource: 'posts',
        role: ['editor'],
        when: () => {
          throw new Error('predicate exploded');
        },
      },
    ]);

    let caught: unknown;

    try {
      permit.explain({ id: 'u1', roles: ['editor'] }, 'posts', 'read', { id: 'u1' });
    } catch (e) {
      caught = e;
    }

    expect(caught).toBeInstanceOf(WardPredicateError);
    expect((caught as WardPredicateError).ruleIndex).toBe(0);
    expect((caught as WardPredicateError).name).toBe('WardPredicateError');
  });

  it('propagates predicate exceptions through checkAll, enriched with rule index', () => {
    const permit = createWard<'read'>([
      {
        action: 'read',
        effect: 'allow',
        resource: 'posts',
        role: ['editor'],
        when: () => {
          throw new Error('predicate exploded');
        },
      },
    ]);

    expect(() => permit.checkAll({ id: 'u1', roles: ['editor'] }, [{ action: 'read', resource: 'posts' }])).toThrow(
      '[ward] Rule[0] threw: predicate exploded',
    );
  });
});

// ---------------------------------------------------------------------------
// Bound view snapshot depth
// ---------------------------------------------------------------------------

describe('ward: bound view snapshot depth', () => {
  it('does not reflect nested attribute mutations after forUser binding', () => {
    const permit = createWard<'read'>([
      {
        action: 'read',
        effect: 'allow',
        resource: 'docs',
        role: ['user'],
        when: ({ principal }) => (principal.attributes?.config as Record<string, unknown>)?.enabled === true,
      },
    ]);

    const principal = {
      attributes: { config: { enabled: true } },
      id: 'u1',
      roles: ['user'],
    };

    const bound = permit.forUser(principal);

    (principal.attributes.config as Record<string, unknown>).enabled = false;

    expect(bound.explain('docs', 'read').allowed).toBe(true);
  });

  it('does not reflect shallow attribute replacement after forUser binding', () => {
    const permit = createWard<'read'>([
      {
        action: 'read',
        effect: 'allow',
        resource: 'docs',
        role: ['user'],
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

    expect(bound.explain('docs', 'read').allowed).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Type exports
// ---------------------------------------------------------------------------

describe('ward: BoundWard type is publicly exported', () => {
  it('can be used as an explicit type annotation', () => {
    const permit = createWard<'read'>([{ action: 'read', effect: 'allow', resource: 'posts', role: ['viewer'] }]);
    const bound: BoundWard<'read'> = permit.forUser({ id: 'u1', roles: ['viewer'] });

    expect(bound).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Edge-case tests covering previously uncovered scenarios (R7)
// ---------------------------------------------------------------------------

describe('ward: ANONYMOUS in multi-role arrays', () => {
  it('matches both null and matching authenticated principals when ANONYMOUS is in a multi-role array', () => {
    const permit = createWard([{ action: 'read', effect: 'allow', resource: 'posts', role: [ANONYMOUS, 'viewer'] }]);

    expect(can(permit, null, 'posts', 'read')).toBe(true);
    expect(can(permit, { id: 'u1', roles: ['viewer'] }, 'posts', 'read')).toBe(true);
    expect(can(permit, { id: 'u2', roles: ['other'] }, 'posts', 'read')).toBe(false);
  });
});

describe('ward: allowedActions with null principal', () => {
  it('returns allowed actions for ANONYMOUS rules when principal is null', () => {
    const permit = createWard<'read' | 'write'>([
      { action: WILDCARD, effect: 'allow', resource: 'docs', role: ANONYMOUS },
    ]);

    expect(permit.allowedActions(null, 'docs', ['read', 'write'])).toEqual(['read', 'write']);
  });

  it('returns empty array for null principal when no ANONYMOUS rules exist', () => {
    const permit = createWard<'read' | 'write'>([
      { action: 'read', effect: 'allow', resource: 'docs', role: ['viewer'] },
    ]);

    expect(permit.allowedActions(null, 'docs', ['read', 'write'])).toEqual([]);
  });
});

describe('ward: rulesInScope with wildcard resource', () => {
  it('includes a wildcard-resource rule in scope for any resource', () => {
    const permit = createWard([{ action: 'read', effect: 'allow', resource: WILDCARD, role: ['admin'] }]);

    const scope = permit.rulesInScope({ id: 'u1', roles: ['admin'] }, 'anything');

    expect(scope).toHaveLength(1);
    expect(scope[0].resource).toBe(WILDCARD);
  });

  it('does not include a wildcard-resource rule in scope for a principal without the required role', () => {
    const permit = createWard([{ action: 'read', effect: 'allow', resource: WILDCARD, role: ['admin'] }]);

    const scope = permit.rulesInScope({ id: 'u1', roles: ['viewer'] }, 'anything');

    expect(scope).toHaveLength(0);
  });
});

describe('ward: explain preserves the when predicate in the returned rule', () => {
  it('includes the when field on the rule attached to the decision', () => {
    const isOwner: WardPredicate<{ ownerId: string }> = ({ data, principal }) => data?.ownerId === principal.id;

    const permit = createWard<'edit', { ownerId: string }>([
      { action: 'edit', effect: 'allow', resource: 'posts', role: ['user'], when: isOwner },
    ]);

    const decision = permit.explain({ id: 'u1', roles: ['user'] }, 'posts', 'edit', { ownerId: 'u1' });

    expect(decision.allowed).toBe(true);

    if (decision.allowed) {
      expect(typeof decision.rule.when).toBe('function');
      expect(decision.rule.when).toBe(isOwner);
    }
  });
});

describe('ward: returned decision.rule is frozen', () => {
  it('returned rules are frozen objects — mutations throw TypeError in strict mode', () => {
    const permit = createWard([{ action: 'read', effect: 'allow', resource: 'posts', role: ['viewer'] }]);

    const decision = permit.explain({ id: 'u1', roles: ['viewer'] }, 'posts', 'read');

    expect(decision.allowed).toBe(true);

    if (decision.allowed) {
      expect(Object.isFrozen(decision.rule)).toBe(true);
      expect(Object.isFrozen(decision.rule.role)).toBe(true);
      // Attempting to mutate a frozen object throws in strict mode
      expect(() => {
        (decision.rule as Record<string, unknown>).effect = 'deny';
      }).toThrow(TypeError);
    }
  });

  it('all ward instances return the same frozen reference — no allocation per call', () => {
    const permit = createWard([{ action: 'read', effect: 'allow', resource: 'posts', role: ['viewer'] }]);
    const principal = { id: 'u1', roles: ['viewer'] };

    const a = permit.explain(principal, 'posts', 'read');
    const b = permit.explain(principal, 'posts', 'read');

    // Same frozen object reference (no clone on every call)
    expect(a.allowed && b.allowed && a.rule === b.rule).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Trailing-colon validation (R6)
// ---------------------------------------------------------------------------

describe('ward: trailing-colon resource/action validation', () => {
  it('throws a descriptive error for resource ending in ":"', () => {
    expect(() => {
      createWard([{ action: 'read', effect: 'allow', resource: 'posts:', role: ['viewer'] }]);
    }).toThrow("Rule[0].resource 'posts:' ends with ':' — did you mean 'posts:*'?");
  });

  it('throws a descriptive error for action ending in ":"', () => {
    expect(() => {
      createWard([{ action: 'read:' as any, effect: 'allow', resource: 'posts', role: ['viewer'] }]);
    }).toThrow("Rule[0].action 'read:' ends with ':' — did you mean 'read:*'?");
  });

  it('does not throw for valid namespace wildcard patterns', () => {
    expect(() => {
      createWard([{ action: 'read:*', effect: 'allow', resource: 'posts:*', role: ['viewer'] }]);
    }).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// 3-tier specificity (R1): exact > namespace-wildcard > global-wildcard
// ---------------------------------------------------------------------------

describe('ward: 3-tier specificity scoring', () => {
  it('exact resource beats namespace-wildcard resource at same priority', () => {
    const permit = createWard([
      { action: 'read', effect: 'allow', resource: 'posts:*', role: ['viewer'] },
      { action: 'read', effect: 'deny', resource: 'posts:123', role: ['viewer'] },
    ]);

    // posts:123 (exact) matches; deny should win over allow for posts:*
    expect(can(permit, { id: 'u1', roles: ['viewer'] }, 'posts:123', 'read')).toBe(false);
    // posts:456 only matches posts:*, allow wins
    expect(can(permit, { id: 'u1', roles: ['viewer'] }, 'posts:456', 'read')).toBe(true);
  });

  it('namespace-wildcard resource beats global-wildcard resource at same priority', () => {
    const permit = createWard([
      { action: 'read', effect: 'allow', resource: WILDCARD, role: ['viewer'] },
      { action: 'read', effect: 'deny', resource: 'posts:*', role: ['viewer'] },
    ]);

    expect(can(permit, { id: 'u1', roles: ['viewer'] }, 'posts:123', 'read')).toBe(false);
    expect(can(permit, { id: 'u1', roles: ['viewer'] }, 'comments:1', 'read')).toBe(true);
  });

  it('large priorities do not overflow Number.MAX_SAFE_INTEGER (R2)', () => {
    const permit = createWard([
      { action: 'read', effect: 'allow', priority: Number.MAX_SAFE_INTEGER, resource: 'posts', role: ['admin'] },
      { action: 'read', effect: 'deny', priority: 0, resource: 'posts', role: ['admin'] },
    ]);

    // High-priority allow should win
    expect(can(permit, { id: 'u1', roles: ['admin'] }, 'posts', 'read')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Action-level hierarchy (action namespace wildcards)
// ---------------------------------------------------------------------------

describe('ward: action namespace wildcards', () => {
  it('read:* matches read:own and read:all sub-actions', () => {
    const permit = createWard<'read:own' | 'read:all' | 'write'>([
      { action: 'read:*' as any, effect: 'allow', resource: 'posts', role: ['viewer'] },
    ]);

    expect(can(permit, { id: 'u1', roles: ['viewer'] }, 'posts', 'read:own')).toBe(true);
    expect(can(permit, { id: 'u1', roles: ['viewer'] }, 'posts', 'read:all')).toBe(true);
    expect(can(permit, { id: 'u1', roles: ['viewer'] }, 'posts', 'write')).toBe(false);
  });

  it('exact action beats action namespace wildcard at same priority', () => {
    const permit = createWard<'read:own' | 'read:all'>([
      { action: 'read:*' as any, effect: 'allow', resource: 'posts', role: ['viewer'] },
      { action: 'read:own', effect: 'deny', resource: 'posts', role: ['viewer'] },
    ]);

    // read:own is an exact match — deny wins
    expect(can(permit, { id: 'u1', roles: ['viewer'] }, 'posts', 'read:own')).toBe(false);
    // read:all only matches read:* — allow wins
    expect(can(permit, { id: 'u1', roles: ['viewer'] }, 'posts', 'read:all')).toBe(true);
  });

  it('global wildcard action still matches all actions including sub-actions', () => {
    const permit = createWard<'read:own' | 'write'>([
      { action: WILDCARD, effect: 'allow', resource: 'posts', role: ['admin'] },
    ]);

    expect(can(permit, { id: 'u1', roles: ['admin'] }, 'posts', 'read:own')).toBe(true);
    expect(can(permit, { id: 'u1', roles: ['admin'] }, 'posts', 'write')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Conflict detection
// ---------------------------------------------------------------------------

describe('ward: detectConflicts', () => {
  it('returns empty array when no conflicts exist', () => {
    const permit = createWard([
      { action: 'read', effect: 'allow', resource: 'posts', role: ['viewer'] },
      { action: 'update', effect: 'allow', resource: 'posts', role: ['editor'] },
    ]);

    expect(permit.detectConflicts()).toEqual([]);
  });

  it('detects exact duplicate rules (same role set, resource, action)', () => {
    const permit = createWard([
      { action: 'read', effect: 'allow', resource: 'posts', role: ['viewer'] },
      { action: 'read', effect: 'deny', resource: 'posts', role: ['viewer'] },
    ]);

    const conflicts = permit.detectConflicts();

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].kind).toBe('duplicate');

    if (conflicts[0].kind === 'duplicate') {
      expect(conflicts[0].indexB).toBe(1);
      expect(conflicts[0].indexA).toBe(0);
    }
  });

  it('detects shadowed rules where broader rule always wins', () => {
    const permit = createWard([
      // Rule 0: high priority wildcard allow — shadows Rule 1
      { action: 'read', effect: 'allow', priority: 10, resource: WILDCARD, role: WILDCARD },
      // Rule 1: lower priority, more specific — can never win
      { action: 'read', effect: 'deny', priority: 0, resource: 'posts', role: ['viewer'] },
    ]);

    const conflicts = permit.detectConflicts();

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].kind).toBe('shadowed');

    if (conflicts[0].kind === 'shadowed') {
      expect(conflicts[0].shadowedIndex).toBe(1);
      expect(conflicts[0].shadowingIndex).toBe(0);
    }
  });

  it('detectConflicts result is cached — same reference on repeated calls', () => {
    const permit = createWard([
      { action: 'read', effect: 'allow', resource: 'posts', role: ['viewer'] },
      { action: 'read', effect: 'deny', resource: 'posts', role: ['viewer'] },
    ]);

    expect(permit.detectConflicts()).toBe(permit.detectConflicts());
  });

  it('onConflict callback is invoked for each detected conflict', () => {
    const seen: string[] = [];

    createWard(
      [
        { action: 'read', effect: 'allow', resource: 'posts', role: ['viewer'] },
        { action: 'read', effect: 'deny', resource: 'posts', role: ['viewer'] },
      ],
      { onConflict: (c) => seen.push(c.kind) },
    );

    expect(seen).toEqual(['duplicate']);
  });

  it('strict mode throws immediately when conflicts are detected', () => {
    expect(() => {
      createWard(
        [
          { action: 'read', effect: 'allow', resource: 'posts', role: ['viewer'] },
          { action: 'read', effect: 'deny', resource: 'posts', role: ['viewer'] },
        ],
        { strict: true },
      );
    }).toThrow('rule conflict');
  });

  it('strict mode does not throw when no conflicts exist', () => {
    expect(() => {
      createWard(
        [
          { action: 'read', effect: 'allow', resource: 'posts', role: ['viewer'] },
          { action: 'update', effect: 'allow', resource: 'posts', role: ['editor'] },
        ],
        { strict: true },
      );
    }).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// trace
// ---------------------------------------------------------------------------

describe('ward: trace', () => {
  it('returns decision and empty candidates when no rules match', () => {
    const permit = createWard<'read'>([{ action: 'read', effect: 'allow', resource: 'posts', role: 'viewer' }]);

    const trace = permit.trace({ id: 'u1', roles: ['editor'] }, 'posts', 'read');

    expect(trace.decision).toEqual({ allowed: false, reason: 'no-matching-rule' });
    expect(trace.candidates).toHaveLength(0);
  });

  it('returns one candidate marked won when a single rule matches', () => {
    const permit = createWard<'read'>([{ action: 'read', effect: 'allow', resource: 'posts', role: 'viewer' }]);

    const trace = permit.trace({ id: 'u1', roles: ['viewer'] }, 'posts', 'read');

    expect(trace.decision).toEqual({ allowed: true, rule: expect.objectContaining({ role: ['viewer'] }) });
    expect(trace.candidates).toHaveLength(1);
    expect(trace.candidates[0].won).toBe(true);
  });

  it('marks the winner among multiple matching candidates', () => {
    const permit = createWard<'read'>([
      { action: 'read', effect: 'allow', resource: 'posts', role: 'viewer' },
      { action: 'read', effect: 'deny', priority: 10, resource: 'posts', role: 'viewer' },
    ]);

    const trace = permit.trace({ id: 'u1', roles: ['viewer'] }, 'posts', 'read');

    expect(trace.candidates).toHaveLength(2);

    const winner = trace.candidates.find((c) => c.won);

    expect(winner).toBeDefined();
    expect(winner?.rule.effect).toBe('deny');
    expect(trace.decision).toEqual({ allowed: false, reason: 'explicit-deny', rule: winner?.rule });
  });

  it('trace candidates include priority, score, rule, and won', () => {
    const permit = createWard<'read'>([
      { action: 'read', effect: 'allow', priority: 5, resource: 'posts', role: 'viewer' },
    ]);

    const trace = permit.trace({ id: 'u1', roles: ['viewer'] }, 'posts', 'read');

    expect(trace.candidates[0].priority).toBe(5);
    expect(typeof trace.candidates[0].score).toBe('number');
    expect(trace.candidates[0].won).toBe(true);
    expect(trace.candidates[0].rule.effect).toBe('allow');
  });

  it('is available on bound views', () => {
    const permit = createWard<'read'>([{ action: 'read', effect: 'allow', resource: 'posts', role: 'viewer' }]);

    const bound = permit.forUser({ id: 'u1', roles: ['viewer'] });
    const trace = bound.trace('posts', 'read');

    expect(trace.decision.allowed).toBe(true);
    expect(trace.candidates).toHaveLength(1);
  });

  it('does not fire the logger (trace is a side-channel-free inspection tool)', () => {
    const calls: WardLoggerContext[] = [];

    const permit = createWard<'read'>([{ action: 'read', effect: 'allow', resource: 'posts', role: 'viewer' }], {
      logger: (ctx) => calls.push(ctx),
    });

    permit.trace({ id: 'u1', roles: ['viewer'] }, 'posts', 'read');

    expect(calls).toHaveLength(0);
  });

  it('does not fire the logger when trace finds no candidates', () => {
    const calls: WardLoggerContext[] = [];

    const permit = createWard<'read'>([{ action: 'read', effect: 'allow', resource: 'posts', role: 'viewer' }], {
      logger: (ctx) => calls.push(ctx),
    });

    permit.trace({ id: 'u1', roles: ['editor'] }, 'posts', 'read');

    expect(calls).toHaveLength(0);
  });

  it('candidate index matches rule position in the input array', () => {
    const rules = [
      { action: 'read' as const, effect: 'allow' as const, resource: 'posts', role: 'viewer' },
      { action: 'read' as const, effect: 'deny' as const, priority: 10, resource: 'posts', role: 'viewer' },
    ];

    const permit = createWard(rules);
    const { candidates } = permit.trace({ id: 'u1', roles: ['viewer'] }, 'posts', 'read');

    expect(candidates).toHaveLength(2);
    expect(candidates[0].index).toBe(0);
    expect(candidates[0].rule).toBe(candidates.find((c) => c.index === 0)?.rule);
    expect(candidates[1].index).toBe(1);
    expect(candidates.find((c) => c.won)?.index).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Conflict detection — predicate-gated rules
// ---------------------------------------------------------------------------

describe('ward: detectConflicts — predicate-gated rules', () => {
  it('does not flag two rules with the same (role, resource, action) as duplicate when either has a when predicate', () => {
    const permit = createWard<'update', { authorId: string }>([
      // Rule 0: allow update only for owners
      {
        action: 'update',
        effect: 'allow',
        resource: 'posts',
        role: ['editor'],
        when: ({ data, principal }) => data?.authorId === principal.id,
      },
      // Rule 1: deny update with a different predicate — semantically independent
      {
        action: 'update',
        effect: 'deny',
        resource: 'posts',
        role: ['editor'],
        when: ({ principal }) => principal.attributes?.suspended === true,
      },
    ]);

    expect(permit.detectConflicts()).toHaveLength(0);
  });

  it('does not flag a rule with a predicate against a predicate-free rule as duplicate', () => {
    const permit = createWard<'read'>([
      { action: 'read', effect: 'allow', resource: 'posts', role: ['viewer'] },
      { action: 'read', effect: 'deny', resource: 'posts', role: ['viewer'], when: () => true },
    ]);

    // Not flagged as duplicate — the second rule is predicate-gated
    const conflicts = permit.detectConflicts();

    expect(conflicts.every((c) => c.kind !== 'duplicate')).toBe(true);
  });

  it('still flags two predicate-free duplicate rules as duplicate', () => {
    const permit = createWard([
      { action: 'read', effect: 'allow', resource: 'posts', role: ['viewer'] },
      { action: 'read', effect: 'deny', resource: 'posts', role: ['viewer'] },
    ]);

    const conflicts = permit.detectConflicts();

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].kind).toBe('duplicate');
  });
});

// ---------------------------------------------------------------------------
// Conflict detection — maxConflicts option
// ---------------------------------------------------------------------------

describe('ward: detectConflicts — maxConflicts option', () => {
  it('limits the number of conflicts returned when maxConflicts is set', () => {
    const permit = createWard(
      [
        { action: 'read', effect: 'allow', resource: 'posts', role: ['viewer'] },
        { action: 'read', effect: 'deny', resource: 'posts', role: ['viewer'] },
        { action: 'update', effect: 'allow', resource: 'posts', role: ['editor'] },
        { action: 'update', effect: 'deny', resource: 'posts', role: ['editor'] },
      ],
      { maxConflicts: 1 },
    );

    expect(permit.detectConflicts()).toHaveLength(1);
  });

  it('returns all conflicts when maxConflicts exceeds the actual count', () => {
    const permit = createWard(
      [
        { action: 'read', effect: 'allow', resource: 'posts', role: ['viewer'] },
        { action: 'read', effect: 'deny', resource: 'posts', role: ['viewer'] },
      ],
      { maxConflicts: 100 },
    );

    expect(permit.detectConflicts()).toHaveLength(1);
  });

  it('returns empty array when maxConflicts is 0 (detection disabled)', () => {
    const permit = createWard(
      [
        { action: 'read', effect: 'allow', resource: 'posts', role: ['viewer'] },
        { action: 'read', effect: 'deny', resource: 'posts', role: ['viewer'] },
      ],
      { maxConflicts: 0 },
    );

    expect(permit.detectConflicts()).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Predicate throws non-Error value
// ---------------------------------------------------------------------------

describe('ward: predicate throws non-Error value', () => {
  it('wraps non-Error thrown values in an Error with String(err)', () => {
    const permit = createWard<'read'>([
      {
        action: 'read',
        effect: 'allow',
        resource: 'posts',
        role: ['editor'],
        when: () => {
          throw 'not-an-error-object';
        },
      },
    ]);

    expect(() => permit.explain({ id: 'u1', roles: ['editor'] }, 'posts', 'read', undefined)).toThrow(
      '[ward] Rule[0] threw: not-an-error-object',
    );
  });

  it('wraps numeric thrown values in an Error with String(err)', () => {
    const permit = createWard<'read'>([
      {
        action: 'read',
        effect: 'allow',
        resource: 'posts',
        role: ['editor'],
        when: () => {
          throw 42;
        },
      },
    ]);

    expect(() => permit.explain({ id: 'u1', roles: ['editor'] }, 'posts', 'read', undefined)).toThrow(
      '[ward] Rule[0] threw: 42',
    );
  });
});

// ---------------------------------------------------------------------------
// BoundWard empty array short-circuit
// ---------------------------------------------------------------------------

describe('ward: BoundWard empty array short-circuit', () => {
  it('checkAll returns empty array for empty checks on BoundWard', () => {
    const permit = createWard<'read'>([{ action: 'read', effect: 'allow', resource: 'posts', role: ['viewer'] }]);
    const bound = permit.forUser({ id: 'u1', roles: ['viewer'] });

    expect(bound.checkAll([])).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// WILDCARD role does not cover ANONYMOUS in conflict detection
// ---------------------------------------------------------------------------

describe('ward: WILDCARD role does not cover ANONYMOUS in conflict/shadowed detection', () => {
  it('WILDCARD-role rule does not shadow an ANONYMOUS-role rule', () => {
    const permit = createWard([
      // Rule 0: allows all authenticated — WILDCARD does not cover ANONYMOUS
      { action: 'read', effect: 'allow', priority: 10, resource: 'posts', role: WILDCARD },
      // Rule 1: specifically for anonymous — should NOT be flagged as shadowed
      { action: 'read', effect: 'deny', priority: 0, resource: 'posts', role: ANONYMOUS },
    ]);

    const conflicts = permit.detectConflicts();

    // WILDCARD covers authenticated principals; ANONYMOUS covers unauthenticated.
    // They are disjoint — no shadowing.
    expect(conflicts).toHaveLength(0);
  });

  it('anonymous rule matches null principal; wildcard rule does not', () => {
    const permit = createWard([
      { action: 'read', effect: 'allow', resource: 'posts', role: WILDCARD },
      { action: 'read', effect: 'deny', priority: 10, resource: 'posts', role: ANONYMOUS },
    ]);

    // null principal — only ANONYMOUS rule applies (deny wins)
    expect(can(permit, null, 'posts', 'read')).toBe(false);
    // authenticated — only WILDCARD rule applies (allow wins)
    expect(can(permit, { id: 'u1', roles: ['viewer'] }, 'posts', 'read')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Absolute tie: first-in-array wins
// ---------------------------------------------------------------------------

describe('ward: first-in-array wins on absolute tie', () => {
  it('first rule declared wins when priority, specificity, and effect are identical', () => {
    const permit = createWard([
      // Both same role, resource, action, effect=allow, priority=0, specificity=3 (all exact)
      { action: 'read', effect: 'allow', resource: 'posts', role: ['viewer'] },
      { action: 'read', effect: 'allow', resource: 'posts', role: ['viewer'] },
    ]);

    // Will be flagged as duplicate — but the first one wins the decision
    const decision = permit.explain({ id: 'u1', roles: ['viewer'] }, 'posts', 'read');

    expect(decision.allowed).toBe(true);

    if (decision.allowed) {
      // The winning rule is the first declared (index 0)
      const conflicts = permit.detectConflicts();

      expect(conflicts).toHaveLength(1);

      if (conflicts[0].kind === 'duplicate') {
        expect(conflicts[0].indexA).toBe(0);
        expect(conflicts[0].indexB).toBe(1);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// BoundWard canAll/canAny with predicate data
// ---------------------------------------------------------------------------

describe('ward: BoundWard checkAll with predicate data', () => {
  it('checkAll on BoundWard evaluates data-gated rules', () => {
    const permit = createWard<'read' | 'update', { authorId: string }>([
      { action: 'read', effect: 'allow', resource: 'posts', role: ['editor'] },
      { action: 'update', effect: 'allow', resource: 'posts', role: ['editor'], when: owns('authorId') },
    ]);

    const bound = permit.forUser({ id: 'u1', roles: ['editor'] });

    const resultsOwn = bound.checkAll([
      { action: 'read', data: { authorId: 'u1' }, resource: 'posts' },
      { action: 'update', data: { authorId: 'u1' }, resource: 'posts' },
    ]);
    const resultsOther = bound.checkAll([
      { action: 'read', data: { authorId: 'u2' }, resource: 'posts' },
      { action: 'update', data: { authorId: 'u2' }, resource: 'posts' },
    ]);

    expect(resultsOwn.every((d) => d.allowed)).toBe(true);
    expect(resultsOther.every((d) => d.allowed)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// allowedActions — wildcard-action rules + predicate interaction
// ---------------------------------------------------------------------------

describe('ward: allowedActions', () => {
  it('resolves wildcard-action rules via knownActions', () => {
    const permit = createWard<'read' | 'update' | 'delete'>([
      { action: WILDCARD, effect: 'allow', resource: 'posts', role: ['editor'] },
      { action: 'delete', effect: 'deny', resource: 'posts', role: ['editor'] },
    ]);

    const allowed = permit.allowedActions({ id: 'u1', roles: ['editor'] }, 'posts', ['read', 'update', 'delete']);

    expect(allowed).toEqual(['read', 'update']);
  });

  it('includes predicate-gated actions when data satisfies the predicate', () => {
    const permit = createWard<'read' | 'update', { authorId: string }>([
      { action: 'read', effect: 'allow', resource: 'posts', role: ['editor'] },
      { action: 'update', effect: 'allow', resource: 'posts', role: ['editor'], when: owns('authorId') },
    ]);

    const allowed = permit.allowedActions({ id: 'u1', roles: ['editor'] }, 'posts', ['read', 'update'], {
      authorId: 'u1',
    });

    expect(allowed).toContain('read');
    expect(allowed).toContain('update');
  });

  it('excludes predicate-gated actions when predicate fails', () => {
    const permit = createWard<'read' | 'update', { authorId: string }>([
      { action: 'read', effect: 'allow', resource: 'posts', role: ['editor'] },
      { action: 'update', effect: 'allow', resource: 'posts', role: ['editor'], when: owns('authorId') },
    ]);

    const allowed = permit.allowedActions({ id: 'u1', roles: ['editor'] }, 'posts', ['read', 'update'], {
      authorId: 'u2',
    });

    expect(allowed).toEqual(['read']);
  });
});

// ---------------------------------------------------------------------------
// rulesInScope — predicate skipPredicate behaviour
// ---------------------------------------------------------------------------

describe('ward: rulesInScope predicate interaction', () => {
  it('includes predicate-gated rules when data is omitted (skipPredicate)', () => {
    const permit = createWard<'update', { authorId: string }>([
      { action: 'update', effect: 'allow', resource: 'posts', role: ['editor'], when: owns('authorId') },
    ]);

    const rules = permit.rulesInScope({ id: 'u1', roles: ['editor'] }, 'posts');

    expect(rules).toHaveLength(1);
  });

  it('evaluates predicates when data is provided — excludes non-matching', () => {
    const permit = createWard<'update', { authorId: string }>([
      { action: 'update', effect: 'allow', resource: 'posts', role: ['editor'], when: owns('authorId') },
    ]);

    const match = permit.rulesInScope({ id: 'u1', roles: ['editor'] }, 'posts', { authorId: 'u1' });
    const noMatch = permit.rulesInScope({ id: 'u1', roles: ['editor'] }, 'posts', { authorId: 'u2' });

    expect(match).toHaveLength(1);
    expect(noMatch).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// checkAll — empty array short-circuit
// ---------------------------------------------------------------------------

describe('ward: checkAll empty array', () => {
  it('returns empty array without validating principal for empty checks', () => {
    const permit = createWard<'read'>([{ action: 'read', effect: 'allow', resource: 'posts', role: ['viewer'] }]);

    expect(permit.checkAll({ id: '' as any, roles: [] }, [])).toEqual([]);
  });

  it('each result carries action and resource from the originating check', () => {
    const permit = createWard<'read' | 'delete'>([
      { action: 'read', effect: 'allow', resource: 'posts', role: ['viewer'] },
    ]);

    const results = permit.checkAll({ id: 'u1', roles: ['viewer'] }, [
      { action: 'read', resource: 'posts' },
      { action: 'delete', resource: 'posts' },
    ]);

    expect(results[0]).toMatchObject({ action: 'read', allowed: true, resource: 'posts' });
    expect(results[1]).toMatchObject({ action: 'delete', allowed: false, resource: 'posts' });
  });
});

// ---------------------------------------------------------------------------
// trace — zero matching rules
// ---------------------------------------------------------------------------

describe('ward: trace with zero matching rules', () => {
  it('returns empty candidates and no-matching-rule decision when nothing matches', () => {
    const permit = createWard<'read'>([{ action: 'read', effect: 'allow', resource: 'posts', role: ['viewer'] }]);

    const result = permit.trace({ id: 'u1', roles: ['admin'] }, 'posts', 'read');

    expect(result.candidates).toHaveLength(0);
    expect(result.decision).toEqual({ allowed: false, reason: 'no-matching-rule' });
  });

  it('returns all matching candidates with won flag', () => {
    const permit = createWard<'read'>([
      { action: 'read', effect: 'allow', resource: 'posts', role: ['viewer'] },
      { action: 'read', effect: 'deny', priority: 1, resource: 'posts', role: ['viewer'] },
    ]);

    const result = permit.trace({ id: 'u1', roles: ['viewer'] }, 'posts', 'read');

    expect(result.candidates).toHaveLength(2);

    const winner = result.candidates.find((c) => c.won);

    expect(winner?.rule.effect).toBe('deny');
    expect(result.decision.allowed).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// forUser — snapshot isolation
// ---------------------------------------------------------------------------

describe('ward: forUser snapshot isolation', () => {
  it('mutating the original principal after forUser does not affect the bound view', () => {
    const permit = createWard<'read'>([{ action: 'read', effect: 'allow', resource: 'posts', role: ['viewer'] }]);

    const principal = { id: 'u1', roles: ['viewer'] };
    const bound = permit.forUser(principal);

    expect(bound.explain('posts', 'read').allowed).toBe(true);

    // Mutate original — bound view should still use snapshot ['viewer']
    (principal.roles as string[]).length = 0;

    expect(bound.explain('posts', 'read').allowed).toBe(true);
  });

  it('mutating principal.attributes after forUser does not affect bound view', () => {
    const permit = createWard<'update', { level: number }>([
      {
        action: 'update',
        effect: 'allow',
        resource: 'posts',
        role: ['editor'],
        when: ({ principal }) => (principal.attributes as { level: number }).level >= 5,
      },
    ]);

    const principal = { attributes: { level: 5 }, id: 'u1', roles: ['editor'] };
    const bound = permit.forUser(principal);

    expect(bound.explain('posts', 'update').allowed).toBe(true);

    // Mutate original attributes — bound snapshot was deep-cloned
    principal.attributes.level = 0;

    expect(bound.explain('posts', 'update').allowed).toBe(true);
  });
});

describe('ward: checkAll logs all actions', () => {
  it('logs a decision for every action in checkAll (no short-circuit)', () => {
    const calls: string[] = [];

    const permit = createWard<'read' | 'update' | 'delete'>(
      [
        { action: 'read', effect: 'allow', resource: 'posts', role: ['viewer'] },
        { action: 'update', effect: 'deny', resource: 'posts', role: ['viewer'] },
        { action: 'delete', effect: 'allow', resource: 'posts', role: ['viewer'] },
      ],
      { logger: (ctx) => calls.push(ctx.action) },
    );

    const results = permit.checkAll({ id: 'u1', roles: ['viewer'] }, [
      { action: 'read', resource: 'posts' },
      { action: 'update', resource: 'posts' },
      { action: 'delete', resource: 'posts' },
    ]);

    expect(results.map((r) => r.allowed)).toEqual([true, false, true]);
    expect(calls).toEqual(['read', 'update', 'delete']);
  });
});

describe('ward: BoundWard.trace() with predicate data', () => {
  it('passes data to the when predicate during a bound trace', () => {
    const permit = createWard<'update', { authorId: string }>([
      {
        action: 'update',
        effect: 'allow',
        resource: 'posts',
        role: ['editor'],
        when: ({ data, principal }) => data?.authorId === principal.id,
      },
    ]);

    const bound = permit.forUser({ id: 'u1', roles: ['editor'] });

    const matchTrace = bound.trace('posts', 'update', { authorId: 'u1' });
    const noMatchTrace = bound.trace('posts', 'update', { authorId: 'u2' });

    expect(matchTrace.decision.allowed).toBe(true);
    expect(matchTrace.candidates).toHaveLength(1);
    expect(noMatchTrace.decision.allowed).toBe(false);
    expect(noMatchTrace.candidates).toHaveLength(0);
  });
});

describe('ward: detectConflicts — strict and onConflict options', () => {
  it('calls onConflict for each conflict and then throws when strict is also set', () => {
    const onConflict = vi.fn();

    expect(() => {
      createWard(
        [
          { action: 'read', effect: 'allow', resource: 'posts', role: ['viewer'] },
          { action: 'read', effect: 'deny', resource: 'posts', role: ['viewer'] },
        ],
        { onConflict, strict: true },
      );
    }).toThrow('[ward]');

    expect(onConflict).toHaveBeenCalledTimes(1);
    expect(onConflict.mock.calls[0][0]).toMatchObject({ kind: 'duplicate' });
  });

  it('calls onConflict without throwing when strict is false', () => {
    const onConflict = vi.fn();

    expect(() => {
      createWard(
        [
          { action: 'read', effect: 'allow', resource: 'posts', role: ['viewer'] },
          { action: 'read', effect: 'deny', resource: 'posts', role: ['viewer'] },
        ],
        { onConflict, strict: false },
      );
    }).not.toThrow();

    expect(onConflict).toHaveBeenCalledTimes(1);
  });
});
