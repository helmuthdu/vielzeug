import { describe, expect, it } from 'vitest';
import { createExpedition, setExpeditionHunters } from './expedition';
import { partyMaxFor, setPlayerName, validateParty } from './party';

const NOW = '2026-01-01T00:00:00.000Z';

describe('partyMaxFor', () => {
  it('bounds the party at four hunters until Mount Havoc joins the table', () => {
    expect(partyMaxFor(['core'])).toBe(4);
    expect(partyMaxFor(['core', 'ice', 'nightmare'])).toBe(4);
    expect(partyMaxFor(['core', 'mount-havoc'])).toBe(5);
  });

  it('validates a fifth hunter only with Mount Havoc enabled', () => {
    const five = ['daeron', 'ljonar', 'mirah', 'thoreg', 'karah'];
    expect(validateParty(five, ['core', 'mount-havoc'])).toEqual([]);
    expect(validateParty(five, ['core', 'ice']).map((issue) => issue.code)).toContain('party-size');
  });
});

describe('setPlayerName', () => {
  it('trims and limits a hunter player name', () => {
    const expedition = setExpeditionHunters(
      createExpedition('expedition-name', ['core'], NOW),
      ['daeron', 'mirah'],
      NOW,
    );

    const updated = setPlayerName(expedition, 'daeron', ` ${'A'.repeat(30)} `, '2026-01-02T00:00:00.000Z');

    expect(updated.hunters.find((member) => member.hunterId === 'daeron')?.playerName).toBe('A'.repeat(24));
    expect(updated.hunters.find((member) => member.hunterId === 'mirah')?.playerName).toBe('');
    expect(updated.updatedAt).toBe('2026-01-02T00:00:00.000Z');
  });

  it('rejects a hunter who is not in the subject', () => {
    const expedition = setExpeditionHunters(
      createExpedition('expedition-name', ['core'], NOW),
      ['daeron', 'mirah'],
      NOW,
    );

    expect(() => setPlayerName(expedition, 'thoreg', 'Astra', NOW)).toThrow('not in this party');
  });
});
