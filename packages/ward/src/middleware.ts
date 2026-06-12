import type { Principal, Ward, WardDecision } from './types';

export type WardRequest = Record<string, unknown>;
export type PrincipalExtractor<TReq extends WardRequest = WardRequest> = (req: TReq) => Principal | Promise<Principal>;

export type GuardResult<TAction extends string, TData> =
  | { granted: true; principal: Principal }
  | {
      decision: WardDecision<TAction, TData>;
      granted: false;
      principal: Principal;
      reason: 'explicit-deny' | 'no-matching-rule';
    };

/**
 * Evaluates a ward decision for a known `principal` and returns a `GuardResult`.
 * Use when you have already resolved the principal (e.g. from a session or JWT).
 *
 * For request-object based flows where the principal must be extracted asynchronously,
 * use `guardRequestWith` instead.
 */
export function guardRequest<TAction extends string, TData>(
  ward: Ward<TAction, TData>,
  principal: Principal,
  resource: string,
  action: TAction,
  data?: TData,
): GuardResult<TAction, TData> {
  const decision = ward.explain(principal, resource, action, data);

  if (decision.allowed) {
    return { granted: true, principal };
  }

  return { decision, granted: false, principal, reason: decision.reason };
}

/**
 * Evaluates a ward decision by first extracting the principal from a request object,
 * then running the authorization check. The extractor may be async (e.g. to verify a JWT).
 *
 * Use `guardRequest` instead when the principal is already resolved.
 */
export async function guardRequestWith<TAction extends string, TData, TReq extends WardRequest>(
  ward: Ward<TAction, TData>,
  req: TReq,
  extractPrincipal: PrincipalExtractor<TReq>,
  resource: string,
  action: TAction,
  data?: TData,
): Promise<GuardResult<TAction, TData>> {
  const principal = await extractPrincipal(req);

  return guardRequest(ward, principal, resource, action, data);
}

export type ExpressRequest = { [key: string]: unknown };
export type ExpressResponse = { end(): void; json(body: unknown): void; status(code: number): ExpressResponse };
export type ExpressNext = (err?: unknown) => void;
export type ExpressMiddleware<TReq extends ExpressRequest = ExpressRequest> = (
  req: TReq,
  res: ExpressResponse,
  next: ExpressNext,
) => void | Promise<void>;

export type ExpressGuardOptions<TAction extends string, TData, TReq extends ExpressRequest> = {
  /** Static data payload forwarded to every `when` predicate evaluation. */
  data?: TData;
  /**
   * Called instead of the default `403 { reason }` response when the guard denies access.
   * Use to return a uniform error body that does not leak the denial reason to clients.
   *
   * When omitted, the middleware responds with `res.status(403).json({ reason: result.reason })`.
   */
  onDenied?: (
    req: TReq,
    res: ExpressResponse,
    next: ExpressNext,
    result: GuardResult<TAction, TData> & { granted: false },
  ) => void | Promise<void>;
};

/**
 * Creates an Express middleware that guards a route with ward.
 *
 * @remarks
 * The default denied response is `403 { reason: 'explicit-deny' | 'no-matching-rule' }`.
 * If you do not want to expose the denial reason to clients, provide an `onDenied` handler
 * that returns a uniform 403 without the `reason` field.
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
      const result = await guardRequestWith(ward, req, extractPrincipal, resource, action, options.data);

      if (result.granted) {
        next();
      } else if (options.onDenied) {
        await options.onDenied(req, res, next, result);
      } else {
        res.status(403).json({ reason: result.reason });
      }
    } catch (err) {
      next(err);
    }
  };
}

export type HonoContext = {
  [key: string]: unknown;
  json(body: unknown, status?: number): Response;
  req: { [key: string]: unknown; raw: WardRequest };
};

export type HonoNext = () => Promise<Response | void>;
export type HonoMiddleware = (c: HonoContext, next: HonoNext) => Promise<Response | void>;

export type HonoGuardOptions<TAction extends string, TData> = {
  /** Static data payload forwarded to every `when` predicate evaluation. */
  data?: TData;
  /**
   * Called instead of the default `403 { reason }` response when the guard denies access.
   * Use to return a uniform error body that does not leak the denial reason to clients.
   *
   * When omitted, the middleware responds with `c.json({ reason: result.reason }, 403)`.
   */
  onDenied?: (
    c: HonoContext,
    next: HonoNext,
    result: GuardResult<TAction, TData> & { granted: false },
  ) => Promise<Response | void>;
};

/**
 * Creates a Hono middleware that guards a route with ward.
 *
 * @remarks
 * Errors thrown by `extractPrincipal` propagate to Hono's `app.onError` handler.
 * If you need finer control, wrap your extractor in a try/catch before passing it.
 *
 * The default denied response is `403 { reason: 'explicit-deny' | 'no-matching-rule' }`.
 * If you do not want to expose the denial reason to clients, provide an `onDenied` handler
 * that returns a uniform 403 without the `reason` field.
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
    const result = guardRequest(ward, principal, resource, action, options.data);

    if (result.granted) {
      return next();
    }

    if (options.onDenied) {
      return options.onDenied(c, next, result);
    }

    return c.json({ reason: result.reason }, 403);
  };
}
