export { ANONYMOUS, WILDCARD } from './constants';
export { allow, deny, owns, predicate, ruleFor } from './builder';
export { WardPredicateError } from './errors';
export { createWard } from './factory';
export { guardRequest, guardRequestWith } from './middleware';
export { matchesPattern, patternCovers } from './resource';
export type {
  BoundWard,
  ConflictKind,
  Principal,
  RuleContext,
  UserPrincipal,
  Ward,
  WardCheck,
  WardConflict,
  WardDecision,
  WardDecisionResult,
  WardLoggerContext,
  WardOptions,
  WardPredicate,
  WardRule,
  WardTrace,
  WardTraceCandidate,
} from './types';
export type { GuardResult, PrincipalExtractor, WardRequest } from './middleware';
