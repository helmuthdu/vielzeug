import { describe, expect, it } from 'vitest';
import { PrimalDomainError } from './errors';
import { transitionQuest } from './quest-machine';

describe('quest lifecycle', () => {
  it('moves through unlock, activation, and completion', () => {
    const available = transitionQuest('locked', { type: 'UNLOCK' });
    const active = transitionQuest(available, { type: 'ACTIVATE' });
    expect(transitionQuest(active, { type: 'COMPLETE' })).toBe('completed');
  });

  it('returns an active quest to the board', () => {
    expect(transitionQuest('active', { type: 'DEACTIVATE' })).toBe('available');
  });

  it('expires available and active quests', () => {
    expect(transitionQuest('available', { type: 'EXPIRE' })).toBe('expired');
    expect(transitionQuest('active', { type: 'EXPIRE' })).toBe('expired');
  });

  it('rejects invalid transitions', () => {
    expect(() => transitionQuest('locked', { type: 'COMPLETE' })).toThrow(PrimalDomainError);
    expect(() => transitionQuest('completed', { type: 'UNLOCK' })).toThrow(PrimalDomainError);
  });
});
