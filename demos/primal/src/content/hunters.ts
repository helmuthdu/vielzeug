import type { Hunter, WeaponClass, WeaponClassId } from '../domain/types';
import { buildSkillTree } from './hunter-cards';

export const weaponClasses: WeaponClass[] = [
  {
    cardFolder: 'weapon_great_sword',
    icon: '/icons/icon_weapon_great_sword.svg',
    id: 'great-sword',
    name: 'Great Sword',
  },
  { cardFolder: 'weapon_bow', icon: '/icons/icon_weapon_bow.svg', id: 'great-bow', name: 'Great Bow' },
  { cardFolder: 'weapon_hammer', icon: '/icons/icon_weapon_hammer.svg', id: 'hammer', name: 'Hammer' },
  {
    cardFolder: 'weapon_sword_and_shield',
    icon: '/icons/icon_weapon_sword_and_shield.svg',
    id: 'sword-and-shield',
    name: 'Sword and Shield',
  },
  {
    cardFolder: 'weapon_dual_blade',
    icon: '/icons/icon_weapon_dual_blade.svg',
    id: 'dual-blades',
    name: 'Dual Blades',
  },
  { cardFolder: 'weapon_gunbow', icon: '/icons/icon_weapon_gunbow.svg', id: 'gunbow', name: 'Gunbow' },
  { cardFolder: 'weapon_spear', icon: '/icons/icon_weapon_spear.svg', id: 'spear', name: 'Spear' },
  { cardFolder: 'weapon_drum', icon: '/icons/icon_weapon_drummer.svg', id: 'war-drum', name: 'War Drum' },
];

export const weaponClassById = (id: WeaponClassId): WeaponClass =>
  weaponClasses.find((weapon) => weapon.id === id) as WeaponClass;

function hunter(
  id: string,
  data: Pick<
    Hunter,
    'artwork' | 'cardFolder' | 'classId' | 'description' | 'expansionId' | 'name' | 'playstyle' | 'title'
  >,
): Hunter {
  return { ...data, id, skillTree: buildSkillTree({ cardFolder: data.cardFolder, id }) };
}

export const hunters: Hunter[] = [
  hunter('daeron', {
    artwork: '/heroes/hero_great_sword.webp',
    cardFolder: 'hero_great_sword_daeron',
    classId: 'great-sword',
    description:
      'A veteran of the Hunters’ Corps who trusts weight over finesse. Daeron’s Slash cards chain into devastating finishers when he commits to a sector.',
    expansionId: 'core',
    name: 'Daeron',
    playstyle: ['Heavy damage', 'Slash chains', 'Finishers'],
    title: 'The Blade of Alborea',
  }),
  hunter('mirah', {
    artwork: '/heroes/hero_bow.webp',
    cardFolder: 'hero_bow_mirah',
    classId: 'great-bow',
    description:
      'The quietness of the forest is just an illusion: there is always something to hear, a footprint to see, a perfect point from which to take aim. Your arrow moves like a predator: swift, silent, and deadly.',
    expansionId: 'core',
    name: 'Mirah',
    playstyle: ['Ranged', 'Aim', 'Positioning'],
    title: 'The Far-Sighted',
  }),
  hunter('thoreg', {
    artwork: '/heroes/hero_hammer.webp',
    cardFolder: 'hero_hammer_thoreg',
    classId: 'hammer',
    description:
      'A former quarry-master whose hammer stuns behaviors and breaks stances. Thoreg thrives when the monster’s struggle builds and everyone else falls back.',
    expansionId: 'core',
    name: 'Thoreg',
    playstyle: ['Stun', 'Struggle control', 'Burst'],
    title: 'The Mountain’s Fist',
  }),
  hunter('ljonar', {
    artwork: '/heroes/hero_sword_and_shield.webp',
    cardFolder: 'hero_sword_and_shield_ljonar',
    classId: 'sword-and-shield',
    description:
      'A steadfast shield-bearer of the garrison. Ljonar holds aggro, parries what would fell others and keeps the party’s attrition checks safe.',
    expansionId: 'core',
    name: 'Ljonar',
    playstyle: ['Aggro', 'Parry', 'Protection'],
    title: 'The Unbroken Wall',
  }),
  hunter('karah', {
    artwork: '/heroes/hero_dual_blades.webp',
    cardFolder: 'hero_dual_blade_karah',
    classId: 'dual-blades',
    description:
      'A restless duelist who never stays in one sector. Karah dances between flanks with Claw cards, trading defense for relentless pressure.',
    expansionId: 'mount-havoc',
    name: 'Karah',
    playstyle: ['Fast attacks', 'Claw', 'Evasion'],
    title: 'The Twin Fang',
  }),
  hunter('heleren', {
    artwork: '/heroes/hero_gunbow.webp',
    cardFolder: 'hero_gunbow_heleren',
    classId: 'gunbow',
    description:
      'An inventor of the Alborean workshops. Heleren manages a bullet track, reloading between volleys to unleash precise, explosive shots.',
    expansionId: 'mount-havoc',
    name: 'Heleren',
    playstyle: ['Bullets', 'Reload', 'Precision'],
    title: 'The Tinkerer',
  }),
  hunter('zaraya', {
    artwork: '/heroes/hero_spear.webp',
    cardFolder: 'hero_spear_zaraya',
    classId: 'spear',
    description:
      'A spear-maiden trained under Commander Reja herself. Zaraya threads maneuvers into thrusts, keeping perfect distance from the monster’s jaws.',
    expansionId: 'heart-of-the-wild',
    name: 'Zaraya',
    playstyle: ['Reach', 'Maneuver', 'Counter'],
    title: 'The Commander’s Spear',
  }),
  hunter('drusk', {
    artwork: '/heroes/hero_drummer.webp',
    cardFolder: 'hero_drum_drusk',
    classId: 'war-drum',
    description:
      'A drummer whose rhythm carries across the combat board. Drusk empowers allies with every beat, turning the party’s sequence into a war chant.',
    expansionId: 'heart-of-the-wild',
    name: 'Drusk',
    playstyle: ['Support', 'Assist', 'Rhythm'],
    title: 'The Thunder of Drums',
  }),
];

export const hunterById = (id: string): Hunter | undefined => hunters.find((entry) => entry.id === id);
