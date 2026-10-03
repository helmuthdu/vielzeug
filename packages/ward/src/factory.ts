import { tapper } from '@vielzeug/arsenal';

import { compileRule } from './_compile';
import { ruleMatches, snapshotDecisionInput, snapshotPrincipal } from './_match';
import type {
  BoundWard,
  Principal,
  Ward,
  WardAttributes,
  WardDecision,
  WardDecisionInput,
  WardEvent,
  WardRule,
} from './types';

/**
 * Creates an authorization ward from an ordered list of rules.
 *
 * **Decision model**: rules are evaluated in declaration order; the first rule
 * that matches the request wins. If no rule matches, the decision is **deny**
 * (default deny). There is no priority, specificity scoring, or conflict
 * detection: order is the only tiebreaker.
 *
 * A rule matches when:
 * 1. Its `action` pattern matches the requested action (`*` or `ns:*` or exact).
 * 2. Its `resource` pattern matches the requested resource.
 * 3. Its declarative `roles` (if any) include the principal's role, `ANONYMOUS`
 *    matches a null principal, and `WILDCARD` matches any authenticated principal.
 * 4. Every key in its declarative `attributes` is present and equal in the
 *    request's `attributes` (deep equality).
 * 5. Its `condition` escape-hatch callback (if any) returns `true`.
 */
export function createWard<
  TAction extends string = string,
  TResource extends string = string,
  TAttributes extends WardAttributes = WardAttributes,
>(
  rules: readonly (
    | WardRule<NoInfer<TAction>, NoInfer<TResource>, NoInfer<TAttributes>>
    | readonly WardRule<NoInfer<TAction>, NoInfer<TResource>, NoInfer<TAttributes>>[]
  )[] = [],
): Ward<TAction, TResource, TAttributes> {
  const compiled = Object.freeze(rules.flat().map((rule, index) => compileRule(rule, index)));
  const knownActions = Object.freeze([
    ...new Set(
      compiled.flatMap((rule) => (rule.effect === 'allow' && !rule.action.includes('*') ? [rule.action] : [])),
    ),
  ]) as readonly TAction[];
  const tappers = tapper<WardEvent<TAction, TResource, TAttributes>>();

  function evaluate(
    input: WardDecisionInput<TAction, TResource, TAttributes>,
    emit: boolean,
  ): WardDecision<TAction, TResource, TAttributes> {
    const normalized = snapshotDecisionInput(input);

    for (let index = 0; index < compiled.length; index++) {
      const rule = compiled[index];

      if (ruleMatches(rule, index, normalized)) {
        const decision = Object.freeze({
          effect: rule.effect,
          matched: true,
          reason: `rule[${index}] ${rule.effect === 'allow' ? 'allows' : 'denies'} '${normalized.action}' on '${normalized.resource}'`,
          rule,
        }) as WardDecision<TAction, TResource, TAttributes>;

        if (emit) emitDecision(normalized, decision);
        return decision;
      }
    }

    const decision = Object.freeze({
      effect: 'deny',
      matched: false,
      reason: `no matching rule for '${normalized.action}' on '${normalized.resource}' (default deny)`,
    }) as WardDecision<TAction, TResource, TAttributes>;

    if (emit) emitDecision(normalized, decision);
    return decision;
  }

  function emitDecision(
    input: WardDecisionInput<TAction, TResource, TAttributes> & { principal: Principal },
    decision: WardDecision<TAction, TResource, TAttributes>,
  ): void {
    tappers.emit(Object.freeze({ decision, input, type: 'decision' as const }));
  }

  function decide(
    input: WardDecisionInput<TAction, TResource, TAttributes>,
  ): WardDecision<TAction, TResource, TAttributes> {
    return evaluate(input, true);
  }

  function checkAll(
    inputs: readonly WardDecisionInput<TAction, TResource, TAttributes>[],
  ): WardDecision<TAction, TResource, TAttributes>[] {
    return inputs.map(decide);
  }

  function allowedActions(input: {
    attributes?: TAttributes;
    filter?: readonly TAction[];
    principal?: Principal;
    resource: TResource;
  }): TAction[] {
    const candidates = input.filter ?? knownActions;
    const seen = new Set<TAction>();

    return candidates.filter((action) => {
      if (seen.has(action)) return false;
      seen.add(action);
      return evaluate({ ...input, action }, false).effect === 'allow';
    });
  }

  function forPrincipal(principal?: Principal): BoundWard<TAction, TResource, TAttributes> {
    const snapshot = snapshotPrincipal(principal);

    return {
      allowedActions: (input) => allowedActions({ ...input, principal: snapshot }),
      checkAll: (inputs) => checkAll(inputs.map((input) => ({ ...input, principal: snapshot }))),
      decide: (input) => decide({ ...input, principal: snapshot }),
    };
  }

  return {
    allowedActions,
    checkAll,
    decide,
    forPrincipal,
    knownActions,
    rules: compiled,
    tap: (handler, options) => tappers.tap(handler, options),
  };
}
