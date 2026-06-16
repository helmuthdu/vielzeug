import { vi } from 'vitest';

import { createWard, guardRequest, guardRequestWith } from '../index';

// ---------------------------------------------------------------------------
// guardRequest — framework-agnostic guard
// ---------------------------------------------------------------------------

describe('ward: guardRequestWith', () => {
  const ward = createWard<'read' | 'update'>([
    { action: 'read', effect: 'allow', resource: 'posts', role: 'viewer' },
    { action: 'update', effect: 'deny', resource: 'posts', role: 'viewer' },
  ]);

  it('returns granted: true when principal is allowed', async () => {
    const result = await guardRequestWith(ward, {}, () => ({ id: 'u1', roles: ['viewer'] }), 'posts', 'read');

    expect(result.granted).toBe(true);
    expect(result.principal).toEqual({ id: 'u1', roles: ['viewer'] });
  });

  it('returns granted: false with decision when denied', async () => {
    const result = await guardRequestWith(ward, {}, () => ({ id: 'u1', roles: ['viewer'] }), 'posts', 'update');

    expect(result.granted).toBe(false);

    if (!result.granted) {
      expect(result.reason).toBe('explicit-deny');
    }
  });

  it('supports async principal extractor', async () => {
    const result = await guardRequestWith(ward, {}, async () => ({ id: 'u1', roles: ['viewer'] }), 'posts', 'read');

    expect(result.granted).toBe(true);
  });

  it('returns granted: false for no-matching-rule', async () => {
    const result = await guardRequestWith(
      ward,
      {},
      () => null, // anonymous
      'posts',
      'read',
    );

    expect(result.granted).toBe(false);

    if (!result.granted) {
      expect(result.reason).toBe('no-matching-rule');
    }
  });
});

// ---------------------------------------------------------------------------
// guardRequest — simple principal overload
// ---------------------------------------------------------------------------

describe('guardRequest: simple principal overload', () => {
  const ward = createWard<'read'>([{ action: 'read', effect: 'allow', resource: 'posts', role: 'editor' }]);
  const principal = { id: 'u1', roles: ['editor'] };

  it('returns granted=true when principal can perform action', async () => {
    const result = await guardRequest(ward, principal, 'posts', 'read');

    expect(result.granted).toBe(true);
    expect(result.principal).toBe(principal);
  });

  it('returns granted=false with reason when denied', async () => {
    const result = await guardRequest(ward, { id: 'u2', roles: ['viewer'] }, 'posts', 'read');

    expect(result.granted).toBe(false);

    if (!result.granted) {
      expect(result.reason).toBe('no-matching-rule');
    }
  });

  it('accepts null principal for anonymous checks', async () => {
    const result = await guardRequest(ward, null, 'posts', 'read');

    expect(result.granted).toBe(false);
  });

  it('forwards data to the ward predicate', async () => {
    const dataWard = createWard<'update', { authorId: string }>([
      {
        action: 'update',
        effect: 'allow',
        resource: 'posts',
        role: 'editor',
        when: ({ data, principal }) => data?.authorId === principal.id,
      },
    ]);

    const allowed = await guardRequest(dataWard, { id: 'u1', roles: ['editor'] }, 'posts', 'update', {
      authorId: 'u1',
    });
    const denied = await guardRequest(dataWard, { id: 'u1', roles: ['editor'] }, 'posts', 'update', {
      authorId: 'u2',
    });

    expect(allowed.granted).toBe(true);
    expect(denied.granted).toBe(false);
  });
});
