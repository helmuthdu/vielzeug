import { describe, expect, it } from 'vitest';
import { availableExpeditionScenarios, availableScenarios, forgeEquipment, hunterById, monsterById } from '../content';
import {
  ASCENT_MAX_WOUNDS,
  advanceAscentChapter,
  ascentChapter,
  beginAscentHunt,
  createAscent,
  duplicateAscent,
  recordAscentResult,
  renameAscent,
  revealAscentEncounter,
  setAscentHunters,
  setAscentNightmareVariant,
  setAscentWoundCount,
  suggestAscentName,
  upgradeEquipmentToChapter,
} from './ascent';
import { transitionAscentPhase } from './ascent-machine';
import { equipSubjectEquipment, equipSubjectPotion, unlockAscentSkillStep } from './build';
import { ascentDeckContext, ascentEquipmentPool, baseEquipment, starterMasteryId, validateDeck } from './deck';
import { PrimalDomainError } from './errors';
import { assertHuntEditable } from './hunt-timer';
import { carrierMonster } from './monster-state';
import type { Ascent, EquipmentIds, Hunter } from './types';

const NOW = '2026-01-01T00:00:00.000Z';
const daeron = hunterById('daeron') as Hunter;

/** Deterministic draw order: with random() = 0 the pile keeps catalog order and pops its tail. */
const noShuffle = () => 0;

function started(hunterIds = ['daeron', 'ljonar']): Ascent {
  return setAscentHunters(createAscent('a1', 'Mount Havoc', ['core', 'mount-havoc'], NOW, noShuffle), hunterIds, NOW);
}

const drawn = (ascent: Ascent): Ascent => revealAscentEncounter(ascent, NOW, noShuffle);

const hunting = (ascent: Ascent): Ascent => beginAscentHunt(drawn(ascent), NOW);

describe('ascent creation', () => {
  it('selects a Mount Havoc name from the suggested list', () => {
    expect(suggestAscentName(() => 0)).toBe('The Summit Call');
    expect(suggestAscentName(() => 0.99)).toBe('The Mountain’s Trial');
  });

  it('starts at chapter 1 preparing with a monster pile', () => {
    const ascent = started();
    expect(ascent.kind).toBe('ascent');
    expect(ascent.chapter).toBe(1);
    expect(ascent.phase).toBe('preparing');
    expect(ascent.status).toBe('running');
    expect(ascent.pending).toBeNull();
    expect(ascent.drawPile.length).toBeGreaterThanOrEqual(3);
    expect(new Set(ascent.drawPile).size).toBe(ascent.drawPile.length);
  });

  it('only includes monsters with a playable expedition scenario in the draw pile', () => {
    const ascent = started();
    expect(ascent.drawPile.filter((id) => availableExpeditionScenarios(id, ascent.expansionIds).length === 0)).toEqual(
      [],
    );
  });

  it('seeds hunters with base gear, a fitted deck and the chapter-1 skill budget', () => {
    const ascent = started();
    const member = ascent.hunters[0];
    expect(member.equipment).toEqual(baseEquipment(daeron));
    expect(member.skillPoints).toBe(1);
    expect(member.woundCount).toBe(0);
    expect(member.masteryCardId).toBe(starterMasteryId(daeron));
    expect(validateDeck(member.deckCardIds, ascentDeckContext(ascent, member, daeron)).valid).toBe(true);
  });

  it('needs the Mount Havoc box to start', () => {
    expect(() => createAscent('a2', 'x', ['core'], NOW, noShuffle)).toThrow(/mount-havoc/);
    expect(() => createAscent('a2', 'x', ['core', 'mount-havoc'], NOW, noShuffle)).not.toThrow();
  });

  it('raises the maximum to five with Mount Havoc', () => {
    const mountHavocAscent = createAscent('a3', 'x', ['core', 'mount-havoc'], NOW, noShuffle);
    expect(() => setAscentHunters(mountHavocAscent, ['daeron'], NOW)).toThrow(/2–5/);
    expect(() =>
      setAscentHunters(mountHavocAscent, ['daeron', 'ljonar', 'mirah', 'thoreg', 'karah'], NOW),
    ).not.toThrow();
    expect(() =>
      setAscentHunters(mountHavocAscent, ['daeron', 'ljonar', 'mirah', 'thoreg', 'karah', 'heleren'], NOW),
    ).toThrow(/2–5/);
    expect(() => setAscentHunters(started(), ['daeron', 'daeron'], NOW)).toThrow(/once/);
  });

  it('trims ascent names and rejects empty or overlong names', () => {
    expect(renameAscent(started(), '  The Long Climb  ', NOW).name).toBe('The Long Climb');
    expect(() => renameAscent(started(), '   ', NOW)).toThrow(PrimalDomainError);
    expect(() => renameAscent(started(), 'a'.repeat(41), NOW)).toThrow(PrimalDomainError);
  });

  it('toggles the Nightmare variant between chapters, box permitting', () => {
    const withBox = setAscentHunters(
      createAscent('a3', 'Mount Havoc', ['core', 'mount-havoc', 'nightmare'], NOW, noShuffle),
      ['daeron', 'ljonar'],
      NOW,
    );
    expect(setAscentNightmareVariant(withBox, true, NOW).nightmareVariant).toBe(true);
    expect(setAscentNightmareVariant(withBox, true, NOW).hunters).toHaveLength(2);
    expect(setAscentNightmareVariant(withBox, false, NOW).nightmareVariant).toBe(false);
    expect(() => setAscentNightmareVariant(started(), true, NOW)).toThrow(/Nightmare Expansion/);
  });

  it('duplicates the current run state with a new id, name and timestamps', () => {
    const original = { ...recordAscentResult(hunting(started()), 'victory', [0, 0, 0, 0], NOW), name: 'A climb' };
    const duplicate = duplicateAscent(original, 'copy', '2026-02-01T00:00:00.000Z');

    expect(duplicate).toMatchObject({
      chapter: original.chapter,
      createdAt: '2026-02-01T00:00:00.000Z',
      defeatedMonsterIds: original.defeatedMonsterIds,
      drawPile: original.drawPile,
      hunters: original.hunters,
      id: 'copy',
      name: 'A climb (copy)',
      pending: original.pending,
      phase: original.phase,
      status: original.status,
      updatedAt: '2026-02-01T00:00:00.000Z',
    });
    expect(original.huntHistory).toHaveLength(1);
    expect(duplicate.huntHistory).toEqual([]);
  });

  it('only edits the party before the hunt begins', () => {
    expect(() => setAscentHunters(hunting(started()), ['mirah'], NOW)).toThrow(/party is only chosen/);
  });
});

describe('ascent phases', () => {
  it('walks preparing → encounter → hunt → result', () => {
    const ascent = started();
    expect(ascent.phase).toBe('preparing');
    const revealed = drawn(ascent);
    expect(revealed.phase).toBe('encounter');
    expect(revealed.pending).not.toBeNull();
    expect(beginAscentHunt(revealed, NOW).phase).toBe('hunt');
  });

  it('rejects out-of-order transitions', () => {
    expect(() => beginAscentHunt(started(), NOW)).toThrow(/encounter/);
    expect(() => transitionAscentPhase('hunt', { type: 'REVEAL_ENCOUNTER' })).toThrow(/REVEAL_ENCOUNTER/);
  });

  it('draws the last pile monster with one of its enabled-box scenarios and shrinks the pile', () => {
    const prepared = started();
    const expected = prepared.drawPile.at(-1) as string;
    const revealed = revealAscentEncounter(prepared, NOW, noShuffle);
    expect(revealed.pending?.monsterId).toBe(expected);
    expect(availableScenarios(expected, prepared.expansionIds).map((scenario) => scenario.id)).toContain(
      revealed.pending?.scenarioId,
    );
    expect(revealed.drawPile).toEqual(prepared.drawPile.slice(0, -1));
  });

  it('seeds the monster board at the chapter aggression', () => {
    const revealed = drawn(started());
    const monster = monsterById(revealed.pending?.monsterId ?? '');
    expect(carrierMonster(revealed)?.id).toBe(monster?.id);
    expect(revealed.monsterState.toughness).toBeGreaterThan(0);
    expect(revealed.monsterState.struggle).toBe(2);
  });

  it('throws when the pile runs dry', () => {
    expect(() => revealAscentEncounter({ ...started(), drawPile: [] }, NOW, noShuffle)).toThrow(
      /No playable encounters remain/,
    );
    expect(() => revealAscentEncounter({ ...started(), drawPile: ['the-awakened'] }, NOW, noShuffle)).toThrow(
      /No playable encounters remain/,
    );
  });

  it('skips monsters without playable scenarios in a saved chapter-two pile', () => {
    const chapterTwo = advanceAscentChapter(recordAscentResult(hunting(started()), 'victory', [0, 0, 0, 0], NOW), NOW);
    const saved = { ...chapterTwo, drawPile: [...chapterTwo.drawPile, 'the-awakened'] };
    const revealed = revealAscentEncounter(saved, NOW, noShuffle);
    expect(revealed.pending?.monsterId).toBe(chapterTwo.drawPile.at(-1));
    expect(revealed.drawPile).not.toContain('the-awakened');
    expect(beginAscentHunt(revealed, NOW).phase).toBe('hunt');
  });
});

describe('ascent results', () => {
  it('a defeat ends the run: sudden death, no retry', () => {
    const before = hunting(started());
    const monsterId = before.pending?.monsterId;
    const ascent = recordAscentResult(before, 'defeat', [], NOW);
    expect(ascent.phase).toBe('result');
    expect(ascent.result).toBe('defeat');
    expect(ascent.status).toBe('finished');
    expect(ascent.huntHistory?.[0]).toMatchObject({ monsterId, outcome: 'defeat', recordedAt: NOW });
    expect(() => assertHuntEditable(ascent)).toThrow(/already ended/);
    expect(() => advanceAscentChapter(ascent, NOW)).toThrow(/won hunt/);
  });

  it('resets the timer when a chapter hunt begins', () => {
    const encounter = drawn(started());
    const timed = { ...encounter, huntTimer: { durationMs: 1000, elapsedMs: 1000, startedAt: null } };
    expect(beginAscentHunt(timed, NOW).huntTimer).toEqual({ durationMs: null, elapsedMs: 0, startedAt: null });
  });

  it('records the encounter monster when a chapter is won', () => {
    const before = hunting(started());
    const monsterId = before.pending?.monsterId;
    const ascent = recordAscentResult(before, 'victory', [0, 0, 0, 0], NOW);

    expect(ascent.huntHistory?.[0]).toMatchObject({ monsterId, outcome: 'victory', recordedAt: NOW });
  });

  it('a win records the trophy and keeps the monster out of the pile', () => {
    const before = hunting(started());
    const monsterId = before.pending?.monsterId as string;
    const ascent = recordAscentResult(before, 'victory', [0, 0, 0, 0], NOW);
    expect(ascent.result).toBe('victory');
    expect(ascent.status).toBe('running');
    expect(ascent.defeatedMonsterIds).toContain(monsterId);
    expect(ascent.drawPile).not.toContain(monsterId);
  });

  it('advancing grants the next chapter point and clears the encounter', () => {
    let ascent = recordAscentResult(hunting(started()), 'victory', [0, 0, 0, 0], NOW);
    const before = ascent.hunters[0];
    ascent = advanceAscentChapter(ascent, NOW);
    expect(ascent.chapter).toBe(2);
    expect(ascent.phase).toBe('preparing');
    expect(ascent.pending).toBeNull();
    expect(ascent.result).toBeNull();
    expect(ascent.hunters[0].skillPoints).toBe(before.skillPoints + 1);
    expect(ascent.hunters[0].deckCardIds.length).toBeGreaterThan(0);
  });

  it('finishes the ascent after a chapter 3 win', () => {
    let ascent: Ascent = { ...hunting(started()), chapter: 3 };
    ascent = advanceAscentChapter(recordAscentResult(ascent, 'victory', [0, 0, 0, 0], NOW), NOW);
    expect(ascent.status).toBe('finished');
    expect(ascent.result).toBe('victory');
  });
});

describe('ascent progression rules', () => {
  it('swaps family gear up to the chapter level and keeps pieces with no upgrade', () => {
    const upgradeable = forgeEquipment.find(
      (piece) =>
        piece.type !== 'weapon' &&
        piece.level === 1 &&
        piece.expansionId === 'core' &&
        forgeEquipment.some((other) => other.familyId === piece.familyId && other.level === 2),
    );
    expect(upgradeable).toBeDefined();
    const ascent = { ...started(), chapter: 2 as const };
    const worn: EquipmentIds = { ...baseEquipment(daeron), [`${upgradeable!.type}Id`]: upgradeable!.id };
    const swapped = upgradeEquipmentToChapter(ascent, daeron, worn);
    expect(swapped[`${upgradeable!.type}Id`]).toBe(`${upgradeable!.familyId}-l2`);
    // The basic great sword has no level-2 card, so it stays worn.
    expect(swapped.weaponId).toBe(baseEquipment(daeron).weaponId);
  });

  it('offers only chapter-level equipment', () => {
    const pool = ascentEquipmentPool(['core'], daeron, 1);
    expect(pool.length).toBeGreaterThan(0);
    expect(pool.every((piece) => piece.level === 1)).toBe(true);
  });

  it('wears chapter-legal pieces and rejects other levels', () => {
    const ascent = equipSubjectEquipment(started(), 'daeron', 'helm', 'forge-anyone-base-helm-l1', NOW);
    expect(ascent.hunters[0].equipment.helmId).toBe('forge-anyone-base-helm-l1');
    expect(() => equipSubjectEquipment(ascent, 'daeron', 'helm', 'forge-anyone-base-helm-l2', NOW)).toThrow(
      PrimalDomainError,
    );
  });

  it('slots chapter potions only', () => {
    const ascent = started();
    const slotted = equipSubjectPotion(ascent, 'daeron', 0, 'herbalist-anyone-hatrox-l1', NOW);
    expect(slotted.hunters[0].potionLoadoutIds[0]).toBe('herbalist-anyone-hatrox-l1');
    expect(() => equipSubjectPotion(ascent, 'daeron', 0, 'herbalist-anyone-hatrox-l2', NOW)).toThrow(/chapter level/);
  });

  it('unlocks skill steps against the chapter budget', () => {
    let ascent = started();
    expect(ascent.hunters[0].skillPoints).toBe(1);
    ascent = unlockAscentSkillStep(ascent, 'daeron', 'A', NOW);
    expect(ascent.hunters[0].skillTree.A).toBe(1);
    expect(ascent.hunters[0].skillPoints).toBe(0);
    expect(() => unlockAscentSkillStep(ascent, 'daeron', 'B', NOW)).toThrow(/no upgrade/);
  });

  it('tracks wounds up to the sheet cap', () => {
    const ascent = setAscentWoundCount(started(), 'daeron', 2, NOW);
    expect(ascent.hunters[0].woundCount).toBe(2);
    expect(() => setAscentWoundCount(ascent, 'daeron', ASCENT_MAX_WOUNDS + 1, NOW)).toThrow(/between 0 and 3/);
  });

  it('refuses hunt edits once the run has ended', () => {
    const running = hunting(started());
    expect(() => assertHuntEditable(running)).not.toThrow();
    expect(() => assertHuntEditable(recordAscentResult(running, 'defeat', [], NOW))).toThrow(PrimalDomainError);
  });

  it('keeps every deck legal across the chapter swap', () => {
    const ascent = advanceAscentChapter(recordAscentResult(hunting(started()), 'victory', [0, 0, 0, 0], NOW), NOW);
    for (const member of ascent.hunters) {
      const hunter = hunterById(member.hunterId) as Hunter;
      const report = validateDeck(member.deckCardIds, ascentDeckContext(ascent, member, hunter));
      expect(report.issues.filter((issue) => 'cardId' in issue)).toEqual([]);
    }
  });

  it('carries story content for all three chapters', () => {
    for (const chapter of [1, 2, 3] as const) {
      const entry = ascentChapter({ chapter });
      expect(entry?.title).toBeTruthy();
      expect(entry?.paragraphs.length).toBeGreaterThan(0);
      expect(entry?.terrain.length).toBeGreaterThan(0);
    }
  });
});
