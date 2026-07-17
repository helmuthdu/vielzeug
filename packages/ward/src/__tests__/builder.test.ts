import { allow, createWard, deny, owns, predicate, ruleFor, WILDCARD } from '../index';

// ---------------------------------------------------------------------------
// ruleFor factory
// ---------------------------------------------------------------------------

describe('ward: ruleFor factory', () => {
  it('allow produces correct WardRule', () => {
    const rules = ruleFor('allow', 'viewer', 'posts', ['read']);

    expect(rules).toHaveLength(1);
    expect(rules[0]).toEqual({ action: 'read', effect: 'allow', resource: 'posts', role: 'viewer' });
  });

  it('deny produces correct WardRule', () => {
    const rules = ruleFor('deny', 'blocked', 'posts', ['read']);

    expect(rules).toHaveLength(1);
    expect(rules[0]).toEqual({ action: 'read', effect: 'deny', resource: 'posts', role: 'blocked' });
  });

  it('multiple actions produce one rule per action', () => {
    const rules = ruleFor<'read' | 'update'>('allow', 'editor', 'posts', ['read', 'update']);

    expect(rules).toHaveLength(2);
    expect(rules.map((r) => r.action)).toEqual(['read', 'update']);
    expect(rules.every((r) => r.effect === 'allow' && r.resource === 'posts' && r.role === 'editor')).toBe(true);
  });

  it('when option attaches a predicate to all produced rules', () => {
    const rules = ruleFor<'update', { authorId: string }>('allow', 'editor', 'posts', ['update'], {
      when: owns('authorId'),
    });

    expect(rules).toHaveLength(1);
    expect(typeof rules[0].when).toBe('function');
  });

  it('multi-role rule via array', () => {
    const rules = ruleFor('allow', ['viewer', 'editor'], 'posts', ['read']);

    expect(rules[0].role).toEqual(['viewer', 'editor']);
  });

  it('WILDCARD can be used as resource or action', () => {
    const rules = ruleFor('allow', WILDCARD, WILDCARD, [WILDCARD]);

    expect(rules[0]).toEqual({ action: WILDCARD, effect: 'allow', resource: WILDCARD, role: WILDCARD });
  });

  it('ruleFor rules work correctly inside createWard', () => {
    const ward = createWard<'read' | 'update', { authorId: string }>([
      ...ruleFor<'read' | 'update', { authorId: string }>('allow', 'viewer', 'posts', ['read']),
      ...ruleFor<'read' | 'update', { authorId: string }>('allow', 'editor', 'posts', ['read', 'update'], {
        when: owns('authorId'),
      }),
    ]);

    expect(
      ward.explain({ action: 'read', principal: { id: 'u1', roles: ['viewer'] }, resource: 'posts' }).allowed,
    ).toBe(true);
    expect(
      ward.explain({ action: 'update', principal: { id: 'u1', roles: ['viewer'] }, resource: 'posts' }).allowed,
    ).toBe(false);
    expect(
      ward.explain({
        action: 'update',
        data: { authorId: 'u2' },
        principal: { id: 'u2', roles: ['editor'] },
        resource: 'posts',
      }).allowed,
    ).toBe(true);
    expect(
      ward.explain({
        action: 'update',
        data: { authorId: 'u3' },
        principal: { id: 'u2', roles: ['editor'] },
        resource: 'posts',
      }).allowed,
    ).toBe(false);
  });

  it('priority option sets the priority field on all produced rules', () => {
    const rules = ruleFor('allow', 'viewer', 'posts', ['read'], { priority: 5 });

    expect(rules).toHaveLength(1);
    expect(rules[0].priority).toBe(5);
  });

  it('priority applies to all actions when multiple are specified', () => {
    const rules = ruleFor<'read' | 'update'>('allow', 'editor', 'posts', ['read', 'update'], { priority: 3 });

    expect(rules).toHaveLength(2);
    expect(rules.every((r) => r.priority === 3)).toBe(true);
  });

  it('priority and when can be combined', () => {
    const pred = () => true;
    const rules = ruleFor('allow', 'viewer', 'posts', ['read'], { priority: 10, when: pred });

    expect(rules[0].priority).toBe(10);
    expect(rules[0].when).toBe(pred);
  });
});

// ---------------------------------------------------------------------------
// allow / deny factories
// ---------------------------------------------------------------------------

describe('ward: allow factory', () => {
  it('produces WardRules with effect: allow', () => {
    const rules = allow('editor', 'posts', ['read', 'update']);

    expect(rules).toHaveLength(2);
    expect(rules.every((r) => r.effect === 'allow')).toBe(true);
  });

  it('attaches when and priority options', () => {
    const pred = () => true;
    const rules = allow('editor', 'posts', ['update'], { priority: 5, when: pred });

    expect(rules[0].priority).toBe(5);
    expect(rules[0].when).toBe(pred);
  });

  it('works correctly inside createWard', () => {
    const ward = createWard([...allow('viewer', 'posts', ['read']), ...deny('viewer', 'posts', ['delete'])]);

    expect(
      ward.explain({ action: 'read', principal: { id: 'u1', roles: ['viewer'] }, resource: 'posts' }).allowed,
    ).toBe(true);
    expect(
      ward.explain({ action: 'delete', principal: { id: 'u1', roles: ['viewer'] }, resource: 'posts' }).allowed,
    ).toBe(false);
  });
});

describe('ward: deny factory', () => {
  it('produces WardRules with effect: deny', () => {
    const rules = deny('blocked', 'posts', ['read', 'update']);

    expect(rules).toHaveLength(2);
    expect(rules.every((r) => r.effect === 'deny')).toBe(true);
  });

  it('supports wildcard resource and action', () => {
    const rules = deny('guest', WILDCARD, [WILDCARD]);

    expect(rules[0]).toEqual({ action: WILDCARD, effect: 'deny', resource: WILDCARD, role: 'guest' });
  });
});

// ---------------------------------------------------------------------------
// predicate namespace
// ---------------------------------------------------------------------------

describe('predicate.owns', () => {
  it('returns true when data[attributeKey] === principal.id', () => {
    const pred = predicate.owns<{ authorId: string }>('authorId');

    expect(pred({ data: { authorId: 'u1' }, principal: { id: 'u1', roles: ['editor'] } })).toBe(true);
  });

  it('returns false when data[attributeKey] !== principal.id', () => {
    const pred = predicate.owns<{ authorId: string }>('authorId');

    expect(pred({ data: { authorId: 'u2' }, principal: { id: 'u1', roles: ['editor'] } })).toBe(false);
  });

  it('returns false when data is undefined', () => {
    const pred = predicate.owns<{ authorId: string }>('authorId');

    expect(pred({ data: undefined, principal: { id: 'u1', roles: ['editor'] } })).toBe(false);
  });

  it('returns false when data is not an object', () => {
    const pred = predicate.owns('authorId') as (ctx: {
      data: unknown;
      principal: { id: string; roles: string[] };
    }) => boolean;

    expect(pred({ data: 'hello', principal: { id: 'u1', roles: [] } })).toBe(false);
  });

  it('returns false when the attribute is inherited (not own property)', () => {
    const pred = predicate.owns<{ toString: string }>('toString');
    const data = Object.create({ toString: 'u1' }) as { toString: string };

    expect(pred({ data, principal: { id: 'u1', roles: ['editor'] } })).toBe(false);
  });

  it('returns false when data key is present but value is undefined', () => {
    const pred = predicate.owns<{ authorId: string | undefined }>('authorId');

    expect(pred({ data: { authorId: undefined }, principal: { id: 'u1', roles: ['editor'] } })).toBe(false);
  });
});

describe('predicate.and', () => {
  it('returns true only when all predicates return true', () => {
    const alwaysTrue = () => true;
    const alwaysFalse = () => false;

    const both = predicate.and(alwaysTrue, alwaysTrue);
    const mixed = predicate.and(alwaysTrue, alwaysFalse);
    const ctx = { data: undefined, principal: { id: 'u1', roles: [] } };

    expect(both(ctx)).toBe(true);
    expect(mixed(ctx)).toBe(false);
  });

  it('returns true for empty predicate list', () => {
    const all = predicate.and();
    const ctx = { data: undefined, principal: { id: 'u1', roles: [] } };

    expect(all(ctx)).toBe(true);
  });
});

describe('predicate.or', () => {
  it('returns true when at least one predicate returns true', () => {
    const alwaysTrue = () => true;
    const alwaysFalse = () => false;

    const either = predicate.or(alwaysFalse, alwaysTrue);
    const none = predicate.or(alwaysFalse, alwaysFalse);
    const ctx = { data: undefined, principal: { id: 'u1', roles: [] } };

    expect(either(ctx)).toBe(true);
    expect(none(ctx)).toBe(false);
  });

  it('returns false for empty predicate list', () => {
    const none = predicate.or();
    const ctx = { data: undefined, principal: { id: 'u1', roles: [] } };

    expect(none(ctx)).toBe(false);
  });
});

describe('predicate.not', () => {
  it('inverts the given predicate', () => {
    const alwaysTrue = () => true;
    const inverted = predicate.not(alwaysTrue);
    const ctx = { data: undefined, principal: { id: 'u1', roles: [] } };

    expect(inverted(ctx)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// owns (top-level re-export)
// ---------------------------------------------------------------------------

describe('owns', () => {
  it('returns true when data[attributeKey] === principal.id', () => {
    const pred = owns<{ authorId: string }>('authorId');

    expect(pred({ data: { authorId: 'u1' }, principal: { id: 'u1', roles: ['editor'] } })).toBe(true);
  });

  it('returns false when data[attributeKey] !== principal.id', () => {
    const pred = owns<{ authorId: string }>('authorId');

    expect(pred({ data: { authorId: 'u2' }, principal: { id: 'u1', roles: ['editor'] } })).toBe(false);
  });

  it('returns false when data is undefined', () => {
    const pred = owns<{ authorId: string }>('authorId');

    expect(pred({ data: undefined, principal: { id: 'u1', roles: ['editor'] } })).toBe(false);
  });

  it('returns false when data is not an object', () => {
    const pred = owns('authorId') as (ctx: { data: unknown; principal: { id: string; roles: string[] } }) => boolean;

    expect(pred({ data: 'hello', principal: { id: 'u1', roles: [] } })).toBe(false);
  });

  it('returns false when the attribute is inherited (not own property)', () => {
    const pred = owns<{ toString: string }>('toString');
    const data = Object.create({ toString: 'u1' }) as { toString: string };

    expect(pred({ data, principal: { id: 'u1', roles: ['editor'] } })).toBe(false);
  });

  it('returns false when data key is present but value is undefined', () => {
    const pred = owns<{ authorId: string | undefined }>('authorId');

    expect(pred({ data: { authorId: undefined }, principal: { id: 'u1', roles: ['editor'] } })).toBe(false);
  });
});
