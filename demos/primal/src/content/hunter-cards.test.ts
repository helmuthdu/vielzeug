import { describe, expect, it } from 'vitest';
import { hunterCards, SKILL_BRANCH_IDS, starterCards, stepCards } from './hunter-cards';
import { hunterById, hunters } from './hunters';
import { keywords } from './keywords';

const DECK_TYPES = ['Attack', 'Maneuver', 'Parry', 'Dodge'] as const;

/** Mirrors `slug` in hunter-cards.ts: the scan index keys cards by this normalization. */
const nameSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '');

describe('hunter card pools', () => {
  it('derives the printed tree for every hunter: 25 starter + 25 upgrades', () => {
    for (const hunter of hunters) {
      expect(starterCards(hunter)).toHaveLength(25);
      for (const branch of SKILL_BRANCH_IDS) {
        const first = stepCards(hunter, branch, 1);
        const second = stepCards(hunter, branch, 2);
        expect(first.map((card) => card.kind)).toEqual(['action', 'action']);
        expect(second.map((card) => card.kind)).toEqual(['action', 'action', 'mastery']);
        const tree = hunter.skillTree.find((entry) => entry.id === branch);
        expect(tree?.steps[0]).toEqual({ cardCount: 2, cardIds: first.map((card) => card.id) });
        expect(tree?.steps[1]).toEqual({ cardCount: 3, cardIds: second.map((card) => card.id) });
      }
    }
  });

  it('gives every hunter a starter deck of six cards per type, matching the base weapon composition', () => {
    for (const hunter of hunters) {
      const actions = starterCards(hunter).filter((card) => card.kind === 'action');
      expect(actions).toHaveLength(24);
      for (const type of DECK_TYPES) {
        expect(
          actions.filter((card) => card.subtype === type),
          `${hunter.id} ${type}`,
        ).toHaveLength(6);
      }
    }
  });

  it('types every action card and gives every mastery both faces', () => {
    for (const hunter of hunters) {
      for (const card of hunterCards(hunter)) {
        if (card.kind === 'mastery') {
          expect(card.subtype, card.id).toBeNull();
          expect(card.unfocused?.counters, card.id).toBeGreaterThan(0);
          expect(card.unfocused?.text, card.id).toBeTruthy();
          expect(card.focused?.text, card.id).toBeTruthy();
        } else {
          expect(DECK_TYPES, card.id).toContain(card.subtype);
          expect(card.cardType, card.id).toBe(
            card.subtype === 'Attack' || card.subtype === 'Maneuver' ? 'Offensive' : 'Defensive',
          );
          expect(card.text, card.id).toBeTruthy();
        }
      }
    }
  });

  it('pairs upgrade cards with their scans and prefers the scan that names the step', () => {
    const daeron = hunterById('daeron');
    if (!daeron) throw new Error('missing daeron');
    expect(stepCards(daeron, 'A', 1).map((card) => card.art)).toEqual([
      '/cards/hero_great_sword_daeron/great_sword_a1_balanceddefense.webp',
      '/cards/hero_great_sword_daeron/great_sword_a1_lateralmove.webp',
    ]);
    expect(stepCards(daeron, 'E', 2).at(-1)).toMatchObject({
      art: '/cards/hero_great_sword_daeron/great_sword_mue_swordmaster.webp',
      artFocused: '/cards/hero_great_sword_daeron/great_sword_mfe_swordmaster.webp',
      name: 'Sword Master',
    });
    expect(stepCards(daeron, 'C', 1).map((card) => card.art)).toEqual([
      '/cards/hero_great_sword_daeron/great_sword_c1_defensiveinsight.webp',
      '/cards/hero_great_sword_daeron/great_sword_c1_guardian.webp',
    ]);
  });

  it('has a scan for every card and a focused scan for every mastery', () => {
    for (const hunter of hunters) {
      for (const card of hunterCards(hunter)) {
        expect(card.art, card.id).not.toBeNull();
        if (card.kind === 'mastery') expect(card.artFocused, card.id).not.toBeNull();
      }
    }
  });

  // Stamina domains observed across the printed core set; expansions may extend them,
  // which should force a conscious update here rather than pass silently.
  it('keeps stamina values inside the printed domains and off mastery cards', () => {
    for (const hunter of hunters) {
      for (const card of hunterCards(hunter)) {
        if (card.kind === 'mastery') {
          expect(card.staminaCost, card.id).toBeNull();
          expect(card.staminaIcons, card.id).toBeNull();
        } else {
          expect([0, 1, 2, 3, 4, 'X'], card.id).toContain(card.staminaCost);
          expect([1, 2, 3], card.id).toContain(card.staminaIcons);
        }
      }
    }
  });

  it('resolves every printed trait against the rulebook glossary', () => {
    const glossary = new Set(keywords.map((keyword) => keyword.name));
    for (const hunter of hunters) {
      for (const card of hunterCards(hunter)) {
        for (const trait of (card.trait ?? '')
          .split('.')
          .map((part) => part.trim())
          .filter(Boolean)) {
          expect(glossary, `${card.id}: ${trait}`).toContain(trait);
        }
      }
    }
  });

  it('gives every card a unique id and a unique scan slug per hunter', () => {
    const ids = new Set<string>();
    for (const hunter of hunters) {
      const slugs = new Set<string>();
      for (const card of hunterCards(hunter)) {
        expect(ids.has(card.id), card.id).toBe(false);
        ids.add(card.id);
        const slug = nameSlug(card.name);
        expect(slugs.has(slug), `${card.id} shares its scan slug with another card`).toBe(false);
        slugs.add(slug);
      }
    }
  });
});
