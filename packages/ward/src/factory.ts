import { compileRule } from './_compile';
import { ruleMatches, snapshotDecisionInput, snapshotPrincipal } from './_match';
import { WardConfigError } from './errors';
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
 * detection — order is the only tiebreaker.
 *
 * A rule matches when:
 * 1. Its `action` pattern matches the requested action (`*` or `ns:*` or exact).
 * 2. Its `resource` pattern matches the requested resource.
 * 3. Every key in its declarative `attributes` is present and equal in the
 *    request's `attributes` (deep equality).
 * 4. Its `condition` escape-hatch callback (if any) returns `true`.
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
  const tappers = new Set<(event: WardEvent<TAction, TResource, TAttributes>) => void>();

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
    if (tappers.size === 0) return;

    const event = Object.freeze({ decision, input, type: 'decision' as const });
    for (const tapper of tappers) {
      try {
        tapper(event);
      } catch {}
    }
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
    knownActions: readonly TAction[];
    principal?: Principal;
    resource: TResource;
  }): TAction[] {
    const seen = new Set<TAction>();

    return input.knownActions.filter((action) => {
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

  function tap(
    handler: (event: WardEvent<TAction, TResource, TAttributes>) => void,
    options?: { readonly signal?: AbortSignal },
  ): () => void {
    if (typeof handler !== 'function') throw new WardConfigError('tap handler must be a function');
    if (options?.signal?.aborted) return () => {};

    tappers.add(handler);
    const onAbort = () => tappers.delete(handler);
    options?.signal?.addEventListener('abort', onAbort, { once: true });

    return () => {
      tappers.delete(handler);
      options?.signal?.removeEventListener('abort', onAbort);
    };
  }

  return { allowedActions, checkAll, decide, forPrincipal, rules: compiled, tap };
}
