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
 *
 * @example
 * ```ts
 * // Express / Hono / any framework — write a 3-line adapter:
 * app.use('/posts', async (req, res, next) => {
 *   const result = await guardRequestWith(ward, req, extractPrincipal, 'posts', 'read');
 *   result.granted ? next() : res.status(403).json({ reason: result.reason });
 * });
 * ```
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
