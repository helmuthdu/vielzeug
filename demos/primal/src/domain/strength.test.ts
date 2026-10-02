import { describe, expect, it } from 'vitest';
import { forgeById, hunterById, hunterCardById, hunters } from '../content';
import {
  buildProfile,
  cardSignal,
  equipmentSignal,
  hunterProfile,
  STRENGTH_AXES,
  starterBuild,
  textSignal,
} from './strength';
import type { Hunter, HunterStrengthAxis } from './types';

const hunter = (id: string): Hunter => {
  const entry = hunterById(id);
  if (!entry) throw new Error(`Hunter ${id} is missing`);
  return entry;
};

const profileRow = (profile: ReturnType<typeof hunterProfile>) => STRENGTH_AXES.map((axis) => profile[axis]);

describe('strength profiles', () => {
  it('profiles every hunter in the 1-5 range on all six axes', () => {
    for (const entry of hunters) {
      for (const axis of STRENGTH_AXES) {
        expect(hunterProfile(entry)[axis]).toBeGreaterThanOrEqual(1);
        expect(hunterProfile(entry)[axis]).toBeLessThanOrEqual(5);
      }
    }
  });

  it('anchors the roster: per axis the weakest starter reads 1.5, the strongest 3.5', () => {
    const profiles = hunters.map(hunterProfile);

    for (const axis of STRENGTH_AXES) {
      const values = profiles.map((profile) => profile[axis]);

      expect(Math.min(...values)).toBe(1.5);
      expect(Math.max(...values)).toBe(3.5);
    }
  });

  it('defines a hunter profile as the profile of their starter build', () => {
    for (const entry of hunters) {
      expect(hunterProfile(entry)).toEqual(buildProfile(starterBuild(entry), entry));
    }
  });

  it('pins the starter profiles in axis order power, defense, mobility, speed, control, support', () => {
    const expected: Record<string, number[]> = {
      daeron: [2.7, 2.3, 1.6, 2.6, 1.7, 1.9],
      drusk: [1.5, 1.5, 1.7, 1.5, 1.8, 3.5],
      heleren: [2.3, 3.5, 1.6, 1.5, 2.1, 2.1],
      karah: [2.0, 2.0, 3.5, 3.5, 1.8, 1.5],
      ljonar: [2.3, 2.3, 1.5, 1.5, 3.5, 2.7],
      mirah: [3.5, 3.4, 1.6, 1.7, 1.5, 1.8],
      thoreg: [2.9, 1.8, 1.8, 1.7, 3.3, 1.9],
      zaraya: [2.7, 1.9, 2.9, 1.9, 2.2, 3.0],
    };

    for (const [id, values] of Object.entries(expected)) {
      expect(profileRow(hunterProfile(hunter(id))), id).toEqual(values);
    }
  });

  it('reads printed effect text into per-axis points', () => {
    const stun = textSignal('Stun the monster.');

    expect(stun.control).toBe(2);
    expect(stun.power).toBe(1);
    expect(textSignal('Choose another player to heal [weapon].').defense).toBe(0);
    expect(textSignal('Choose another player to heal [weapon].').support).toBe(3);
    expect(textSignal('Increase the damage this attack deals by 5[weapon].').power).toBe(2.5);
    expect(textSignal('Draw 2.').speed).toBe(1.5);
  });

  it('weighs a Resonance card’s effect points half again', () => {
    const drusk = hunter('drusk');
    const card = hunterCardById(drusk, 'hero-drusk-backbeat-s');

    if (!card || card.trait !== 'Resonance') throw new Error('Expected a Resonance card');

    const text = [card.text, card.unfocused?.text, card.focused?.text].filter(Boolean).join(' | ');
    const scaled = textSignal(text);
    // Backbeat is a Dodge: the subtype adds defense 0.5 and mobility 0.5 on top of its text.
    const expected: Record<HunterStrengthAxis, number> = {
      control: 1.5 * scaled.control,
      defense: 0.5 + 1.5 * scaled.defense,
      mobility: 0.5 + 1.5 * scaled.mobility,
      power: 1.5 * scaled.power,
      speed: 1.5 * scaled.speed,
      support: 1.5 * scaled.support,
    };

    expect(cardSignal(card)).toEqual(expected);
  });

  it('reads multi-sentence and listed effects without hand-written corrections', () => {
    const piece = (id: string) => {
      const entry = forgeById(id);
      if (!entry) throw new Error(`${id} is missing`);
      return entry;
    };

    // Terrain immunity widens with every terrain listed: two, three, then four.
    expect(
      ['l1', 'l2', 'l3'].map((level) => equipmentSignal(piece(`forge-anyone-frozen-boots-${level}`)).mobility),
    ).toEqual([1, 1.5, 2]);
    // Lava Buckler's trigger and its prevention sit in different sentences.
    for (const level of ['l1', 'l2', 'l3']) {
      expect(equipmentSignal(piece(`forge-anyone-lava-buckler-${level}`)).defense, level).toBe(2);
    }
  });

  it('scores a mastery’s unfocused face by its effects, never its charging trigger', () => {
    const card = (hunterId: string, cardId: string) => {
      const entry = hunterCardById(hunter(hunterId), cardId);
      if (!entry?.focused) throw new Error(`${cardId} is missing`);
      return entry;
    };
    const silencer = card('mirah', 'hero-mirah-the-silencer-c2');
    const deadlyAim = card('mirah', 'hero-mirah-deadly-aim-d2');
    const bloodRush = card('thoreg', 'hero-thoreg-blood-rush-d2');

    // "When you inflict blind" and "When you recycle a card" only charge the mastery.
    expect(cardSignal(silencer).control).toBe(textSignal(silencer.focused?.text ?? '').control);
    expect(cardSignal(deadlyAim).speed).toBe(textSignal(deadlyAim.focused?.text ?? '').speed);
    // Blood Rush's unfocused face draws while it charges: that effect still scores.
    expect(cardSignal(bloodRush).speed).toBeGreaterThan(textSignal(bloodRush.focused?.text ?? '').speed);
  });

  it('moves a build’s profile as its gear and deck change', () => {
    const daeron = hunter('daeron');
    const starter = starterBuild(daeron);

    expect(
      buildProfile(
        { ...starter, equipment: { ...starter.equipment, weaponId: 'weapon-daeron-aurean-blade-l3' } },
        daeron,
      ).power,
    ).toBe(3.5);
    expect(
      buildProfile(
        {
          ...starter,
          equipment: {
            ...starter.equipment,
            armorId: 'forge-anyone-iron-plate-l3',
            helmId: 'forge-anyone-iron-helm-l3',
          },
        },
        daeron,
      ).defense,
    ).toBe(4.7);
    expect(buildProfile({ ...starter, deckCardIds: starter.deckCardIds.slice(4) }, daeron).power).toBe(2.1);
  });
});
