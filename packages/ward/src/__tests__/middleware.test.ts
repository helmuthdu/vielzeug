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
    const result = await guardRequestWith({
      action: 'read',
      extractPrincipal: () => ({ id: 'u1', roles: ['viewer'] }),
      req: {},
      resource: 'posts',
      ward,
    });

    expect(result.granted).toBe(true);
    expect(result.principal).toEqual({ id: 'u1', roles: ['viewer'] });
  });

  it('returns granted: false with decision when denied', async () => {
    const result = await guardRequestWith({
      action: 'update',
      extractPrincipal: () => ({ id: 'u1', roles: ['viewer'] }),
      req: {},
      resource: 'posts',
      ward,
    });

    expect(result.granted).toBe(false);

    if (!result.granted) {
      expect(result.reason).toBe('explicit-deny');
    }
  });

  it('supports async principal extractor', async () => {
    const result = await guardRequestWith({
      action: 'read',
      extractPrincipal: async () => ({ id: 'u1', roles: ['viewer'] }),
      req: {},
      resource: 'posts',
      ward,
    });

    expect(result.granted).toBe(true);
  });

  it('returns granted: false for no-matching-rule', async () => {
    const result = await guardRequestWith({
      action: 'read',
      extractPrincipal: () => null, // anonymous
      req: {},
      resource: 'posts',
      ward,
    });

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
    const result = await guardRequest({ action: 'read', principal, resource: 'posts', ward });

    expect(result.granted).toBe(true);
    expect(result.principal).toBe(principal);
  });

  it('returns granted=false with reason when denied', async () => {
    const result = await guardRequest({
      action: 'read',
      principal: { id: 'u2', roles: ['viewer'] },
      resource: 'posts',
      ward,
    });

    expect(result.granted).toBe(false);

    if (!result.granted) {
      expect(result.reason).toBe('no-matching-rule');
    }
  });

  it('accepts null principal for anonymous checks', async () => {
    const result = await guardRequest({ action: 'read', principal: null, resource: 'posts', ward });

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

    const allowed = await guardRequest({
      action: 'update',
      data: { authorId: 'u1' },
      principal: { id: 'u1', roles: ['editor'] },
      resource: 'posts',
      ward: dataWard,
    });
    const denied = await guardRequest({
      action: 'update',
      data: { authorId: 'u2' },
      principal: { id: 'u1', roles: ['editor'] },
      resource: 'posts',
      ward: dataWard,
    });

    expect(allowed.granted).toBe(true);
    expect(denied.granted).toBe(false);
  });
});
