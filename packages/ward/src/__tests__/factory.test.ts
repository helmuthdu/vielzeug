import { vi } from 'vitest';

import type { Principal, Ward, WardAttributes, WardDecision, WardDecisionInput } from '../index';

import { ANONYMOUS, allow, createWard, deny, predicate, WardConditionError, WardConfigError, WILDCARD } from '../index';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const decide = <TAction extends string, TResource extends string, TAttributes extends WardAttributes = WardAttributes>(
  ward: Ward<TAction, TResource, TAttributes>,
  input: WardDecisionInput<TAction, TResource, TAttributes>,
): WardDecision<TAction, TResource, TAttributes> => ward.decide(input);

const allowed = <TAction extends string, TResource extends string, TAttributes extends WardAttributes = WardAttributes>(
  ward: Ward<TAction, TResource, TAttributes>,
  input: WardDecisionInput<TAction, TResource, TAttributes>,
): boolean => ward.decide(input).effect === 'allow';

const user = (id: string, roles: readonly string[], attributes?: WardAttributes): Principal => ({
  attributes,
  id,
  roles,
});

describe('rule helpers', () => {
  it('builds concise allow and deny rules with reusable predicates', () => {
    const ward = createWard([
      deny('blocked', 'posts', ['read']),
      allow(WILDCARD, 'posts', ['read']),
      allow('editor', 'posts', ['update'], { when: predicate.owns('ownerId') }),
    ]);

    expect(allowed(ward, { action: 'read', principal: user('1', ['blocked']), resource: 'posts' })).toBe(false);
    expect(allowed(ward, { action: 'read', principal: user('2', ['viewer']), resource: 'posts' })).toBe(true);
    expect(
      allowed(ward, {
        action: 'update',
        attributes: { ownerId: '3' },
        principal: user('3', ['editor']),
        resource: 'posts',
      }),
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Core decision model
// ---------------------------------------------------------------------------

describe('ward: core decision model', () => {
  it('denies when no rules match (default deny)', () => {
    const ward = createWard();

    expect(allowed(ward, { action: 'read', principal: user('u1', ['admin']), resource: 'posts' })).toBe(false);
  });

  it('matches action and resource exactly', () => {
    const ward = createWard([{ action: 'read', effect: 'allow', resource: 'posts' }]);

    expect(allowed(ward, { action: 'read', principal: user('u1', ['admin']), resource: 'posts' })).toBe(true);
    expect(allowed(ward, { action: 'write', principal: user('u1', ['admin']), resource: 'posts' })).toBe(false);
    expect(allowed(ward, { action: 'read', principal: user('u1', ['admin']), resource: 'comments' })).toBe(false);
  });

  it('is case-sensitive', () => {
    const ward = createWard([{ action: 'read', effect: 'allow', resource: 'posts' }]);

    expect(allowed(ward, { action: 'READ' as any, principal: user('u1', ['admin']), resource: 'posts' })).toBe(false);
    expect(allowed(ward, { action: 'read', principal: user('u1', ['admin']), resource: 'POSTS' })).toBe(false);
  });

  it('supports wildcard action and resource', () => {
    const ward = createWard([{ action: WILDCARD, effect: 'allow', resource: WILDCARD }]);

    expect(allowed(ward, { action: 'read', principal: user('u1', ['member']), resource: 'posts' })).toBe(true);
    expect(allowed(ward, { action: 'delete', principal: user('u1', ['member']), resource: 'anything:1' })).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Ordered first-match semantics
// ---------------------------------------------------------------------------

describe('ward: ordered first-match', () => {
  it('returns the first matching rule', () => {
    const ward = createWard([
      { action: 'read', effect: 'deny', resource: 'posts' },
      { action: 'read', effect: 'allow', resource: 'posts' },
    ]);

    const decision = decide(ward, { action: 'read', principal: user('u1', ['admin']), resource: 'posts' });

    expect(decision.effect).toBe('deny');
    expect(decision.rule?.effect).toBe('deny');
  });

  it('first match wins regardless of specificity', () => {
    // A broad wildcard allow before a narrow deny — first match wins.
    const ward = createWard([
      { action: WILDCARD, effect: 'allow', resource: WILDCARD },
      { action: 'read', effect: 'deny', resource: 'posts' },
    ]);

    expect(allowed(ward, { action: 'read', principal: user('u1', ['admin']), resource: 'posts' })).toBe(true);
  });

  it('a narrow deny before a broad allow — first match wins', () => {
    const ward = createWard([
      { action: 'read', effect: 'deny', resource: 'posts' },
      { action: WILDCARD, effect: 'allow', resource: WILDCARD },
    ]);

    expect(allowed(ward, { action: 'read', principal: user('u1', ['admin']), resource: 'posts' })).toBe(false);
    expect(allowed(ward, { action: 'write', principal: user('u1', ['admin']), resource: 'posts' })).toBe(true);
  });

  it('falls through to later rules when earlier rules do not match', () => {
    const ward = createWard([
      { action: 'delete', effect: 'deny', resource: 'posts' },
      { action: 'read', effect: 'allow', resource: 'posts' },
    ]);

    expect(allowed(ward, { action: 'read', principal: user('u1', ['admin']), resource: 'posts' })).toBe(true);
  });

  it('default deny when no rule matches', () => {
    const ward = createWard([{ action: 'read', effect: 'allow', resource: 'posts' }]);

    const decision = decide(ward, { action: 'delete', principal: user('u1', ['admin']), resource: 'posts' });

    expect(decision.effect).toBe('deny');
    expect(decision.rule).toBeUndefined();
    expect(decision.reason).toContain('no matching rule');
  });
});

// ---------------------------------------------------------------------------
// Decision output shape
// ---------------------------------------------------------------------------

describe('ward: decision output', () => {
  it('returns effect, reason, and rule on allow', () => {
    const rule = { action: 'read' as const, effect: 'allow' as const, resource: 'posts' };
    const ward = createWard([rule]);

    const decision = decide(ward, { action: 'read', principal: user('u1', ['viewer']), resource: 'posts' });

    expect(decision.effect).toBe('allow');
    expect(decision.rule).toStrictEqual(rule);
    expect(decision.reason).toContain('rule[0]');
    expect(decision.reason).toContain('allows');
  });

  it('returns effect, reason, and rule on explicit deny', () => {
    const rule = { action: 'read' as const, effect: 'deny' as const, resource: 'posts' };
    const ward = createWard([rule]);

    const decision = decide(ward, { action: 'read', principal: user('u1', ['viewer']), resource: 'posts' });

    expect(decision.effect).toBe('deny');
    expect(decision.rule).toStrictEqual(rule);
    expect(decision.reason).toContain('rule[0]');
    expect(decision.reason).toContain('denies');
  });

  it('returns no rule on default deny', () => {
    const ward = createWard();

    const decision = decide(ward, { action: 'read', principal: user('u1', ['viewer']), resource: 'posts' });

    expect(decision.effect).toBe('deny');
    expect(decision.rule).toBeUndefined();
    expect(typeof decision.reason).toBe('string');
  });

  it('includes the action and resource in the reason', () => {
    const ward = createWard([{ action: 'read', effect: 'allow', resource: 'posts' }]);

    const decision = decide(ward, { action: 'read', principal: user('u1', ['viewer']), resource: 'posts' });

    expect(decision.reason).toContain("'read'");
    expect(decision.reason).toContain("'posts'");
  });
});

// ---------------------------------------------------------------------------
// rules property
// ---------------------------------------------------------------------------

describe('ward: rules property', () => {
  it('exposes the authored rules in order', () => {
    const rules = [
      { action: 'read' as const, effect: 'allow' as const, resource: 'posts' },
      { action: 'delete' as const, effect: 'deny' as const, resource: 'posts' },
    ];
    const ward = createWard(rules);

    expect(ward.rules).toHaveLength(2);
    expect(ward.rules[0]).toStrictEqual(rules[0]);
    expect(ward.rules[1]).toStrictEqual(rules[1]);
  });

  it('returns an empty array when no rules are provided', () => {
    const ward = createWard();

    expect(ward.rules).toHaveLength(0);
  });

  it('rules array is frozen', () => {
    const ward = createWard([{ action: 'read', effect: 'allow', resource: 'posts' }]);

    expect(Object.isFrozen(ward.rules)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Declarative attribute conditions
// ---------------------------------------------------------------------------

describe('ward: declarative attribute conditions', () => {
  it('matches when all declared attributes are present and equal', () => {
    const ward = createWard([
      { action: 'read', attributes: { tier: 'premium' }, effect: 'allow', resource: 'content' },
    ]);

    expect(
      allowed(ward, {
        action: 'read',
        attributes: { region: 'eu', tier: 'premium' },
        principal: user('u1', ['user']),
        resource: 'content',
      }),
    ).toBe(true);
  });

  it('denies when a declared attribute is missing', () => {
    const ward = createWard([
      { action: 'read', attributes: { tier: 'premium' }, effect: 'allow', resource: 'content' },
    ]);

    expect(
      allowed(ward, {
        action: 'read',
        attributes: { region: 'eu' },
        principal: user('u1', ['user']),
        resource: 'content',
      }),
    ).toBe(false);
  });

  it('denies when a declared attribute value differs', () => {
    const ward = createWard([
      { action: 'read', attributes: { tier: 'premium' }, effect: 'allow', resource: 'content' },
    ]);

    expect(
      allowed(ward, {
        action: 'read',
        attributes: { tier: 'free' },
        principal: user('u1', ['user']),
        resource: 'content',
      }),
    ).toBe(false);
  });

  it('denies when the request has no attributes but the rule requires them', () => {
    const ward = createWard([
      { action: 'read', attributes: { tier: 'premium' }, effect: 'allow', resource: 'content' },
    ]);

    expect(allowed(ward, { action: 'read', principal: user('u1', ['user']), resource: 'content' })).toBe(false);
  });

  it('matches when the rule has no attributes regardless of request attributes', () => {
    const ward = createWard([{ action: 'read', effect: 'allow', resource: 'content' }]);

    expect(
      allowed(ward, {
        action: 'read',
        attributes: { anything: true },
        principal: user('u1', ['user']),
        resource: 'content',
      }),
    ).toBe(true);
    expect(allowed(ward, { action: 'read', principal: user('u1', ['user']), resource: 'content' })).toBe(true);
  });

  it('supports deep equality for object attribute values', () => {
    const ward = createWard([
      { action: 'read', attributes: { scope: { org: 'acme' } }, effect: 'allow', resource: 'content' },
    ]);

    expect(
      allowed(ward, {
        action: 'read',
        attributes: { scope: { org: 'acme' } },
        principal: user('u1', ['user']),
        resource: 'content',
      }),
    ).toBe(true);
    expect(
      allowed(ward, {
        action: 'read',
        attributes: { scope: { org: 'other' } },
        principal: user('u1', ['user']),
        resource: 'content',
      }),
    ).toBe(false);
  });

  it('supports multiple declarative attributes (all must match)', () => {
    const ward = createWard([
      { action: 'read', attributes: { region: 'eu', tier: 'premium' }, effect: 'allow', resource: 'content' },
    ]);

    expect(
      allowed(ward, {
        action: 'read',
        attributes: { region: 'eu', tier: 'premium' },
        principal: user('u1', ['user']),
        resource: 'content',
      }),
    ).toBe(true);
    expect(
      allowed(ward, {
        action: 'read',
        attributes: { region: 'eu', tier: 'free' },
        principal: user('u1', ['user']),
        resource: 'content',
      }),
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Condition escape hatch
// ---------------------------------------------------------------------------

describe('ward: condition escape hatch', () => {
  it('calls the condition callback with principal and attributes', () => {
    const condition = vi.fn(() => true);
    const ward = createWard([{ action: 'read', condition, effect: 'allow', resource: 'posts' }]);

    const principal = user('u1', ['editor'], { tier: 'premium' });

    expect(allowed(ward, { action: 'read', attributes: { foo: 'bar' }, principal, resource: 'posts' })).toBe(true);
    expect(condition).toHaveBeenCalledWith({ attributes: { foo: 'bar' }, principal });
  });

  it('denies when the condition returns false', () => {
    const ward = createWard([{ action: 'read', condition: () => false, effect: 'allow', resource: 'posts' }]);

    expect(allowed(ward, { action: 'read', principal: user('u1', ['editor']), resource: 'posts' })).toBe(false);
  });

  it('allows when the condition returns true', () => {
    const ward = createWard([{ action: 'read', condition: () => true, effect: 'allow', resource: 'posts' }]);

    expect(allowed(ward, { action: 'read', principal: user('u1', ['editor']), resource: 'posts' })).toBe(true);
  });

  it('can check roles via the condition callback', () => {
    const ward = createWard([
      {
        action: 'read',
        condition: ({ principal }) =>
          principal !== null && principal !== undefined && principal.roles.includes('admin'),
        effect: 'allow',
        resource: 'posts',
      },
    ]);

    expect(allowed(ward, { action: 'read', principal: user('u1', ['admin']), resource: 'posts' })).toBe(true);
    expect(allowed(ward, { action: 'read', principal: user('u2', ['viewer']), resource: 'posts' })).toBe(false);
    expect(allowed(ward, { action: 'read', resource: 'posts' })).toBe(false);
  });

  it('can express ownership checks via the condition callback', () => {
    const ward = createWard<'update'>([
      {
        action: 'update',
        condition: ({ principal, attributes }) =>
          principal !== null && principal !== undefined && attributes?.authorId === principal.id,
        effect: 'allow',
        resource: 'posts',
      },
    ]);

    expect(
      allowed(ward, {
        action: 'update',
        attributes: { authorId: 'u1' },
        principal: user('u1', ['editor']),
        resource: 'posts',
      }),
    ).toBe(true);
    expect(
      allowed(ward, {
        action: 'update',
        attributes: { authorId: 'u2' },
        principal: user('u1', ['editor']),
        resource: 'posts',
      }),
    ).toBe(false);
  });

  it('combines declarative attributes with a condition callback', () => {
    const ward = createWard([
      {
        action: 'read',
        attributes: { tier: 'premium' },
        condition: ({ principal }) =>
          principal !== null && principal !== undefined && principal.roles.includes('editor'),
        effect: 'allow',
        resource: 'posts',
      },
    ]);

    expect(
      allowed(ward, {
        action: 'read',
        attributes: { tier: 'premium' },
        principal: user('u1', ['editor']),
        resource: 'posts',
      }),
    ).toBe(true);
    expect(
      allowed(ward, {
        action: 'read',
        attributes: { tier: 'free' },
        principal: user('u1', ['editor']),
        resource: 'posts',
      }),
    ).toBe(false);
    expect(
      allowed(ward, {
        action: 'read',
        attributes: { tier: 'premium' },
        principal: user('u2', ['viewer']),
        resource: 'posts',
      }),
    ).toBe(false);
  });

  it('rejects a non-boolean condition result', () => {
    const ward = createWard([
      { action: 'read', condition: (() => 'yes') as unknown as () => boolean, effect: 'allow', resource: 'posts' },
    ]);

    expect(() => ward.decide({ action: 'read', principal: user('u1', ['editor']), resource: 'posts' })).toThrow(
      WardConditionError,
    );
  });
});

// ---------------------------------------------------------------------------
// ANONYMOUS principal
// ---------------------------------------------------------------------------

describe('ward: anonymous / null principal', () => {
  it('matches rules when no principal is provided', () => {
    const ward = createWard([{ action: 'read', effect: 'allow', resource: 'posts' }]);

    expect(allowed(ward, { action: 'read', resource: 'posts' })).toBe(true);
  });

  it('matches rules when principal is null', () => {
    const ward = createWard([{ action: 'read', effect: 'allow', resource: 'posts' }]);

    expect(allowed(ward, { action: 'read', principal: null, resource: 'posts' })).toBe(true);
  });

  it('can gate access on authenticated principal via condition', () => {
    const ward = createWard([
      {
        action: 'read',
        condition: ({ principal }) => principal !== null && principal !== undefined,
        effect: 'allow',
        resource: 'posts',
      },
    ]);

    expect(allowed(ward, { action: 'read', principal: user('u1', ['viewer']), resource: 'posts' })).toBe(true);
    expect(allowed(ward, { action: 'read', principal: null, resource: 'posts' })).toBe(false);
    expect(allowed(ward, { action: 'read', resource: 'posts' })).toBe(false);
  });

  it('ANONYMOUS constant is exported and usable in conditions', () => {
    expect(ANONYMOUS).toBe('anonymous');

    const ward = createWard([
      {
        action: 'read',
        condition: ({ principal }) => principal === null || principal === undefined,
        effect: 'allow',
        resource: 'public-posts',
      },
    ]);

    expect(allowed(ward, { action: 'read', principal: null, resource: 'public-posts' })).toBe(true);
    expect(allowed(ward, { action: 'read', principal: user('u1', ['viewer']), resource: 'public-posts' })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Hierarchical resource / action patterns
// ---------------------------------------------------------------------------

describe('ward: hierarchical patterns in rules', () => {
  it('namespace-wildcard resource matches concrete IDs', () => {
    const ward = createWard([{ action: 'read', effect: 'allow', resource: 'posts:*' }]);

    expect(allowed(ward, { action: 'read', principal: user('u1', ['viewer']), resource: 'posts:123' })).toBe(true);
    expect(allowed(ward, { action: 'read', principal: user('u1', ['viewer']), resource: 'posts:draft:1' })).toBe(true);
    expect(allowed(ward, { action: 'read', principal: user('u1', ['viewer']), resource: 'comments:1' })).toBe(false);
  });

  it('exact resource does not match namespace children', () => {
    const ward = createWard([{ action: 'read', effect: 'allow', resource: 'posts' }]);

    expect(allowed(ward, { action: 'read', principal: user('u1', ['viewer']), resource: 'posts' })).toBe(true);
    expect(allowed(ward, { action: 'read', principal: user('u1', ['viewer']), resource: 'posts:123' })).toBe(false);
  });

  it('namespace-wildcard action matches sub-actions', () => {
    const ward = createWard<'read:own' | 'read:all' | 'write:all'>([
      { action: 'read:*', effect: 'allow', resource: 'posts' },
    ]);

    expect(allowed(ward, { action: 'read:own', principal: user('u1', ['viewer']), resource: 'posts' })).toBe(true);
    expect(allowed(ward, { action: 'read:all', principal: user('u1', ['viewer']), resource: 'posts' })).toBe(true);
    expect(allowed(ward, { action: 'write:all', principal: user('u1', ['viewer']), resource: 'posts' })).toBe(false);
  });

  it('ordered first-match with namespace wildcards', () => {
    const ward = createWard([
      { action: 'read', effect: 'deny', resource: 'posts:secret' },
      { action: 'read', effect: 'allow', resource: 'posts:*' },
    ]);

    expect(allowed(ward, { action: 'read', principal: user('u1', ['viewer']), resource: 'posts:123' })).toBe(true);
    expect(allowed(ward, { action: 'read', principal: user('u1', ['viewer']), resource: 'posts:secret' })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

describe('ward: validation', () => {
  it('throws when action is not a non-empty string', () => {
    expect(() => createWard([{ action: '' as any, effect: 'allow', resource: 'posts' }])).toThrow('Rule[0].action');
    expect(() => createWard([{ action: '  ' as any, effect: 'allow', resource: 'posts' }])).toThrow('Rule[0].action');
  });

  it('throws when resource is not a non-empty string', () => {
    expect(() => createWard([{ action: 'read', effect: 'allow', resource: '' }])).toThrow('Rule[0].resource');
  });

  it('throws when effect is invalid', () => {
    expect(() => createWard([{ action: 'read', effect: 'grant' as any, resource: 'posts' }])).toThrow(
      'Rule[0].effect must be "allow" or "deny"',
    );
  });

  it('throws when condition is not a function', () => {
    expect(() => createWard([{ action: 'read', condition: 'bad' as any, effect: 'allow', resource: 'posts' }])).toThrow(
      'Rule[0].condition must be a function',
    );
  });

  it('throws when attributes is not a plain object', () => {
    expect(() =>
      createWard([{ action: 'read', attributes: 'bad' as any, effect: 'allow', resource: 'posts' }]),
    ).toThrow('Rule[0].attributes must be a plain object');
    expect(() => createWard([{ action: 'read', attributes: null as any, effect: 'allow', resource: 'posts' }])).toThrow(
      'Rule[0].attributes must be a plain object',
    );
    expect(() => createWard([{ action: 'read', attributes: [1] as any, effect: 'allow', resource: 'posts' }])).toThrow(
      'Rule[0].attributes must be a plain object',
    );
  });

  it('throws when action ends with a trailing colon', () => {
    expect(() => createWard([{ action: 'read:', effect: 'allow', resource: 'posts' }])).toThrow(
      "did you mean 'read:*'",
    );
  });

  it('throws when resource ends with a trailing colon', () => {
    expect(() => createWard([{ action: 'read', effect: 'allow', resource: 'posts:' }])).toThrow(
      "did you mean 'posts:*'",
    );
  });

  it('includes the rule index in validation error messages', () => {
    expect(() =>
      createWard([
        { action: 'read', effect: 'allow', resource: 'posts' },
        { action: 'read', effect: 'allow', resource: 'posts' },
        { action: 'read', effect: 'grant' as any, resource: 'posts' },
      ]),
    ).toThrow('Rule[2].effect');
  });

  it('throws for an invalid principal at decide time', () => {
    const ward = createWard([{ action: 'read', effect: 'allow', resource: 'posts' }]);

    expect(() => ward.decide({ action: 'read', principal: { id: '' } as any, resource: 'posts' })).toThrow(
      'Invalid principal',
    );
    expect(() => ward.decide({ action: 'read', principal: { roles: ['admin'] } as any, resource: 'posts' })).toThrow(
      'Invalid principal',
    );
    expect(() => ward.decide({ action: 'read', principal: { id: 'u1', roles: ['   '] }, resource: 'posts' })).toThrow(
      'roles must be an array of non-empty strings',
    );
  });

  it('accepts null and undefined principals without throwing', () => {
    const ward = createWard([{ action: 'read', effect: 'allow', resource: 'posts' }]);

    expect(() => ward.decide({ action: 'read', principal: null, resource: 'posts' })).not.toThrow();
    expect(() => ward.decide({ action: 'read', resource: 'posts' })).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// createWard with no arguments
// ---------------------------------------------------------------------------

describe('ward: createWard defaults', () => {
  it('defaults to an empty rule set', () => {
    const ward = createWard();

    expect(ward.rules).toHaveLength(0);
    expect(ward.decide({ action: 'read', resource: 'posts' }).effect).toBe('deny');
  });
});

describe('ward: immutable policy snapshots', () => {
  it('does not change when authored rules or attributes mutate', () => {
    const rule = {
      action: 'read' as const,
      attributes: { scope: { team: 'alpha' } },
      effect: 'allow' as 'allow' | 'deny',
      resource: 'posts' as const,
    };
    const ward = createWard([rule]);

    rule.effect = 'deny';
    rule.attributes.scope.team = 'beta';

    expect(ward.decide({ action: 'read', attributes: { scope: { team: 'alpha' } }, resource: 'posts' }).effect).toBe(
      'allow',
    );
    expect(Object.isFrozen(ward.rules[0])).toBe(true);
    expect(Object.isFrozen(ward.rules[0].attributes?.scope)).toBe(true);
  });

  it('does not change when a helper role array mutates', () => {
    const roles = ['editor'];
    const ward = createWard([allow(roles, 'posts', ['read'])]);

    roles.splice(0, 1, 'viewer');

    expect(ward.decide({ action: 'read', principal: user('u1', ['editor']), resource: 'posts' }).effect).toBe('allow');
    expect(ward.decide({ action: 'read', principal: user('u2', ['viewer']), resource: 'posts' }).effect).toBe('deny');
  });
});

describe('ward: safe attributes', () => {
  it('rejects unsupported object values', () => {
    expect(() =>
      createWard([
        {
          action: 'read',
          attributes: { date: new Date() } as unknown as WardAttributes,
          effect: 'allow',
          resource: 'posts',
        },
      ]),
    ).toThrow(WardConfigError);
  });

  it('rejects circular values', () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;

    expect(() =>
      createWard([
        {
          action: 'read',
          attributes: { circular } as unknown as WardAttributes,
          effect: 'allow',
          resource: 'posts',
        },
      ]),
    ).toThrow('must not contain circular references');
  });

  it('rejects sparse arrays', () => {
    const sparse = new Array(1);

    expect(() =>
      createWard([
        {
          action: 'read',
          attributes: { sparse } as unknown as WardAttributes,
          effect: 'allow',
          resource: 'posts',
        },
      ]),
    ).toThrow('must contain only JSON-compatible values');
  });

  it('reports malformed rule objects as Ward errors', () => {
    expect(() => createWard([null as never])).toThrow(WardConfigError);
  });
});

describe('ward: condition errors', () => {
  it('preserves a thrown condition error as the cause', () => {
    const cause = new Error('boom');
    const ward = createWard([
      {
        action: 'read',
        condition: () => {
          throw cause;
        },
        effect: 'allow',
        resource: 'posts',
      },
    ]);

    try {
      ward.decide({ action: 'read', resource: 'posts' });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(WardConditionError);
      expect((error as WardConditionError).cause).toBe(cause);
      expect((error as WardConditionError).ruleIndex).toBe(0);
    }
  });

  it('rejects async conditions', () => {
    const ward = createWard([
      {
        action: 'read',
        condition: (async () => true) as unknown as () => boolean,
        effect: 'allow',
        resource: 'posts',
      },
    ]);

    expect(() => ward.decide({ action: 'read', resource: 'posts' })).toThrow(WardConditionError);
  });
});

describe('ward: principal normalization', () => {
  it('treats an omitted principal as anonymous', () => {
    const ward = createWard([allow(ANONYMOUS, 'posts', ['read'])]);

    expect(ward.decide({ action: 'read', resource: 'posts' }).effect).toBe('allow');
    expect(ward.decide({ action: 'read', principal: null, resource: 'posts' }).effect).toBe('allow');
  });
});

describe('ward: ergonomic decision APIs', () => {
  it('checks batches and lists allowed actions', () => {
    const ward = createWard<'read' | 'update' | 'delete', 'posts'>([allow('editor', 'posts', ['read', 'update'])]);
    const principal = user('u1', ['editor']);

    expect(
      ward
        .checkAll([
          { action: 'read', principal, resource: 'posts' },
          { action: 'delete', principal, resource: 'posts' },
        ])
        .map((decision) => decision.effect),
    ).toEqual(['allow', 'deny']);
    expect(ward.allowedActions({ knownActions: ['read', 'update', 'delete'], principal, resource: 'posts' })).toEqual([
      'read',
      'update',
    ]);
  });

  it('binds an immutable principal snapshot', () => {
    const principal = { id: 'u1', roles: ['editor'] };
    const bound = createWard<'read' | 'update', 'posts'>([allow('editor', 'posts', ['read'])]).forPrincipal(principal);

    principal.roles[0] = 'viewer';

    expect(bound.decide({ action: 'read', resource: 'posts' }).effect).toBe('allow');
    expect(bound.allowedActions({ knownActions: ['read', 'update'], resource: 'posts' })).toEqual(['read']);
  });

  it('emits typed decisions and supports unsubscribe and abort', () => {
    const ward = createWard([{ action: 'read', effect: 'allow', resource: 'posts' }]);
    const events: string[] = [];
    const controller = new AbortController();
    const stop = ward.tap((event) => events.push(`${event.type}:${event.decision.effect}`), {
      signal: controller.signal,
    });

    ward.tap(() => {
      throw new Error('observer failure');
    });
    ward.decide({ action: 'read', resource: 'posts' });
    controller.abort();
    ward.decide({ action: 'read', resource: 'posts' });
    stop();

    expect(events).toEqual(['decision:allow']);
  });
});

describe('ward: public types', () => {
  it('threads action, resource, and attribute types through decisions', () => {
    type Attributes = { ownerId: string; status: 'draft' | 'published' };
    const ward = createWard<'read' | 'update', 'posts', Attributes>([
      allow<'read' | 'update', 'posts', Attributes>('editor', 'posts', ['update'], {
        when: predicate.owns<Attributes>('ownerId'),
      }),
    ]);
    const decision = ward.decide({
      action: 'update',
      attributes: { ownerId: 'u1', status: 'draft' },
      principal: user('u1', ['editor']),
      resource: 'posts',
    });

    expect(decision.effect).toBe('allow');
  });
});
