import { describe, expect, it } from 'vitest';
import { canTransition } from './opportunity-machine';

describe('opportunity workflow', () => {
  it('allows the configured forward path', () => {
    expect(canTransition('deal-1', 'prospecting', 'qualification')).toBe(true);
    expect(canTransition('deal-1', 'qualification', 'proposal')).toBe(true);
    expect(canTransition('deal-1', 'proposal', 'negotiation')).toBe(true);
    expect(canTransition('deal-1', 'negotiation', 'closed-won')).toBe(true);
  });

  it('rejects skipped stages', () => {
    expect(canTransition('deal-1', 'prospecting', 'proposal')).toBe(false);
    expect(canTransition('deal-1', 'proposal', 'closed-won')).toBe(false);
  });

  it('supports sensible reversals', () => {
    expect(canTransition('deal-1', 'proposal', 'qualification')).toBe(true);
    expect(canTransition('deal-1', 'closed-lost', 'negotiation')).toBe(true);
  });
});
