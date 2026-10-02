import { describe, expect, it } from 'vitest';
import type { ChroniclesSources, ChroniclesSubject } from './chronicles';
import { analyzeHunts } from './chronicles';
import { idleMonsterState } from './monster-state';
import type { GameMode, HuntRecord } from './types';

const record = (overrides: Partial<HuntRecord> = {}): HuntRecord => ({
  durationMs: 1000,
  events: [],
  fightStart: { hunters: {}, monsterId: 'monster-a', monsterState: idleMonsterState() },
  hunters: [
    {
      deckCardIds: ['card-a', 'card-b'],
      equipment: { armorId: 'armor-a', helmId: null, itemId: null, weaponId: 'weapon-a' },
      hunterId: 'daeron',
      masteryCardId: 'mastery-a',
    },
  ],
  id: 'campaign-a:hunt:1',
  monsterId: 'monster-a',
  outcome: 'victory',
  recordedAt: '2026-01-01T00:00:01.000Z',
  ...overrides,
});

const subject = (kind: GameMode, name: string, history: HuntRecord[]): ChroniclesSubject => ({
  huntHistory: history,
  id: `${kind}-a`,
  name,
});

const emptySources = (): ChroniclesSources => ({ ascents: [], campaigns: [], challenges: [], expeditions: [] });

describe('analyzeHunts', () => {
  it('returns empty metrics without inventing a win rate', () => {
    expect(analyzeHunts(emptySources())).toMatchObject({
      attempts: 0,
      recentHunts: [],
      winRate: null,
    });
  });

  it('returns complete hunts newest first, including untimed records', () => {
    const sources = emptySources();
    sources.campaigns = [
      subject('campaign', 'The Long Hunt', [
        record({ id: 'c:hunt:older', recordedAt: '2026-01-01T00:00:00.000Z' }),
        record({ durationMs: null, id: 'c:hunt:untimed', recordedAt: '2026-01-03T00:00:00.000Z' }),
        record({ id: 'c:hunt:newer', recordedAt: '2026-01-04T00:00:00.000Z' }),
      ]),
    ];

    expect(analyzeHunts(sources).recentHunts.map(({ id }) => id)).toEqual([
      'c:hunt:newer',
      'c:hunt:untimed',
      'c:hunt:older',
    ]);
    expect(analyzeHunts(sources, { mode: 'ascent', partySize: 'all' }).recentHunts).toEqual([]);
  });

  it('stamps every record with the game it was recorded in', () => {
    const sources = emptySources();
    sources.campaigns = [subject('campaign', 'The Long Hunt', [record({ id: 'c:hunt:1' })])];
    sources.expeditions = [subject('expedition', 'Vyraxen', [record({ id: 'e:hunt:1', monsterId: 'monster-b' })])];

    expect(analyzeHunts(sources).recentHunts.map(({ id, origin }) => ({ id, origin }))).toEqual([
      { id: 'c:hunt:1', origin: { id: 'campaign-a', kind: 'campaign', name: 'The Long Hunt' } },
      { id: 'e:hunt:1', origin: { id: 'expedition-a', kind: 'expedition', name: 'Vyraxen' } },
    ]);
    // Timed pace records carry the same provenance: their party details can link back too.
    expect(analyzeHunts(sources).durations.map(({ records }) => records.map(({ origin }) => origin.kind))).toEqual([
      ['campaign'],
      ['expedition'],
    ]);
  });

  it('aggregates recorded outcomes, durations, parties, gear, and decks', () => {
    const sources = emptySources();
    sources.campaigns = [
      subject('campaign', 'The Long Hunt', [
        record({ durationMs: 3000, id: 'c:hunt:1', monsterId: 'monster-a' }),
        record({ durationMs: null, id: 'c:hunt:2', monsterId: 'monster-a', outcome: 'defeat' }),
        record({ durationMs: 5000, id: 'c:hunt:3', monsterId: 'monster-a' }),
      ]),
    ];
    sources.expeditions = [
      subject('expedition', 'Vyraxen', [
        record({
          durationMs: 7000,
          hunters: [
            {
              deckCardIds: ['card-a'],
              equipment: { armorId: null, helmId: null, itemId: null, weaponId: 'weapon-b' },
              hunterId: 'mirah',
              masteryCardId: 'mastery-b',
            },
          ],
          id: 'expedition-a:hunt:1',
          monsterId: 'monster-b',
          recordedAt: '2026-02-01T00:00:00.000Z',
        }),
      ]),
    ];

    const result = analyzeHunts(sources);
    expect(result).toMatchObject({
      attempts: 4,
      byMode: { ascent: 0, campaign: 3, challenge: 0, expedition: 1 },
      defeats: 1,
      timedAttempts: 3,
      totalDurationMs: 3000 + 5000 + 7000,
      victories: 3,
      winRate: 0.75,
    });
    expect(result.monsters).toEqual([
      { count: 3, defeats: 1, id: 'monster-a', victories: 2 },
      { count: 1, defeats: 0, id: 'monster-b', victories: 1 },
    ]);
    // The closing line reads the newest hunt, never a second notion of "latest".
    expect(result.recentHunts[0]).toMatchObject({
      monsterId: 'monster-b',
      outcome: 'victory',
      recordedAt: '2026-02-01T00:00:00.000Z',
    });
    // Pace entries keep their complete records, newest first: no projection, no re-join.
    expect(result.durations).toEqual([
      {
        maxMs: 5000,
        medianMs: 4000,
        minMs: 3000,
        monsterId: 'monster-a',
        records: [
          expect.objectContaining({ durationMs: 3000, id: 'c:hunt:1', outcome: 'victory' }),
          expect.objectContaining({ durationMs: 5000, id: 'c:hunt:3', outcome: 'victory' }),
        ],
      },
      {
        maxMs: 7000,
        medianMs: 7000,
        minMs: 7000,
        monsterId: 'monster-b',
        records: [expect.objectContaining({ durationMs: 7000, id: 'expedition-a:hunt:1' })],
      },
    ]);
    expect(result.durations[0]?.records[0]?.hunters).toEqual([
      {
        deckCardIds: ['card-a', 'card-b'],
        equipment: { armorId: 'armor-a', helmId: null, itemId: null, weaponId: 'weapon-a' },
        hunterId: 'daeron',
        masteryCardId: 'mastery-a',
      },
    ]);
    expect(result.hunters).toEqual([
      { count: 3, id: 'daeron' },
      { count: 1, id: 'mirah' },
    ]);
    // The by-hero lens: each hunter's own armory, ordered by their appearance count.
    expect(result.byHunter).toEqual([
      {
        cards: [
          { count: 3, id: 'card-a' },
          { count: 3, id: 'card-b' },
        ],
        equipment: [
          { count: 3, id: 'armor-a' },
          { count: 3, id: 'weapon-a' },
        ],
        hunterId: 'daeron',
        latestDeck: { deckCardIds: ['card-a', 'card-b'], masteryCardId: 'mastery-a' },
      },
      {
        cards: [{ count: 1, id: 'card-a' }],
        equipment: [{ count: 1, id: 'weapon-b' }],
        hunterId: 'mirah',
        latestDeck: { deckCardIds: ['card-a'], masteryCardId: 'mastery-b' },
      },
    ]);
    expect(result.cards).toEqual([
      { count: 4, id: 'card-a' },
      { count: 3, id: 'card-b' },
    ]);
  });

  it('profiles each hunter with the deck from their newest record, not their most-played one', () => {
    const deck = (deckCardIds: string[], masteryCardId: string) => ({
      deckCardIds,
      equipment: { armorId: null, helmId: null, itemId: null, weaponId: null },
      hunterId: 'daeron',
      masteryCardId,
    });
    const sources = emptySources();

    sources.campaigns = [
      subject('campaign', 'The Long Hunt', [
        record({
          hunters: [deck(['card-new'], 'mastery-new')],
          id: 'c:hunt:new',
          recordedAt: '2026-03-01T00:00:00.000Z',
        }),
        record({
          hunters: [deck(['card-old'], 'mastery-old')],
          id: 'c:hunt:old',
          recordedAt: '2026-01-01T00:00:00.000Z',
        }),
      ]),
    ];

    expect(analyzeHunts(sources).byHunter).toEqual([
      {
        cards: [
          { count: 1, id: 'card-new' },
          { count: 1, id: 'card-old' },
        ],
        equipment: [],
        hunterId: 'daeron',
        latestDeck: { deckCardIds: ['card-new'], masteryCardId: 'mastery-new' },
      },
    ]);

    // Input order changes nothing: the newer recordedAt still wins.
    sources.campaigns = [
      subject('campaign', 'The Long Hunt', [
        record({
          hunters: [deck(['card-old'], 'mastery-old')],
          id: 'c:hunt:old',
          recordedAt: '2026-01-01T00:00:00.000Z',
        }),
        record({
          hunters: [deck(['card-new'], 'mastery-new')],
          id: 'c:hunt:new',
          recordedAt: '2026-03-01T00:00:00.000Z',
        }),
      ]),
    ];

    expect(analyzeHunts(sources).byHunter[0]?.latestDeck).toEqual({
      deckCardIds: ['card-new'],
      masteryCardId: 'mastery-new',
    });
  });

  it('retains actual timed hunt records without untimed samples', () => {
    const sources = emptySources();
    sources.campaigns = [
      subject('campaign', 'The Long Hunt', [
        record({ durationMs: 3000, id: 'c:hunt:1', recordedAt: '2026-01-01T00:00:00.000Z' }),
        record({
          durationMs: null,
          hunters: [
            {
              deckCardIds: [],
              equipment: { armorId: null, helmId: null, itemId: null, weaponId: null },
              hunterId: 'karah',
              masteryCardId: 'mastery-a',
            },
          ],
          id: 'c:hunt:2',
          recordedAt: '2026-01-02T00:00:00.000Z',
        }),
        record({
          durationMs: 5000,
          hunters: [
            {
              deckCardIds: [],
              equipment: { armorId: null, helmId: null, itemId: null, weaponId: null },
              hunterId: 'mirah',
              masteryCardId: 'mastery-b',
            },
          ],
          id: 'c:hunt:3',
          recordedAt: '2026-01-03T00:00:00.000Z',
        }),
        record({
          durationMs: 7000,
          hunters: [
            {
              deckCardIds: [],
              equipment: { armorId: null, helmId: null, itemId: null, weaponId: null },
              hunterId: 'thoreg',
              masteryCardId: 'mastery-c',
            },
          ],
          id: 'c:hunt:4',
          recordedAt: '2026-01-04T00:00:00.000Z',
        }),
        record({ durationMs: 9000, id: 'c:hunt:5', recordedAt: '2026-01-05T00:00:00.000Z' }),
      ]),
    ];

    const [duration] = analyzeHunts(sources).durations;

    expect(duration).toMatchObject({ maxMs: 9000, medianMs: 6000, minMs: 3000 });
    expect(duration?.records.map(({ id }) => id)).toEqual(['c:hunt:5', 'c:hunt:4', 'c:hunt:3', 'c:hunt:1']);
  });

  it('filters complete hunt records by game mode', () => {
    const sources = emptySources();
    sources.campaigns = [subject('campaign', 'The Long Hunt', [record({ id: 'campaign:hunt:1' })])];
    sources.ascents = [
      subject('ascent', 'Havoc Climb', [record({ id: 'ascent:hunt:1', monsterId: 'monster-ascent' })]),
    ];

    expect(analyzeHunts(sources, { mode: 'ascent', partySize: 'all' }).monsters).toEqual([
      { count: 1, defeats: 0, id: 'monster-ascent', victories: 1 },
    ]);
    expect(analyzeHunts(sources, { mode: 'campaign', partySize: 'all' }).attempts).toBe(1);
    expect(analyzeHunts(sources).attempts).toBe(2);
    // Mode counts stay whole regardless of the filter: the chapter tabs read them.
    expect(analyzeHunts(sources, { mode: 'campaign', partySize: 'all' }).byMode).toEqual({
      ascent: 1,
      campaign: 1,
      challenge: 0,
      expedition: 0,
    });
  });

  it('reads the record through the party lens, each divider counting within the other', () => {
    const sources = emptySources();
    const party = (size: number, id: string) =>
      record({
        hunters: Array.from({ length: size }, (_, index) => ({
          deckCardIds: ['card-a'],
          equipment: { armorId: null, helmId: null, itemId: null, weaponId: null },
          hunterId: `hunter-${index}`,
          masteryCardId: 'mastery-a',
        })),
        id,
      });

    sources.campaigns = [subject('campaign', 'The Long Hunt', [party(2, 'c:pair'), party(3, 'c:trio')])];
    sources.ascents = [subject('ascent', 'Havoc Climb', [party(3, 'a:trio')])];

    // The party lens narrows the record to that size's hunts alone.
    const trio = analyzeHunts(sources, { mode: 'all', partySize: 3 });

    expect(trio.attempts).toBe(2);
    // Each divider counts within the other lens: mode counts hold the party's hunts...
    expect(trio.byMode).toEqual({ ascent: 1, campaign: 1, challenge: 0, expedition: 0 });
    // ...and party counts the chapter's: with every mode selected, all sizes still read.
    expect(trio.partyCounts).toEqual([
      { count: 1, size: 2 },
      { count: 2, size: 3 },
    ]);
    // Campaigns hold two sizes; the divider keeps every size the record holds, a chapter's
    // zero counts included so a pressed size never loses its button.
    expect(analyzeHunts(sources, { mode: 'campaign', partySize: 'all' }).partyCounts).toEqual([
      { count: 1, size: 2 },
      { count: 1, size: 3 },
    ]);
    expect(analyzeHunts(sources, { mode: 'ascent', partySize: 'all' }).partyCounts).toEqual([
      { count: 0, size: 2 },
      { count: 1, size: 3 },
    ]);
    // The lenses combine.
    expect(analyzeHunts(sources, { mode: 'campaign', partySize: 3 }).attempts).toBe(1);
    expect(analyzeHunts(sources, { mode: 'ascent', partySize: 2 }).attempts).toBe(0);
  });

  it('orders median durations fastest first with a stable tie-break', () => {
    const sources = emptySources();
    sources.campaigns = [
      subject('campaign', 'The Long Hunt', [
        record({ durationMs: 9000, id: 'c:hunt:1', monsterId: 'slow-monster' }),
        record({ durationMs: 2000, id: 'c:hunt:2', monsterId: 'fast-monster' }),
        record({ durationMs: 5000, id: 'c:hunt:3', monsterId: 'tie-b' }),
        record({ durationMs: 3000, id: 'c:hunt:4', monsterId: 'tie-b' }),
        record({ durationMs: 4000, id: 'c:hunt:5', monsterId: 'tie-a' }),
        record({ durationMs: 4000, id: 'c:hunt:6', monsterId: 'tie-a' }),
      ]),
    ];

    expect(analyzeHunts(sources).durations.map(({ medianMs, monsterId }) => ({ medianMs, monsterId }))).toEqual([
      { medianMs: 2000, monsterId: 'fast-monster' },
      { medianMs: 4000, monsterId: 'tie-a' },
      { medianMs: 4000, monsterId: 'tie-b' },
      { medianMs: 9000, monsterId: 'slow-monster' },
    ]);
  });
});
