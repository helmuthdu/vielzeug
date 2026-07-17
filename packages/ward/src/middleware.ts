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

export type GuardRequestInput<TAction extends string, TData> = {
  action: TAction;
  data?: TData;
  principal: Principal;
  resource: string;
  ward: Ward<TAction, TData>;
};

export type GuardRequestWithInput<TAction extends string, TData, TReq extends WardRequest> = {
  action: TAction;
  data?: TData;
  extractPrincipal: PrincipalExtractor<TReq>;
  req: TReq;
  resource: string;
  ward: Ward<TAction, TData>;
};

export function guardRequest<TAction extends string, TData>(
  input: GuardRequestInput<TAction, TData>,
): GuardResult<TAction, TData> {
  const decision = input.ward.explain({
    action: input.action,
    data: input.data,
    principal: input.principal,
    resource: input.resource,
  });

  if (decision.allowed) {
    return { granted: true, principal: input.principal };
  }

  return { decision, granted: false, principal: input.principal, reason: decision.reason };
}

export async function guardRequestWith<TAction extends string, TData, TReq extends WardRequest>(
  input: GuardRequestWithInput<TAction, TData, TReq>,
): Promise<GuardResult<TAction, TData>> {
  const principal = await input.extractPrincipal(input.req);

  return guardRequest({
    action: input.action,
    data: input.data,
    principal,
    resource: input.resource,
    ward: input.ward,
  });
}
