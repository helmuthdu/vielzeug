import { base64UrlToText } from '@vielzeug/arsenal';
import { describe, expect, it } from 'vitest';
import { hunterById, hunterCards } from '../content';
import { baseEquipment, loadoutDeckContext, validateDeck } from './deck';
import { PrimalDomainError } from './errors';
import {
  createLoadout,
  decodeLoadoutCode,
  encodeLoadoutCode,
  loadoutCodeFromText,
  type SharedBuild,
  setLoadoutEquipment,
  setLoadoutMastery,
  setLoadoutPotion,
} from './loadout';
import type { Hunter } from './types';

const daeron = hunterById('daeron') as Hunter;
const actions = hunterCards(daeron).filter((card) => card.kind === 'action');
const starterDeck = actions.filter((card) => card.id.endsWith('-s')).map((card) => card.id);

const build: SharedBuild = {
  deckCardIds: [...starterDeck.slice(2), actions.find((card) => !card.id.endsWith('-s'))?.id as string],
  equipment: {
    armorId: 'forge-anyone-reefbound-plate-l1',
    helmId: null,
    itemId: 'forge-anyone-big-jaws-l1',
    weaponId: 'weapon-daeron-bloodreef-l1',
  },
  hunterId: 'daeron',
  masteryCardId: 'hero-daeron-dragon-guard-a2',
  name: 'Coral Reef',
  potionLoadoutIds: ['herbalist-anyone-alemore-l3', null, 'herbalist-anyone-alemore-l1'],
};

describe('loadout codes', () => {
  it('round-trips a build as URL-safe text', () => {
    const code = encodeLoadoutCode(build);
    expect(code).toMatch(/^[A-Za-z0-9_-]+$/);
    const decoded = decodeLoadoutCode(code);
    expect(decoded.equipment).toEqual(build.equipment);
    expect(decoded.hunterId).toBe('daeron');
    expect(decoded.masteryCardId).toBe('hero-daeron-dragon-guard-a2');
    expect(decoded.name).toBe('Coral Reef');
    expect(decoded.potionLoadoutIds).toEqual(build.potionLoadoutIds);
    expect([...decoded.deckCardIds].sort()).toEqual([...build.deckCardIds].sort());
  });

  it('round-trips an empty deck and empty equipment', () => {
    const bare: SharedBuild = {
      deckCardIds: [],
      equipment: { ...baseEquipment(daeron), armorId: null, helmId: null, weaponId: null },
      hunterId: 'daeron',
      masteryCardId: 'hero-daeron-relentless-assault-s',
      name: '',
      potionLoadoutIds: [null, null, null],
    };
    expect(decodeLoadoutCode(encodeLoadoutCode(bare))).toEqual(bare);
  });

  it('encodes catalog indices, not id strings', () => {
    const code = encodeLoadoutCode(build);
    const payload = JSON.parse(base64UrlToText(code)) as { e: unknown[]; m: unknown; p: unknown[] };
    expect(payload.e.every((entry) => entry === null || typeof entry === 'number')).toBe(true);
    expect(payload.p.every((entry) => entry === null || typeof entry === 'number')).toBe(true);
    expect(typeof payload.m).toBe('number');
    // The full build: deck, four equipment pieces, mastery, two potions: stays compact.
    expect(code.length).toBeLessThan(160);
  });

  it('rejects garbage, old versions, unknown hunters, out-of-range indices, type mismatches and repeated potions', () => {
    const codeOf = (payload: unknown) => btoa(JSON.stringify(payload)).replace(/=+$/, '');
    const v4 = {
      d: '',
      e: [null, null, null, null],
      h: 'daeron',
      m: 0,
      n: '',
      p: [null, null, null],
      v: 4,
    };
    const cases = [
      'not a code',
      codeOf({ v: 3 }),
      codeOf({ ...v4, p: undefined, v: 1 }),
      codeOf({ ...v4, h: 'nobody' }),
      codeOf({ ...v4, m: 9999 }),
      codeOf({ ...v4, e: [9999, null, null, null] }),
      codeOf({ ...v4, e: ['forge-anyone-base-armor-l1', null, null, null] }),
      codeOf({ ...v4, d: 'xyz' }),
      codeOf({ ...v4, p: [999, null, null] }),
      codeOf({ ...v4, p: [0, 0, null] }),
    ];
    for (const code of cases) {
      expect(() => decodeLoadoutCode(code)).toThrowError(PrimalDomainError);
      expect(() => decodeLoadoutCode(code)).toThrowError(expect.objectContaining({ code: 'loadout-invalid' }));
    }
  });
});

describe('loadoutCodeFromText', () => {
  it('extracts the code from bare text and from share links', () => {
    expect(loadoutCodeFromText('  abc-123_ ')).toBe('abc-123_');
    expect(loadoutCodeFromText('https://host/app/build/abc-123_')).toBe('abc-123_');
    expect(loadoutCodeFromText('https://host/demos/primal/#/build/abc-123_?x=1')).toBe('abc-123_');
  });
});

describe('saved builds', () => {
  const NOW = '2025-01-01T00:00:00.000Z';

  it('starts from base equipment with a fitted deck', () => {
    const loadout = createLoadout('daeron', ['core'], { id: 'l1', name: 'Fresh', now: NOW });
    expect(loadout).toMatchObject({
      equipment: baseEquipment(daeron),
      hunterId: 'daeron',
      id: 'l1',
      masteryCardId: 'hero-daeron-relentless-assault-s',
      name: 'Fresh',
    });
    expect(validateDeck(loadout.deckCardIds, loadoutDeckContext(['core'], loadout, daeron)).valid).toBe(true);
    expect(() => createLoadout('nobody', ['core'], { id: 'l2', name: 'x', now: NOW })).toThrowError(PrimalDomainError);
  });

  it('changes equipment against the owned boxes and stamps the update', () => {
    const loadout = createLoadout('daeron', ['core'], { id: 'l1', name: 'Fresh', now: NOW });
    const later = '2025-01-02T00:00:00.000Z';
    const worn = setLoadoutEquipment(loadout, 'weapon', 'weapon-daeron-bloodreef-l1', ['core'], later);
    expect(worn.equipment.weaponId).toBe('weapon-daeron-bloodreef-l1');
    expect(worn.updatedAt).toBe(later);
    expect(validateDeck(worn.deckCardIds, loadoutDeckContext(['core'], worn, daeron)).valid).toBe(true);
    expect(() => setLoadoutEquipment(loadout, 'weapon', 'weapon-karah-dancing-bones-l1', ['core'], later)).toThrowError(
      expect.objectContaining({ code: 'equipment-restricted' }),
    );
  });

  it('chooses any catalogued mastery of the hunter and rejects others', () => {
    const loadout = createLoadout('daeron', ['core'], { id: 'l1', name: 'Fresh', now: NOW });
    const later = '2025-01-02T00:00:00.000Z';
    const branchMastery = 'hero-daeron-the-berserker-b2';
    const picked = setLoadoutMastery(loadout, branchMastery, ['core'], later);
    expect(picked.masteryCardId).toBe(branchMastery);
    expect(picked.updatedAt).toBe(later);
    expect(() => setLoadoutMastery(loadout, 'hero-ljonar-nothing', ['core'], later)).toThrow(
      expect.objectContaining({ code: 'loadout-invalid' }),
    );
  });

  it('slots potions from the owned boxes, one slot per potion', () => {
    const loadout = createLoadout('daeron', ['core'], { id: 'l1', name: 'Fresh', now: NOW });
    expect(loadout.potionLoadoutIds).toEqual([null, null, null]);
    const later = '2025-01-02T00:00:00.000Z';
    const slotted = setLoadoutPotion(loadout, 1, 'herbalist-anyone-alemore-l3', ['core'], later);
    expect(slotted.potionLoadoutIds).toEqual([null, 'herbalist-anyone-alemore-l3', null]);
    expect(slotted.updatedAt).toBe(later);
    expect(() => setLoadoutPotion(slotted, 0, 'herbalist-anyone-alemore-l3', ['core'], later)).toThrowError(
      expect.objectContaining({ code: 'potion-loadout' }),
    );
    expect(() => setLoadoutPotion(loadout, 0, 'no-such-potion', ['core'], later)).toThrowError(
      expect.objectContaining({ code: 'potion-locked' }),
    );
    expect(setLoadoutPotion(slotted, 1, null, ['core'], later).potionLoadoutIds).toEqual([null, null, null]);
  });
});
