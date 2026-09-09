import { ANONYMOUS, WILDCARD } from './constants';
import type { WardAttributes, WardCondition, WardPattern, WardRule } from './types';

type RuleOptions<TAttributes extends WardAttributes> = Readonly<{
  when?: WardCondition<TAttributes>;
}>;

function roleCondition<TAttributes extends WardAttributes>(
  role: string | readonly string[],
): WardCondition<TAttributes> {
  const roles = Object.freeze(Array.isArray(role) ? [...role] : [role]);

  return ({ principal }) =>
    roles.some((candidate) =>
      candidate === ANONYMOUS
        ? principal === null
        : candidate === WILDCARD
          ? principal !== null
          : principal?.roles.includes(candidate),
    );
}

function buildRules<TAction extends string, TResource extends string, TAttributes extends WardAttributes>(
  effect: 'allow' | 'deny',
  role: string | readonly string[],
  resource: WardPattern<TResource>,
  actions: readonly WardPattern<TAction>[],
  options?: RuleOptions<TAttributes>,
): WardRule<TAction, TResource, TAttributes>[] {
  const matchesRole = roleCondition<TAttributes>(role);
  const condition = options?.when
    ? (input: Parameters<WardCondition<TAttributes>>[0]) => matchesRole(input) && options.when!(input)
    : matchesRole;

  return actions.map((action) => ({ action, condition, effect, resource }));
}

export const allow = <
  TAction extends string = string,
  TResource extends string = string,
  TAttributes extends WardAttributes = WardAttributes,
>(
  role: string | readonly string[],
  resource: WardPattern<TResource>,
  actions: readonly WardPattern<TAction>[],
  options?: RuleOptions<TAttributes>,
): WardRule<TAction, TResource, TAttributes>[] => buildRules('allow', role, resource, actions, options);

export const deny = <
  TAction extends string = string,
  TResource extends string = string,
  TAttributes extends WardAttributes = WardAttributes,
>(
  role: string | readonly string[],
  resource: WardPattern<TResource>,
  actions: readonly WardPattern<TAction>[],
  options?: RuleOptions<TAttributes>,
): WardRule<TAction, TResource, TAttributes>[] => buildRules('deny', role, resource, actions, options);

const hasRole =
  <TAttributes extends WardAttributes = WardAttributes>(role: string): WardCondition<TAttributes> =>
  ({ principal }) =>
    principal?.roles.includes(role) ?? false;
const owns =
  <TAttributes extends WardAttributes = WardAttributes>(
    attribute: keyof TAttributes & string,
  ): WardCondition<TAttributes> =>
  ({ attributes, principal }) =>
    principal !== null && attributes?.[attribute] === principal.id;
const and =
  <TAttributes extends WardAttributes = WardAttributes>(
    ...conditions: readonly WardCondition<TAttributes>[]
  ): WardCondition<TAttributes> =>
  (input) =>
    conditions.every((condition) => condition(input));
const or =
  <TAttributes extends WardAttributes = WardAttributes>(
    ...conditions: readonly WardCondition<TAttributes>[]
  ): WardCondition<TAttributes> =>
  (input) =>
    conditions.some((condition) => condition(input));
const not =
  <TAttributes extends WardAttributes = WardAttributes>(
    condition: WardCondition<TAttributes>,
  ): WardCondition<TAttributes> =>
  (input) =>
    !condition(input);

export const predicate = { and, hasRole, not, or, owns } as const;
