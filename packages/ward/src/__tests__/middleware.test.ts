import { vi } from 'vitest';

import { createExpressGuard, createHonoGuard, createWard, guardRequest } from '../index';

// ---------------------------------------------------------------------------
// guardRequest — framework-agnostic guard
// ---------------------------------------------------------------------------

describe('ward: guardRequest', () => {
  const ward = createWard<'read' | 'update'>([
    { action: 'read', effect: 'allow', resource: 'posts', role: 'viewer' },
    { action: 'update', effect: 'deny', resource: 'posts', role: 'viewer' },
  ]);

  it('returns granted: true when principal is allowed', async () => {
    const result = await guardRequest(ward, {}, () => ({ id: 'u1', roles: ['viewer'] }), 'posts', 'read');

    expect(result.granted).toBe(true);
    expect(result.principal).toEqual({ id: 'u1', roles: ['viewer'] });
  });

  it('returns granted: false with decision when denied', async () => {
    const result = await guardRequest(ward, {}, () => ({ id: 'u1', roles: ['viewer'] }), 'posts', 'update');

    expect(result.granted).toBe(false);

    if (!result.granted) {
      expect(result.reason).toBe('explicit-deny');
    }
  });

  it('supports async principal extractor', async () => {
    const result = await guardRequest(ward, {}, async () => ({ id: 'u1', roles: ['viewer'] }), 'posts', 'read');

    expect(result.granted).toBe(true);
  });

  it('returns granted: false for no-matching-rule', async () => {
    const result = await guardRequest(
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
// createExpressGuard
// ---------------------------------------------------------------------------

describe('ward: createExpressGuard', () => {
  const ward = createWard<'read' | 'update'>([
    { action: 'read', effect: 'allow', resource: 'posts', role: 'viewer' },
    { action: 'update', effect: 'deny', resource: 'posts', role: 'viewer' },
  ]);

  function makeRes() {
    const res = {
      body: undefined as unknown,
      end() {},
      json(body: unknown) {
        this.body = body;
      },
      status(code: number) {
        this.statusCode = code;

        return this;
      },
      statusCode: 0,
    };

    return res;
  }

  it('calls next() when access is granted', async () => {
    const guard = createExpressGuard(ward, () => ({ id: 'u1', roles: ['viewer'] }), 'posts', 'read');
    const next = vi.fn();
    const res = makeRes();

    await guard({} as any, res as any, next);

    expect(next).toHaveBeenCalledWith();
    expect(res.statusCode).toBe(0);
  });

  it('returns 403 with reason when access is denied', async () => {
    const guard = createExpressGuard(ward, () => ({ id: 'u1', roles: ['viewer'] }), 'posts', 'update');
    const next = vi.fn();
    const res = makeRes();

    await guard({} as any, res as any, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({ reason: 'explicit-deny' });
  });

  it('calls onDenied when provided', async () => {
    const onDenied = vi.fn();
    const guard = createExpressGuard(ward, () => ({ id: 'u1', roles: ['viewer'] }), 'posts', 'update', { onDenied });
    const next = vi.fn();
    const res = makeRes();

    await guard({} as any, res as any, next);

    expect(onDenied).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next(err) when extractor throws', async () => {
    const guard = createExpressGuard(
      ward,
      () => {
        throw new Error('auth failed');
      },
      'posts',
      'read',
    );
    const next = vi.fn();
    const res = makeRes();

    await guard({} as any, res as any, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

// ---------------------------------------------------------------------------
// createHonoGuard
// ---------------------------------------------------------------------------

describe('ward: createHonoGuard', () => {
  const ward = createWard<'read' | 'update'>([
    { action: 'read', effect: 'allow', resource: 'posts', role: 'viewer' },
    { action: 'update', effect: 'deny', resource: 'posts', role: 'viewer' },
  ]);

  function makeCtx() {
    return {
      json(body: unknown, status?: number) {
        return new Response(JSON.stringify(body), { status: status ?? 200 });
      },
      req: { raw: {} },
    };
  }

  it('calls next() when access is granted', async () => {
    const guard = createHonoGuard(ward, () => ({ id: 'u1', roles: ['viewer'] }), 'posts', 'read');
    const next = vi.fn(async () => new Response('ok'));
    const ctx = makeCtx();

    await guard(ctx as any, next);

    expect(next).toHaveBeenCalled();
  });

  it('returns 403 Response when access is denied', async () => {
    const guard = createHonoGuard(ward, () => ({ id: 'u1', roles: ['viewer'] }), 'posts', 'update');
    const next = vi.fn();
    const ctx = makeCtx();

    const response = (await guard(ctx as any, next)) as Response;

    expect(next).not.toHaveBeenCalled();
    expect(response.status).toBe(403);

    const body = await response.json();

    expect(body).toEqual({ reason: 'explicit-deny' });
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
});

// ---------------------------------------------------------------------------
// Static data via options.data
// ---------------------------------------------------------------------------

describe('ward: static data in guard options', () => {
  const ward = createWard<'update', { authorId: string }>([
    {
      action: 'update',
      effect: 'allow',
      resource: 'posts',
      role: 'editor',
      when: ({ data, principal }) => data?.authorId === principal.id,
    },
  ]);

  it('createExpressGuard forwards options.data to when predicate', async () => {
    const guard = createExpressGuard(ward, () => ({ id: 'u1', roles: ['editor'] }), 'posts', 'update', {
      data: { authorId: 'u1' },
    });

    const next = vi.fn();
    const res = {
      body: undefined as unknown,
      end() {},
      json(body: unknown) {
        this.body = body;
      },
      status(code: number) {
        (this as any).statusCode = code;

        return this;
      },
      statusCode: 0,
    };

    await guard({} as any, res as any, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('createExpressGuard denies when options.data fails the predicate', async () => {
    const guard = createExpressGuard(ward, () => ({ id: 'u1', roles: ['editor'] }), 'posts', 'update', {
      data: { authorId: 'u2' },
    });

    const next = vi.fn();
    const res = {
      body: undefined as unknown,
      end() {},
      json(body: unknown) {
        this.body = body;
      },
      status(code: number) {
        (this as any).statusCode = code;

        return this;
      },
      statusCode: 0,
    };

    await guard({} as any, res as any, next);

    expect(next).not.toHaveBeenCalled();
    expect((res as any).statusCode).toBe(403);
  });

  it('createHonoGuard forwards options.data to when predicate', async () => {
    const guard = createHonoGuard(ward, () => ({ id: 'u1', roles: ['editor'] }), 'posts', 'update', {
      data: { authorId: 'u1' },
    });

    const ctx = {
      json(body: unknown, status?: number) {
        return new Response(JSON.stringify(body), { status: status ?? 200 });
      },
      req: { raw: {} },
    };
    const next = vi.fn(async () => new Response('ok'));

    await guard(ctx as any, next);

    expect(next).toHaveBeenCalled();
  });
});
