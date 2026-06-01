import type { WardRuleInput } from '../types';

import { createWard, defineRules, owns, rule, WILDCARD } from '../index';

// ---------------------------------------------------------------------------
// Fluent rule builder
// ---------------------------------------------------------------------------

describe('ward: fluent rule builder', () => {
  it('allow builder produces correct WardRule', () => {
    const rules = rule<'read'>().allow('viewer').on('posts').to('read').build();

    expect(rules).toHaveLength(1);
    expect(rules[0]).toEqual({ action: 'read', effect: 'allow', resource: 'posts', role: 'viewer' });
  });

  it('deny builder produces correct WardRule', () => {
    const rules = rule<'read'>().deny('blocked').on('posts').to('read').build();

    expect(rules).toHaveLength(1);
    expect(rules[0]).toEqual({ action: 'read', effect: 'deny', resource: 'posts', role: 'blocked' });
  });

  it('.to() with multiple actions produces one rule per action', () => {
    const rules = rule<'read' | 'update'>().allow('editor').on('posts').to('read', 'update').build();

    expect(rules).toHaveLength(2);
    expect(rules.map((r) => r.action)).toEqual(['read', 'update']);
    expect(rules.every((r) => r.effect === 'allow' && r.resource === 'posts' && r.role === 'editor')).toBe(true);
  });

  it('.when() attaches a predicate to all produced rules', () => {
    const rules = rule<'update', { authorId: string }>()
      .allow('editor')
      .on('posts')
      .to('update')
      .when(owns('authorId'))
      .build();

    expect(rules).toHaveLength(1);
    expect(typeof rules[0].when).toBe('function');
  });

  it('multi-role rule via array', () => {
    const rules = rule<'read'>().allow(['viewer', 'editor']).on('posts').to('read').build();

    expect(rules[0].role).toEqual(['viewer', 'editor']);
  });

  it('WILDCARD can be used as resource or action', () => {
    const rules = rule().allow(WILDCARD).on(WILDCARD).to(WILDCARD).build();

    expect(rules[0]).toEqual({ action: WILDCARD, effect: 'allow', resource: WILDCARD, role: WILDCARD });
  });

  it('builder rules work correctly inside createWard', () => {
    const ward = createWard<'read' | 'update', { authorId: string }>([
      ...rule<'read' | 'update', { authorId: string }>().allow('viewer').on('posts').to('read').build(),
      ...rule<'read' | 'update', { authorId: string }>()
        .allow('editor')
        .on('posts')
        .to('read', 'update')
        .when(owns('authorId'))
        .build(),
    ]);

    expect(ward.can({ id: 'u1', roles: ['viewer'] }, 'posts', 'read')).toBe(true);
    expect(ward.can({ id: 'u1', roles: ['viewer'] }, 'posts', 'update')).toBe(false);
    expect(ward.can({ id: 'u2', roles: ['editor'] }, 'posts', 'update', { authorId: 'u2' })).toBe(true);
    expect(ward.can({ id: 'u2', roles: ['editor'] }, 'posts', 'update', { authorId: 'u3' })).toBe(false);
  });

  it('.priority() sets the priority field on all produced rules', () => {
    const rules = rule<'read'>().allow('viewer').on('posts').to('read').priority(5).build();

    expect(rules).toHaveLength(1);
    expect(rules[0].priority).toBe(5);
  });

  it('.priority() is chainable before .when()', () => {
    const pred = () => true;
    const rules = rule<'read'>().allow('viewer').on('posts').to('read').priority(10).when(pred).build();

    expect(rules[0].priority).toBe(10);
    expect(rules[0].when).toBe(pred);
  });

  it('.priority() is chainable after .when()', () => {
    const pred = () => true;
    const rules = rule<'read'>().allow('viewer').on('posts').to('read').when(pred).priority(10).build();

    expect(rules[0].priority).toBe(10);
    expect(rules[0].when).toBe(pred);
  });

  it('.priority() applies to all actions when multiple are specified', () => {
    const rules = rule<'read' | 'update'>().allow('editor').on('posts').to('read', 'update').priority(3).build();

    expect(rules).toHaveLength(2);
    expect(rules.every((r) => r.priority === 3)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// owns
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
});

// ---------------------------------------------------------------------------
// defineRules
// ---------------------------------------------------------------------------

describe('defineRules', () => {
  it('returns the exact same array reference (identity)', () => {
    const input: WardRuleInput<'read'>[] = [{ action: 'read', effect: 'allow', resource: 'posts', role: 'viewer' }];
    const result = defineRules(input);

    expect(result).toBe(input);
  });

  it('infers generic types from the input', () => {
    const result = defineRules<'read' | 'update'>([
      { action: 'read', effect: 'allow', resource: 'posts', role: 'viewer' },
      { action: 'update', effect: 'allow', resource: 'posts', role: 'editor' },
    ]);

    expect(result).toHaveLength(2);
  });
});
