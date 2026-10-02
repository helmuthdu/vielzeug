import type { GameMode, HunterBuild, HuntRecord } from './types';

export type ChroniclesMode = GameMode | 'all';

/** The number of hunters a hunt was recorded with, or every size at once. */
export type ChroniclesPartySize = 'all' | number;

/** The two lenses the record is read through: a game mode and a party size. */
export interface ChroniclesSelection {
  mode: ChroniclesMode;
  partySize: ChroniclesPartySize;
}

/** Recorded hunts per party size, fewest hunters first: the party lens' chapter counts. */
export interface ChroniclesPartyCount {
  count: number;
  size: number;
}

/**
 * One hunt subject as the chronicle reads it: its recorded hunts plus enough identity to
 * open the game again from any record it produced.
 */
export interface ChroniclesSubject {
  huntHistory: readonly HuntRecord[];
  id: string;
  name: string;
}

export interface ChroniclesSources {
  ascents: readonly ChroniclesSubject[];
  campaigns: readonly ChroniclesSubject[];
  challenges: readonly ChroniclesSubject[];
  expeditions: readonly ChroniclesSubject[];
}

/** The game a recorded hunt belongs to: the record's provenance. */
export interface ChroniclesOrigin {
  id: string;
  kind: GameMode;
  name: string;
}

/** One recorded hunt carrying the game it was recorded in. */
export type ChroniclesHuntRecord = HuntRecord & { origin: ChroniclesOrigin };

export interface ChroniclesCount {
  count: number;
  id: string;
}

/** One creature's standing in the record: total encounters split by outcome. */
export interface ChroniclesMonster {
  count: number;
  defeats: number;
  id: string;
  victories: number;
}

/** A hunt the timer captured; pace lists only ever contain these. */
export type TimedHuntRecord = ChroniclesHuntRecord & { durationMs: number };

/** One creature's timed hunts, median fastest: the pace entry keeps its complete records. */
export interface ChroniclesDuration {
  maxMs: number;
  medianMs: number;
  minMs: number;
  monsterId: string;
  records: TimedHuntRecord[];
}

/** One hunter's own armory: their equipment and card inclusions across recorded hunts. */
export interface ChroniclesHunterLoadouts {
  cards: ChroniclesCount[];
  equipment: ChroniclesCount[];
  hunterId: string;
  /** The deck the hunter brought to their newest record: the comparison's profile input. */
  latestDeck: Pick<HunterBuild, 'deckCardIds' | 'masteryCardId'>;
}

export interface ChroniclesResult {
  attempts: number;
  /** Per-hunter armory rankings, ordered by the hunter's own appearance count: the by-hero lens. */
  byHunter: ChroniclesHunterLoadouts[];
  /** Recorded hunts per game mode, unfiltered by this result's `mode`: the chapter counts. */
  byMode: ChroniclesModeCounts;
  cards: ChroniclesCount[];
  defeats: number;
  durations: ChroniclesDuration[];
  equipment: ChroniclesCount[];
  hunters: ChroniclesCount[];
  monsters: ChroniclesMonster[];
  /**
   * Every party size the record holds, counted inside the mode lens: the party divider's options
   * and counts, zero counts included so a pressed size never loses its button.
   */
  partyCounts: ChroniclesPartyCount[];
  /** Complete selected-mode records, newest first, including untimed hunts. */
  recentHunts: ChroniclesHuntRecord[];
  timedAttempts: number;
  /** Sum of every timed hunt's duration: the record's play time. */
  totalDurationMs: number;
  victories: number;
  winRate: number | null;
}

/** Recorded hunts per game mode, taken inside the party lens: each divider counts within the other. */
export interface ChroniclesModeCounts {
  ascent: number;
  campaign: number;
  challenge: number;
  expedition: number;
}

const rank = (counts: Map<string, number>): ChroniclesCount[] =>
  [...counts]
    .map(([id, count]) => ({ count, id }))
    .sort((left, right) => right.count - left.count || left.id.localeCompare(right.id));

function median(values: number[]): number {
  values.sort((left, right) => left - right);
  const middle = Math.floor(values.length / 2);
  return values.length % 2 ? values[middle]! : (values[middle - 1]! + values[middle]!) / 2;
}

/** Stamps each of a subject's hunts with the game it was recorded in. */
const huntRecords = (subjects: readonly ChroniclesSubject[], kind: GameMode): ChroniclesHuntRecord[] =>
  subjects.flatMap(({ huntHistory, id, name }) =>
    huntHistory.map((record) => ({ ...record, origin: { id, kind, name } })),
  );

/** Derives comparable fight metrics from complete per-hunt result records. */
export function analyzeHunts(
  sources: ChroniclesSources,
  { mode, partySize }: ChroniclesSelection = { mode: 'all', partySize: 'all' },
): ChroniclesResult {
  const stamped = [
    ...huntRecords(sources.campaigns, 'campaign'),
    ...huntRecords(sources.expeditions, 'expedition'),
    ...huntRecords(sources.ascents, 'ascent'),
    ...huntRecords(sources.challenges, 'challenge'),
  ];
  /** The party lens: which hunts this party size owns. */
  const partyMatch = (record: HuntRecord) => partySize === 'all' || record.hunters.length === partySize;
  /** The mode lens: which hunts this chapter owns. */
  const modeMatch = (record: ChroniclesHuntRecord) => mode === 'all' || record.origin.kind === mode;
  const byMode: ChroniclesModeCounts = { ascent: 0, campaign: 0, challenge: 0, expedition: 0 };
  const partyTotals = new Map<number, number>();

  for (const record of stamped) {
    // Each divider counts within the other lens, and keeps every option the whole record holds:
    // mode counts read the party's hunts, party counts the chapter's — a pressed size never
    // loses its button, its count honestly reading zero inside an empty chapter.
    if (partyMatch(record)) byMode[record.origin.kind]++;
    const size = record.hunters.length;

    partyTotals.set(size, (partyTotals.get(size) ?? 0) + (modeMatch(record) ? 1 : 0));
  }
  const partyCounts = [...partyTotals]
    .map(([size, count]) => ({ count, size }))
    .sort((left, right) => left.size - right.size);
  const records = stamped.filter((record) => modeMatch(record) && partyMatch(record));
  /** The record's one ordering for its newest-first lists: ties broken by id. */
  const newestFirst = (left: HuntRecord, right: HuntRecord) =>
    right.recordedAt.localeCompare(left.recordedAt) || left.id.localeCompare(right.id);
  /** Pace samples order by time alone; equal timestamps keep their recording order. */
  const byRecordedTime = (left: HuntRecord, right: HuntRecord) => right.recordedAt.localeCompare(left.recordedAt);

  const monsterStats = new Map<string, { count: number; defeats: number; victories: number }>();
  const hunterCounts = new Map<string, number>();
  const equipmentCounts = new Map<string, number>();
  const cardCounts = new Map<string, number>();
  const hunterEquipment = new Map<string, Map<string, number>>();
  const hunterCards = new Map<string, Map<string, number>>();
  const hunterDecks = new Map<
    string,
    { deck: Pick<HunterBuild, 'deckCardIds' | 'masteryCardId'>; record: HuntRecord }
  >();
  const timedRecords = new Map<string, TimedHuntRecord[]>();
  let victories = 0;
  let defeats = 0;
  let timedAttempts = 0;
  let totalDurationMs = 0;

  for (const record of records) {
    const standing = monsterStats.get(record.monsterId) ?? { count: 0, defeats: 0, victories: 0 };
    standing.count++;
    if (record.outcome === 'victory') {
      victories++;
      standing.victories++;
    } else {
      defeats++;
      standing.defeats++;
    }
    monsterStats.set(record.monsterId, standing);
    if (record.durationMs !== null) {
      timedAttempts++;
      totalDurationMs += record.durationMs;
      const own = timedRecords.get(record.monsterId) ?? [];

      // The guard above proves the narrowed field; the cast states it for the compiler.
      own.push(record as TimedHuntRecord);
      timedRecords.set(record.monsterId, own);
    }
    for (const hunter of record.hunters) {
      hunterCounts.set(hunter.hunterId, (hunterCounts.get(hunter.hunterId) ?? 0) + 1);
      const ownEquipment = hunterEquipment.get(hunter.hunterId) ?? new Map<string, number>();
      const ownCards = hunterCards.get(hunter.hunterId) ?? new Map<string, number>();

      for (const equipmentId of Object.values(hunter.equipment)) {
        if (equipmentId) {
          equipmentCounts.set(equipmentId, (equipmentCounts.get(equipmentId) ?? 0) + 1);
          ownEquipment.set(equipmentId, (ownEquipment.get(equipmentId) ?? 0) + 1);
        }
      }
      for (const cardId of hunter.deckCardIds) {
        cardCounts.set(cardId, (cardCounts.get(cardId) ?? 0) + 1);
        ownCards.set(cardId, (ownCards.get(cardId) ?? 0) + 1);
      }
      hunterEquipment.set(hunter.hunterId, ownEquipment);
      hunterCards.set(hunter.hunterId, ownCards);
      const held = hunterDecks.get(hunter.hunterId);

      if (!held || newestFirst(record, held.record) < 0) {
        hunterDecks.set(hunter.hunterId, {
          deck: { deckCardIds: hunter.deckCardIds, masteryCardId: hunter.masteryCardId },
          record,
        });
      }
    }
  }

  return {
    attempts: records.length,
    byHunter: [...hunterCounts.entries()]
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .map(([hunterId]) => ({
        cards: rank(hunterCards.get(hunterId) ?? new Map<string, number>()),
        equipment: rank(hunterEquipment.get(hunterId) ?? new Map<string, number>()),
        hunterId,
        // Every counted hunter was seated in a record, so their newest deck is always held.
        latestDeck: hunterDecks.get(hunterId)!.deck,
      })),
    byMode,
    cards: rank(cardCounts),
    defeats,
    durations: [...timedRecords]
      .map(([monsterId, own]) => {
        const times = own.map(({ durationMs }) => durationMs);

        return {
          maxMs: Math.max(...times),
          medianMs: median(times),
          minMs: Math.min(...times),
          monsterId,
          records: [...own].sort(byRecordedTime),
        };
      })
      .sort((left, right) => left.medianMs - right.medianMs || left.monsterId.localeCompare(right.monsterId)),
    equipment: rank(equipmentCounts),
    hunters: rank(hunterCounts),
    monsters: [...monsterStats]
      .map(([id, { count, defeats, victories }]) => ({ count, defeats, id, victories }))
      .sort((left, right) => right.count - left.count || left.id.localeCompare(right.id)),
    partyCounts,
    recentHunts: [...records].sort(newestFirst),
    timedAttempts,
    totalDurationMs,
    victories,
    winRate: records.length ? victories / records.length : null,
  };
}
