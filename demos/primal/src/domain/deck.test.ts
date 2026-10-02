import { describe, expect, it } from 'vitest';
import { hunterById, hunterCards, monsterById, monsters, weaponById } from '../content';
import { createCampaign } from './campaign';
import {
  baseEquipment,
  buildAvailability,
  campaignDeckContext,
  coveredElements,
  type DeckContext,
  deckAdvantages,
  deckTypeOf,
  effectiveEquipment,
  eligibleEquipment,
  expeditionDeckContext,
  fitDeck,
  huntMatchups,
  loadoutDeckContext,
  sameBuild,
  validateDeck,
  wearEquipment,
} from './deck';
import { PrimalDomainError } from './errors';
import { createExpedition, setExpeditionHunters } from './expedition';
import type { EquipmentIds, Hunter, HunterCard, PotionLoadout } from './types';

const NOW = '2025-01-01T00:00:00.000Z';
const daeron = hunterById('daeron') as Hunter;
const actions = hunterCards(daeron).filter((card) => card.kind === 'action');
const ofType = (type: string) => actions.filter((card) => card.subtype === type).map((card) => card.id);
const starter = (type: string) => ofType(type).filter((id) => id.endsWith('-s'));
const vyraxen = monsterById('vyraxen') ?? null; // weak to horn · coral · ice

const CORAL_SET: EquipmentIds = {
  armorId: 'forge-anyone-reefbound-plate-l1',
  helmId: 'forge-anyone-spined-helm-l1',
  itemId: 'forge-anyone-big-jaws-l1',
  weaponId: 'weapon-daeron-bloodreef-l1', // coral · 5/5/4/6
};

const context = (overrides: Partial<DeckContext> = {}): DeckContext => ({
  availableCardIds: new Set(actions.map((card) => card.id)),
  availableEquipmentIds: new Set(),
  availableMasteryIds: new Set(
    hunterCards(daeron)
      .filter((card) => card.kind === 'mastery')
      .map((card) => card.id),
  ),
  availablePotionIds: new Set(),
  equipment: baseEquipment(daeron),
  hunter: daeron,
  huntPool: monsters,
  monster: null,
  ...overrides,
});

const starterDeck = ['Attack', 'Maneuver', 'Parry', 'Dodge'].flatMap(starter);
const starterMasteryId = 'hero-daeron-relentless-assault-s';

describe('deckTypeOf', () => {
  it('maps action subtypes to deck types and ignores masteries', () => {
    expect(deckTypeOf({ kind: 'action', subtype: 'Attack' })).toBe('attack');
    expect(deckTypeOf({ kind: 'action', subtype: 'Dodge' })).toBe('dodge');
    expect(deckTypeOf({ kind: 'mastery', subtype: null })).toBeNull();
    expect(deckTypeOf({ kind: 'action', subtype: null } as Pick<HunterCard, 'kind' | 'subtype'>)).toBeNull();
  });
});

describe('effective equipment and deck advantages', () => {
  it('counts worn pieces whose element the monster is weak to', () => {
    expect(effectiveEquipment(CORAL_SET, vyraxen).map((piece) => piece.id)).toEqual([
      CORAL_SET.weaponId,
      CORAL_SET.armorId,
      CORAL_SET.helmId,
      CORAL_SET.itemId,
    ]);
    expect(effectiveEquipment({ ...CORAL_SET, armorId: 'forge-anyone-base-armor-l1' }, vyraxen)).toHaveLength(3);
    expect(effectiveEquipment(CORAL_SET, null)).toEqual([]);
    expect(effectiveEquipment(CORAL_SET, monsterById('ozew') ?? null)).toHaveLength(2); // horn only
  });

  it('grants one advantage per two effective pieces', () => {
    expect([0, 1, 2, 3, 4].map(deckAdvantages)).toEqual([0, 0, 1, 1, 2]);
  });

  it('lists the elements worn on at least two pieces as coverage', () => {
    // CORAL_SET wears coral ×2 (weapon + plate) and horn ×2 (helm + item).
    expect(coveredElements(CORAL_SET)).toEqual([
      { count: 2, element: 'coral' },
      { count: 2, element: 'horn' },
    ]);
    expect(coveredElements(baseEquipment(daeron))).toEqual([]);
    expect(coveredElements({ ...CORAL_SET, itemId: null })).toEqual([{ count: 2, element: 'coral' }]);
  });

  it('scores each hunt by what equipping the build there would grant, best first', () => {
    const matchups = huntMatchups(CORAL_SET, monsters);
    // Vyraxen (horn/coral/ice) and Kharja (horn/coral/crystal/ice) are weak to both covered elements,
    // so all four pieces count. Ties keep the monster names alphabetical.
    const best = matchups[0].advantages;
    expect(best).toBe(2);
    expect(matchups.filter((entry) => entry.advantages === best).map((entry) => entry.monster.id)).toEqual([
      'kharja',
      'vyraxen',
    ]);
    // Ozew is horn only: two pieces, one advantage.
    expect(matchups.find((entry) => entry.monster.id === 'ozew')).toMatchObject({ advantages: 1 });
    // Every listed monster pays for at least one advantage, and no monster is listed twice.
    expect(matchups.every((entry) => entry.advantages > 0)).toBe(true);
    expect(new Set(matchups.map((entry) => entry.monster.id)).size).toBe(matchups.length);
    // No coverage → no hunt, however large the pool.
    expect(huntMatchups(baseEquipment(daeron), monsters)).toEqual([]);
    // An empty pool grants nothing even with full coverage.
    expect(huntMatchups(CORAL_SET, [])).toEqual([]);
  });

  it('caps the budget at one hunt rather than summing elements no monster shares', () => {
    // Fire ×2 and coral ×2, but no monster is weak to both: the old per-element sum promised 2.
    const split: EquipmentIds = {
      armorId: 'forge-anyone-red-scale-armor-l1',
      helmId: 'forge-anyone-reefbound-helm-l1',
      itemId: 'forge-anyone-coral-trident-l1',
      weaponId: 'weapon-daeron-flame-tounge-l1',
    };
    expect(coveredElements(split).map((entry) => entry.element)).toEqual(['coral', 'fire']);
    const best = huntMatchups(split, monsters)[0];
    expect(best?.advantages).toBe(1);
    const ctx = context({ equipment: split });
    const report = validateDeck([...starterDeck.slice(0, 23), ...ofType('Dodge')], ctx);
    expect(report.advantages).toBe(best?.advantages);
  });
});

describe('validateDeck', () => {
  it('accepts the starter deck with the basic weapon', () => {
    const report = validateDeck(starterDeck, context());
    expect(report).toMatchObject({
      advantages: 0,
      advantagesUsed: 0,
      issues: [],
      required: { attack: 6, dodge: 6, maneuver: 6, parry: 6 },
      selected: { attack: 6, dodge: 6, maneuver: 6, parry: 6 },
      size: 24,
      valid: true,
    });
  });

  it('reports every off-count type once the deck exceeds its advantages', () => {
    const report = validateDeck(starterDeck.slice(1), context());
    expect(report.valid).toBe(false);
    expect(report.issues).toEqual([
      { code: 'composition', required: 6, selected: 5, type: 'attack' },
      { allowed: 0, code: 'advantages-exceeded', used: 1 },
    ]);
  });

  it('lets deck advantages absorb added or removed cards', () => {
    const ctx = context({ equipment: CORAL_SET, monster: vyraxen }); // 4 effective → 2 advantages
    const base = [...ofType('Attack').slice(0, 5), ...ofType('Maneuver').slice(0, 5), ...ofType('Parry').slice(0, 4)];
    const dodge = ofType('Dodge');
    const exact = validateDeck([...base, ...dodge.slice(0, 6)], ctx);
    expect(exact).toMatchObject({ advantages: 2, advantagesUsed: 0, effectiveEquipment: 4, valid: true });

    const plusTwo = validateDeck([...base, ...dodge.slice(0, 8)], ctx);
    expect(plusTwo).toMatchObject({ advantagesUsed: 2, issues: [], valid: true });

    const minusThree = validateDeck([...base, ...dodge.slice(0, 3)], ctx);
    expect(minusThree.valid).toBe(false);
    expect(minusThree.issues.at(-1)).toEqual({ allowed: 2, code: 'advantages-exceeded', used: 3 });
  });

  it('budgets advantages from the best available hunt when no monster is known', () => {
    // No target: coral ×2 and horn ×2, and Vyraxen fears both, so 2 advantages are genuinely on offer.
    const ctx = context({ equipment: CORAL_SET });
    const base = [...ofType('Attack').slice(0, 5), ...ofType('Maneuver').slice(0, 5), ...ofType('Parry').slice(0, 4)];
    const dodge = ofType('Dodge');
    const plusTwo = validateDeck([...base, ...dodge.slice(0, 8)], ctx);
    expect(plusTwo).toMatchObject({ advantages: 2, advantagesUsed: 2, effectiveEquipment: 0, valid: true });

    const plusThree = validateDeck(
      [
        ...ofType('Attack').slice(0, 7),
        ...ofType('Maneuver').slice(0, 5),
        ...ofType('Parry').slice(0, 4),
        ...dodge.slice(0, 8),
      ],
      ctx,
    );
    expect(plusThree.advantages).toBe(2);
    expect(plusThree.valid).toBe(false);
  });

  it('flags unknown, unavailable and duplicated cards', () => {
    const [first] = starterDeck;
    const report = validateDeck([...starterDeck, first, 'nope', ofType('Attack').at(-1) as string], {
      ...context(),
      availableCardIds: new Set(starterDeck),
    });
    expect(report.issues).toEqual(
      expect.arrayContaining([
        { cardId: first, code: 'card-duplicate' },
        { cardId: 'nope', code: 'card-unknown' },
        { cardId: ofType('Attack').at(-1), code: 'card-unavailable' },
      ]),
    );
    expect(report.valid).toBe(false);
  });

  it('requires a weapon', () => {
    const report = validateDeck(starterDeck, context({ equipment: { ...baseEquipment(daeron), weaponId: null } }));
    expect(report.required).toBeNull();
    expect(report.issues).toEqual([{ code: 'no-weapon' }]);
  });
});

describe('fitDeck', () => {
  it('builds the starter deck from an empty selection with the basic weapon', () => {
    expect(fitDeck([], { ...context(), availableCardIds: new Set(starterDeck) })).toEqual(starterDeck);
  });

  it('keeps chosen cards, trims the surplus and fills the gaps after a weapon change', () => {
    const chosen = [
      ...starterDeck,
      ...ofType('Dodge')
        .filter((id) => !id.endsWith('-s'))
        .slice(0, 2),
    ];
    const fitted = fitDeck(chosen, context({ equipment: CORAL_SET }));
    const report = validateDeck(fitted, context({ equipment: CORAL_SET }));
    expect(report.valid).toBe(true);
    expect(report.selected).toEqual(weaponById(CORAL_SET.weaponId as string)?.deckComposition);
    // Attack drops to 5: all kept from the chosen cards; dodge keeps the 6 starters over the extras.
    expect(fitted.filter((id) => starter('Attack').includes(id))).toHaveLength(5);
    expect(fitted.filter((id) => chosen.includes(id))).toHaveLength(fitted.length);
  });

  it('returns nothing without a weapon', () => {
    expect(fitDeck(starterDeck, context({ equipment: { ...baseEquipment(daeron), weaponId: null } }))).toEqual([]);
  });
});

describe('contexts', () => {
  it('campaign pool is the unlocked cards, equipment the crafted pieces, monster the active quest', () => {
    const campaign = createCampaign({
      config: { expansionIds: ['core'], name: 'Deck', nightmareVariant: false, variants: [] },
      hunterIds: ['daeron', 'mirah'],
      id: 'c1',
      now: NOW,
    });
    const member = campaign.hunters[0];
    const ctx = campaignDeckContext(campaign, member, daeron);
    expect([...ctx.availableCardIds].sort()).toEqual([...starterDeck].sort());
    expect([...ctx.availableEquipmentIds]).toEqual(member.craftedEquipmentIds);
    expect(ctx.monster).toBeNull();
    expect(validateDeck(member.deckCardIds, ctx).valid).toBe(true);
  });

  it('expedition pool is every action card and every class-eligible piece from the enabled boxes', () => {
    const expedition = setExpeditionHunters(createExpedition('e1', ['core'], NOW), ['daeron', 'mirah'], NOW);
    const member = expedition.hunters[0];
    const ctx = expeditionDeckContext(expedition, member, daeron);
    expect(ctx.availableCardIds.size).toBe(actions.length);
    expect(
      eligibleEquipment(['core'], daeron).every(
        (piece) => piece.type !== 'weapon' || piece.classRestriction !== 'dual-blades',
      ),
    ).toBe(true);
    expect(ctx.availableEquipmentIds.has('weapon-daeron-bloodreef-l1')).toBe(true);
    expect(validateDeck(member.deckCardIds, ctx).valid).toBe(true);
  });

  it('reward items join the sandbox pool, the Awakened set only while hunting The Awakened', () => {
    const pool = eligibleEquipment(['core'], daeron);
    expect(pool.some((piece) => piece.id === 'reward-anyone-oculus-l1')).toBe(true);
    expect(pool.some((piece) => piece.type !== 'item' && piece.awakenedOnly)).toBe(false);
    expect(
      eligibleEquipment(['core'], daeron, monsterById('the-awakened')).some(
        (piece) => piece.id === 'weapon-daeron-ancient-sword-l3',
      ),
    ).toBe(true);
    expect(
      eligibleEquipment(['core'], daeron, monsterById('kharja')).some(
        (piece) => piece.type !== 'item' && piece.awakenedOnly,
      ),
    ).toBe(false);
  });

  it('loadout context is the sandbox pool without a hunt target', () => {
    const build = { deckCardIds: [], equipment: baseEquipment(daeron), masteryCardId: starterMasteryId };
    const ctx = loadoutDeckContext(['core'], build, daeron);
    expect(ctx.availableCardIds.size).toBe(actions.length);
    expect(ctx.availableEquipmentIds.has('weapon-daeron-bloodreef-l1')).toBe(true);
    expect(ctx.monster).toBeNull();
    expect(validateDeck(fitDeck([], ctx), ctx).valid).toBe(true);
  });

  it('wearing equipment checks the pool and slot, and refits the deck on a weapon change', () => {
    const build = { deckCardIds: [] as string[], equipment: baseEquipment(daeron), masteryCardId: starterMasteryId };
    const ctx = loadoutDeckContext(['core'], build, daeron);
    const fitted = { ...build, deckCardIds: fitDeck([], ctx) };

    const item = wearEquipment(fitted, 'item', 'forge-anyone-big-jaws-l1', ctx);
    expect(item.equipment.itemId).toBe('forge-anyone-big-jaws-l1');
    expect(item.deckCardIds).toEqual(fitted.deckCardIds);

    const swapped = wearEquipment(fitted, 'weapon', 'weapon-daeron-bloodreef-l1', ctx);
    expect(swapped.equipment.weaponId).toBe('weapon-daeron-bloodreef-l1');
    expect(validateDeck(swapped.deckCardIds, { ...ctx, equipment: swapped.equipment }).valid).toBe(true);

    expect(wearEquipment(fitted, 'weapon', null, ctx)).toMatchObject({ deckCardIds: [] });
    expect(() => wearEquipment(fitted, 'helm', 'forge-anyone-big-jaws-l1', ctx)).toThrowError(
      expect.objectContaining({ code: 'equipment-invalid' }),
    );
    expect(() => wearEquipment(fitted, 'weapon', 'weapon-karah-dancing-bones-l1', ctx)).toThrowError(PrimalDomainError);
  });

  it('base equipment is the basic weapon plus base armor and helm', () => {
    expect(baseEquipment(daeron)).toEqual({
      armorId: 'forge-anyone-base-armor-l1',
      helmId: 'forge-anyone-base-helm-l1',
      itemId: null,
      weaponId: 'weapon-daeron-great-sword-l1',
    });
  });
});

describe('buildAvailability and sameBuild', () => {
  const potions: PotionLoadout = ['herbalist-anyone-alemore-l3', null, null];

  it('lists the equipment, cards and potions a context cannot supply', () => {
    const ctx = context({ availableCardIds: new Set(starterDeck), availableEquipmentIds: new Set() });
    const extra = ofType('Attack').find((id) => !id.endsWith('-s')) as string;
    const result = buildAvailability(
      {
        deckCardIds: [...starterDeck, extra],
        equipment: CORAL_SET,
        masteryCardId: starterMasteryId,
        potionLoadoutIds: potions,
      },
      ctx,
    );
    expect(result).toEqual({
      available: false,
      missingCardIds: [extra],
      missingEquipmentIds: [CORAL_SET.weaponId, CORAL_SET.armorId, CORAL_SET.helmId, CORAL_SET.itemId],
      missingPotionIds: ['herbalist-anyone-alemore-l3'],
    });
    expect(
      buildAvailability(
        { deckCardIds: starterDeck, equipment: CORAL_SET, masteryCardId: starterMasteryId, potionLoadoutIds: potions },
        context({
          availableEquipmentIds: new Set(Object.values(CORAL_SET) as string[]),
          availablePotionIds: new Set(['herbalist-anyone-alemore-l3']),
        }),
      ).available,
    ).toBe(true);
  });

  it('compares builds regardless of card order', () => {
    const build = {
      deckCardIds: starterDeck,
      equipment: CORAL_SET,
      masteryCardId: starterMasteryId,
      potionLoadoutIds: potions,
    };
    expect(sameBuild(build, { ...build, deckCardIds: [...starterDeck].reverse() })).toBe(true);
    expect(sameBuild(build, { ...build, equipment: { ...CORAL_SET, itemId: null } })).toBe(false);
    expect(sameBuild(build, { ...build, deckCardIds: starterDeck.slice(1) })).toBe(false);
    expect(sameBuild(build, { ...build, masteryCardId: 'hero-daeron-dragon-guard-a2' })).toBe(false);
    expect(sameBuild(build, { ...build, potionLoadoutIds: [null, 'herbalist-anyone-alemore-l3', null] })).toBe(false);
  });
});
