import type { WILDCARD } from './constants';

export type WardAttributeValue =
  | boolean
  | number
  | string
  | null
  | readonly WardAttributeValue[]
  | { readonly [key: string]: WardAttributeValue };

export type WardAttributes = Readonly<Record<string, WardAttributeValue>>;

export type WardPattern<TValue extends string> = TValue | typeof WILDCARD | `${string}:*`;

export type UserPrincipal = Readonly<{
  attributes?: WardAttributes;
  id: string;
  roles: readonly string[];
}>;

export type Principal = UserPrincipal | null;

export type WardConditionInput<TAttributes extends WardAttributes = WardAttributes> = Readonly<{
  attributes?: TAttributes;
  principal: Principal;
}>;

export type WardCondition<TAttributes extends WardAttributes = WardAttributes> = (
  input: WardConditionInput<TAttributes>,
) => boolean;

export type WardRule<
  TAction extends string = string,
  TResource extends string = string,
  TAttributes extends WardAttributes = WardAttributes,
> = Readonly<{
  action: WardPattern<TAction>;
  attributes?: TAttributes;
  condition?: WardCondition<TAttributes>;
  effect: 'allow' | 'deny';
  resource: WardPattern<TResource>;
  /**
   * Roles this rule applies to, evaluated beside action, resource, and
   * attributes. `ANONYMOUS` matches a null principal, `WILDCARD` matches any
   * authenticated principal. Omit to match every principal.
   */
  roles?: readonly string[];
}>;

type MatchedWardDecision<
  TAction extends string,
  TResource extends string,
  TAttributes extends WardAttributes,
> = Readonly<{
  effect: 'allow' | 'deny';
  matched: true;
  reason: string;
  rule: WardRule<TAction, TResource, TAttributes>;
}>;

type DefaultDenyWardDecision = Readonly<{
  effect: 'deny';
  matched: false;
  reason: string;
  rule?: never;
}>;

export type WardDecision<
  TAction extends string = string,
  TResource extends string = string,
  TAttributes extends WardAttributes = WardAttributes,
> = MatchedWardDecision<TAction, TResource, TAttributes> | DefaultDenyWardDecision;

export type WardDecisionInput<
  TAction extends string = string,
  TResource extends string = string,
  TAttributes extends WardAttributes = WardAttributes,
> = Readonly<{
  action: TAction;
  attributes?: TAttributes;
  principal?: Principal;
  resource: TResource;
}>;

export type BoundWardDecisionInput<
  TAction extends string = string,
  TResource extends string = string,
  TAttributes extends WardAttributes = WardAttributes,
> = Omit<WardDecisionInput<TAction, TResource, TAttributes>, 'principal'>;

export type WardEvent<
  TAction extends string = string,
  TResource extends string = string,
  TAttributes extends WardAttributes = WardAttributes,
> = Readonly<{
  decision: WardDecision<TAction, TResource, TAttributes>;
  input: WardDecisionInput<TAction, TResource, TAttributes> & { principal: Principal };
  type: 'decision';
}>;

export type BoundWard<
  TAction extends string = string,
  TResource extends string = string,
  TAttributes extends WardAttributes = WardAttributes,
> = Pick<Ward<TAction, TResource, TAttributes>, 'allowedActions' | 'checkAll' | 'decide'>;

export type Ward<
  TAction extends string = string,
  TResource extends string = string,
  TAttributes extends WardAttributes = WardAttributes,
> = {
  /**
   * The actions this ward's rule set can ever allow, in declaration order.
   * Derived from the compiled rules; exact (non-pattern) actions only, since
   * wildcard actions have no enumerable value.
   */
  readonly knownActions: readonly TAction[];
  /** Actions the input is allowed to perform, drawn from {@link Ward.knownActions} unless filtered. */
  allowedActions(
    input: Omit<WardDecisionInput<TAction, TResource, TAttributes>, 'action'> & {
      filter?: readonly TAction[];
    },
  ): TAction[];
  checkAll(
    inputs: readonly WardDecisionInput<TAction, TResource, TAttributes>[],
  ): WardDecision<TAction, TResource, TAttributes>[];
  decide(input: WardDecisionInput<TAction, TResource, TAttributes>): WardDecision<TAction, TResource, TAttributes>;
  forPrincipal(principal?: Principal): BoundWard<TAction, TResource, TAttributes>;
  readonly rules: readonly WardRule<TAction, TResource, TAttributes>[];
  tap(
    handler: (event: WardEvent<TAction, TResource, TAttributes>) => void,
    options?: { readonly signal?: AbortSignal },
  ): () => void;
};
