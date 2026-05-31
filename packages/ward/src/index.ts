export { ANONYMOUS, WILDCARD } from './constants';
export { createWard } from './factory';
export { defineRules, owns, rule } from './builder';
export { matchesPattern, patternCovers } from './resource';
export { createExpressGuard, createHonoGuard, guardRequest } from './middleware';
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
  WardLoggerContext,
  WardOptions,
  WardPredicate,
  WardRule,
  WardRuleInput,
  WardTrace,
  WardTraceCandidate,
} from './types';
export type { ExpressGuardOptions, GuardResult, HonoGuardOptions, PrincipalExtractor } from './middleware';
