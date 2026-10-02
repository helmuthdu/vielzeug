import { snapshotFightStart } from './fight-events';
import { stopHuntTimer } from './hunt-timer';
import type { EquipmentIds, HuntRecord, HuntRecordHunter, HuntResult, HuntState } from './types';

type HuntRecordMember = Pick<HuntRecordHunter, 'deckCardIds' | 'equipment' | 'hunterId' | 'masteryCardId'>;
export type HuntRecordSource = Pick<
  HuntState,
  'fightEvents' | 'fightStart' | 'hunterState' | 'monsterState' | 'huntHistory' | 'huntTimer' | 'id'
> & {
  hunters: readonly HuntRecordMember[];
};

/** Appends a stable, immutable snapshot for one resolved attempt. */
export function appendHuntRecord(
  subject: HuntRecordSource,
  monsterId: string,
  outcome: HuntResult,
  recordedAt: string,
): HuntRecord[] {
  const history = subject.huntHistory;
  return [
    ...history,
    {
      durationMs: stopHuntTimer(subject.huntTimer, recordedAt).durationMs,
      events: subject.fightEvents.map((event) => structuredClone(event)),
      fightStart: structuredClone(subject.fightStart ?? snapshotFightStart(subject, monsterId)),
      hunters: subject.hunters.map((hunter) => ({
        deckCardIds: [...hunter.deckCardIds],
        equipment: { ...hunter.equipment } satisfies EquipmentIds,
        hunterId: hunter.hunterId,
        masteryCardId: hunter.masteryCardId,
      })),
      id: `${subject.id}:hunt:${history.length + 1}`,
      monsterId,
      outcome,
      recordedAt,
    },
  ];
}
