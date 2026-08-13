export { allow, deny, owns, predicate, ruleFor } from './builder';
export { ANONYMOUS, WILDCARD } from './constants';
export { WardConfigError, WardError, WardPredicateError } from './errors';
export { createWard } from './factory';
export { matchesPattern, patternCovers } from './resource';
export type {
  BoundWard,
  BoundWardAllowedActionsInput,
  BoundWardDecisionInput,
  BoundWardRulesInScopeInput,
  ConflictKind,
  Principal,
  RuleContext,
  UserPrincipal,
  Ward,
  WardAllowedActionsInput,
  WardCheck,
  WardConflict,
  WardDecision,
  WardDecisionInput,
  WardDecisionResult,
  WardLoggerContext,
  WardOptions,
  WardPredicate,
  WardRule,
  WardRulesInScopeInput,
  WardTrace,
  WardTraceCandidate,
} from './types';
