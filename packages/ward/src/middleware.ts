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

export async function guardRequest<TAction extends string, TData>(
  ward: Ward<TAction, TData>,
  principal: Principal,
  resource: string,
  action: TAction,
  data?: TData,
): Promise<GuardResult<TAction, TData>>;
export async function guardRequest<TAction extends string, TData, TReq extends WardRequest>(
  ward: Ward<TAction, TData>,
  req: TReq,
  extractPrincipal: PrincipalExtractor<TReq>,
  resource: string,
  action: TAction,
  data?: TData,
): Promise<GuardResult<TAction, TData>>;
export async function guardRequest<TAction extends string, TData, TReq extends WardRequest>(
  ward: Ward<TAction, TData>,
  reqOrPrincipal: TReq | Principal,
  extractOrResource: PrincipalExtractor<TReq> | string,
  resourceOrAction: string | TAction,
  actionOrData?: TAction | TData,
  data?: TData,
): Promise<GuardResult<TAction, TData>> {
  let principal: Principal;
  let resource: string;
  let action: TAction;
  let resolvedData: TData | undefined;

  if (typeof extractOrResource === 'function') {
    principal = await (extractOrResource as PrincipalExtractor<TReq>)(reqOrPrincipal as TReq);
    resource = resourceOrAction as string;
    action = actionOrData as TAction;
    resolvedData = data;
  } else {
    principal = reqOrPrincipal as Principal;
    resource = extractOrResource as string;
    action = resourceOrAction as TAction;
    resolvedData = actionOrData as TData | undefined;
  }

  const decision = ward.explain(principal, resource, action, resolvedData);

  if (decision.allowed) {
    return { granted: true, principal };
  }

  return { decision, granted: false, principal, reason: decision.reason };
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
  onDenied?: (
    req: TReq,
    res: ExpressResponse,
    next: ExpressNext,
    result: GuardResult<TAction, TData> & { granted: false },
  ) => void | Promise<void>;
};

export function createExpressGuard<TAction extends string, TData, TReq extends ExpressRequest>(
  ward: Ward<TAction, TData>,
  extractPrincipal: PrincipalExtractor<TReq>,
  resource: string,
  action: TAction,
  options: ExpressGuardOptions<TAction, TData, TReq> = {},
): ExpressMiddleware<TReq> {
  return async (req, res, next) => {
    try {
      const result = await guardRequest(ward, req, extractPrincipal, resource, action, options.data);

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
    const result = await guardRequest(ward, principal, resource, action, options.data);

    if (result.granted) {
      return next();
    }

    if (options.onDenied) {
      return options.onDenied(c, next, result);
    }

    return c.json({ reason: result.reason }, 403);
  };
}
