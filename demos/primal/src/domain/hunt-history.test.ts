import { describe, expect, it } from 'vitest';
import { snapshotFightStart } from './fight-events';
import type { HuntRecordSource } from './hunt-history';
import { appendHuntRecord } from './hunt-history';
import { idleHunterState } from './hunter-state';
import { idleMonsterState } from './monster-state';

const source = (startedAt: string | null = '2026-01-01T00:00:00.000Z'): HuntRecordSource => ({
  fightEvents: [],
  fightStart: null,
  hunterState: { daeron: idleHunterState() },
  hunters: [
    {
      deckCardIds: ['slash-1'],
      equipment: { armorId: 'armor-1', helmId: null, itemId: null, weaponId: 'weapon-1' },
      hunterId: 'daeron',
      masteryCardId: 'mastery-1',
    },
  ],
  huntHistory: [],
  huntTimer: { durationMs: null, elapsedMs: startedAt ? 1000 : 0, startedAt },
  id: 'campaign-1',
  monsterState: idleMonsterState(1),
});

describe('appendHuntRecord', () => {
  it('captures the result, duration, and an independent build snapshot', () => {
    const subject = source();
    const history = appendHuntRecord(subject, 'xitheros', 'victory', '2026-01-01T00:00:02.000Z');

    subject.hunters[0]!.deckCardIds.push('slash-2');
    subject.hunters[0]!.equipment.armorId = 'armor-2';

    expect(history).toEqual([
      {
        durationMs: 3000,
        events: [],
        fightStart: snapshotFightStart(source(), 'xitheros'),
        hunters: [
          {
            deckCardIds: ['slash-1'],
            equipment: { armorId: 'armor-1', helmId: null, itemId: null, weaponId: 'weapon-1' },
            hunterId: 'daeron',
            masteryCardId: 'mastery-1',
          },
        ],
        id: 'campaign-1:hunt:1',
        monsterId: 'xitheros',
        outcome: 'victory',
        recordedAt: '2026-01-01T00:00:02.000Z',
      },
    ]);
  });

  it('keeps an unstarted timer unknown and numbers later attempts', () => {
    const subject = source(null);
    const first = appendHuntRecord(subject, 'xitheros', 'defeat', '2026-01-01T00:00:02.000Z');
    const second = appendHuntRecord(
      { ...subject, huntHistory: first },
      'xitheros',
      'victory',
      '2026-01-02T00:00:00.000Z',
    );

    expect(second.map(({ id, durationMs, outcome }) => ({ durationMs, id, outcome }))).toEqual([
      { durationMs: null, id: 'campaign-1:hunt:1', outcome: 'defeat' },
      { durationMs: null, id: 'campaign-1:hunt:2', outcome: 'victory' },
    ]);
  });
});
