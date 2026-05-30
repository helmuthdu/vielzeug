import type { Principal, Ward, WardDecision } from './types';

// ---------------------------------------------------------------------------
// Generic request/response types — framework-agnostic
// ---------------------------------------------------------------------------

/**
 * Minimal request shape used by middleware adapters. Frameworks provide
 * their own richer types; the middleware factories accept any type that
 * has at least the properties described here.
 */
export type WardRequest = Record<string, unknown>;

/**
 * A synchronous or asynchronous function that extracts a `Principal` from a
 * request context. Return `null` for anonymous callers.
 */
export type PrincipalExtractor<TReq extends WardRequest = WardRequest> = (req: TReq) => Principal | Promise<Principal>;

/** Result returned by `guardRequest`. */
export type GuardResult<TAction extends string, TData> =
  | { granted: true; principal: Principal }
  | {
      decision: WardDecision<TAction, TData>;
      granted: false;
      principal: Principal;
      reason: 'explicit-deny' | 'no-matching-rule';
    };

// ---------------------------------------------------------------------------
// Framework-agnostic guard helper
// ---------------------------------------------------------------------------

/**
 * Evaluates one access check and returns a typed result object.
 * Use this as the building block for framework-specific middleware.
 *
 * @example
 * ```ts
 * const result = await guardRequest(ward, req, getPrincipal, 'posts', 'update');
 * if (!result.granted) {
 *   return response.status(403).json({ reason: result.decision.reason });
 * }
 * ```
 */
export async function guardRequest<TAction extends string, TData, TReq extends WardRequest>(
  ward: Ward<TAction, TData>,
  req: TReq,
  extractPrincipal: PrincipalExtractor<TReq>,
  resource: string,
  action: TAction,
  data?: TData,
): Promise<GuardResult<TAction, TData>> {
  const principal = await extractPrincipal(req);
  const decision = ward.explain(principal, resource, action, data);

  if (decision.allowed) {
    return { granted: true, principal };
  }

  return { decision, granted: false, principal, reason: decision.reason };
}

// ---------------------------------------------------------------------------
// Express-style middleware factory
// ---------------------------------------------------------------------------

/**
 * Express/Connect-style `(req, res, next)` handler types.
 * Declared inline to avoid requiring `@types/express` as a dependency.
 */
export type ExpressRequest = { [key: string]: unknown };
export type ExpressResponse = { end(): void; json(body: unknown): void; status(code: number): ExpressResponse };
export type ExpressNext = (err?: unknown) => void;
export type ExpressMiddleware<TReq extends ExpressRequest = ExpressRequest> = (
  req: TReq,
  res: ExpressResponse,
  next: ExpressNext,
) => void | Promise<void>;

/**
 * Options for `createExpressGuard`.
 */
export type ExpressGuardOptions<TAction extends string, TData, TReq extends ExpressRequest> = {
  /** Called when access is denied. Defaults to `res.status(403).json({ reason })`. */
  onDenied?: (
    req: TReq,
    res: ExpressResponse,
    next: ExpressNext,
    result: { decision: WardDecision<TAction, TData>; principal: Principal },
  ) => void | Promise<void>;
};

/**
 * Creates an Express-style middleware that guards a route by checking whether
 * the extracted principal is allowed to perform `action` on `resource`.
 *
 * @example
 * ```ts
 * import express from 'express';
 * import { createWard, createExpressGuard } from '@vielzeug/ward';
 *
 * const ward = createWard([
 *   { role: 'editor', resource: 'posts:*', action: 'update', effect: 'allow' },
 * ]);
 *
 * const requireAuth = createExpressGuard(ward, (req) => req.user ?? null, 'posts:*', 'update');
 *
 * app.put('/posts/:id', requireAuth, handler);
 * ```
 */
export function createExpressGuard<TAction extends string, TData, TReq extends ExpressRequest>(
  ward: Ward<TAction, TData>,
  extractPrincipal: PrincipalExtractor<TReq>,
  resource: string,
  action: TAction,
  options: ExpressGuardOptions<TAction, TData, TReq> = {},
): ExpressMiddleware<TReq> {
  return async (req, res, next) => {
    try {
      const result = await guardRequest(ward, req, extractPrincipal, resource, action);

      if (result.granted) {
        next();
      } else if (options.onDenied) {
        await options.onDenied(req, res, next, { decision: result.decision, principal: result.principal });
      } else {
        res.status(403).json({ reason: result.reason });
      }
    } catch (err) {
      next(err);
    }
  };
}

// ---------------------------------------------------------------------------
// Hono-style middleware factory
// ---------------------------------------------------------------------------

/**
 * Minimal Hono-compatible context shape. Declared inline to avoid requiring
 * `hono` as a dependency.
 */
export type HonoContext = {
  [key: string]: unknown;
  json(body: unknown, status?: number): Response;
  req: { [key: string]: unknown; raw: WardRequest };
};

export type HonoNext = () => Promise<Response | void>;
export type HonoMiddleware = (c: HonoContext, next: HonoNext) => Promise<Response | void>;

/**
 * Options for `createHonoGuard`.
 */
export type HonoGuardOptions<TAction extends string, TData> = {
  /** Called when access is denied. Defaults to `c.json({ reason }, 403)`. */
  onDenied?: (
    c: HonoContext,
    next: HonoNext,
    result: { decision: WardDecision<TAction, TData>; principal: Principal },
  ) => Promise<Response | void>;
};

/**
 * Creates a Hono middleware that guards a route.
 *
 * @example
 * ```ts
 * import { Hono } from 'hono';
 * import { createWard, createHonoGuard } from '@vielzeug/ward';
 *
 * const ward = createWard([
 *   { role: 'editor', resource: 'posts:*', action: 'update', effect: 'allow' },
 * ]);
 *
 * const requireEdit = createHonoGuard(ward, (c) => c.get('user') ?? null, 'posts:*', 'update');
 *
 * app.put('/posts/:id', requireEdit, handler);
 * ```
 */
export function createHonoGuard<TAction extends string, TData>(
  ward: Ward<TAction, TData>,
  extractPrincipal: (c: HonoContext) => Principal | Promise<Principal>,
  resource: string,
  action: TAction,
  options: HonoGuardOptions<TAction, TData> = {},
): HonoMiddleware {
  return async (c, next) => {
    const principal = await extractPrincipal(c);
    const decision = ward.explain(principal, resource, action);

    if (decision.allowed) {
      return next();
    }

    if (options.onDenied) {
      return options.onDenied(c, next, { decision, principal });
    }

    return c.json({ reason: decision.reason }, 403);
  };
}
