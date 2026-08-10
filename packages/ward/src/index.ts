export { ANONYMOUS, WILDCARD } from './constants';
export { allow, deny, owns, predicate, ruleFor } from './builder';
export { WardConfigError, WardError, WardPredicateError } from './errors';
export { createWard } from './factory';
export { matchesPattern, patternCovers } from './resource';
export type {
  BoundWardAllowedActionsInput,
  BoundWardDecisionInput,
  BoundWardRulesInScopeInput,
  BoundWard,
  ConflictKind,
  Principal,
  RuleContext,
  UserPrincipal,
  WardAllowedActionsInput,
  Ward,
  WardCheck,
  WardConflict,
  WardDecisionInput,
  WardDecision,
  WardDecisionResult,
  WardLoggerContext,
  WardOptions,
  WardPredicate,
  WardRulesInScopeInput,
  WardRule,
  WardTrace,
  WardTraceCandidate,
} from './types';
