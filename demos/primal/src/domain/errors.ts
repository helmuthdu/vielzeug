/**
 * The domain's error strategy, in one rule: illegal state transitions and impossible
 * operations throw `PrimalDomainError` with a machine-readable code; "what is still missing"
 * for a form or checklist is returned as issue/report structures (`DeckReport`, `PartyIssue`,
 * `ExpeditionIssue`) so the UI can render them without catching. Nothing else is ever thrown.
 */
export type PrimalErrorCode =
  | 'config-invalid'
  | 'expansion-required'
  | 'undo-unavailable'
  | 'party-size'
  | 'party-duplicate'
  | 'party-unavailable'
  | 'quest-unknown'
  | 'quest-unavailable'
  | 'quest-state'
  | 'reward-unknown'
  | 'reward-unassigned'
  | 'run-finished'
  | 'run-name-invalid'
  | 'phase-transition'
  | 'campaign-complete'
  | 'campaign-over'
  | 'chapter-unknown'
  | 'monster-unavailable'
  | 'aggression-unavailable'
  | 'scenario-mismatch'
  | 'scenario-unavailable'
  | 'expedition-finished'
  | 'expedition-incomplete'
  | 'expedition-unknown'
  | 'ascent-draw'
  | 'ascent-pile-empty'
  | 'challenge-series'
  | 'challenge-draft'
  | 'challenge-reward-taken'
  | 'backup-not-json'
  | 'backup-unsupported'
  | 'backup-invalid'
  | 'database-closed'
  | 'hunter-not-found'
  | 'hunter-out'
  | 'monster-not-found'
  | 'counter-invalid'
  | 'terrain-unknown'
  | 'terrain-transform'
  | 'hunt-options'
  | 'resource-invalid'
  | 'skill-invalid'
  | 'skill-points'
  | 'trade-invalid'
  | 'equipment-invalid'
  | 'equipment-locked'
  | 'equipment-restricted'
  | 'equipment-owned'
  | 'payment-invalid'
  | 'potion-locked'
  | 'potion-prepared'
  | 'potion-loadout'
  | 'resource-insufficient'
  | 'deck-invalid'
  | 'loadout-invalid'
  | 'loadout-unavailable'
  | 'victory-invalid';

/** Thrown by domain functions when an operation is not legal in the current state. */
export class PrimalDomainError extends Error {
  readonly code: PrimalErrorCode;

  constructor(code: PrimalErrorCode, message: string) {
    super(message);
    this.name = 'PrimalDomainError';
    this.code = code;
  }
}
