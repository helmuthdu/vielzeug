import type { ElementId, Monster, SpecialRule } from '../domain/types';
import { monsterDamage } from './monster-damage';
import { SPECIAL_RULES, type SpecialRuleId } from './special-rules';

/**
 * Monster reference data.
 *
 * Elements come from the Forge cards each monster unlocks in the campaign book. Weaknesses mirror
 * the printed reference; its Bone and Frost labels map to the domain's Horn and Ice elements.
 */

const trophy = (name: string) => `/monsters/${name}.svg`;

function resolveRules(ruleIds: SpecialRuleId[]): SpecialRule[] {
  return ruleIds.map((id) => {
    const rule = SPECIAL_RULES[id];
    if (!rule) throw new Error(`Missing special rule metadata for ${id}`);
    return { text: rule.description, title: rule.name };
  });
}

function monster(
  id: string,
  data: Omit<Monster, 'aggressionLevels' | 'id' | 'stanceDamage' | 'trophyIcon' | 'specialRules'> & {
    specialRules?: SpecialRuleId[];
  } & Partial<Pick<Monster, 'aggressionLevels' | 'trophyIcon'>>,
): Monster {
  const { specialRules, ...rest } = data;
  return {
    aggressionLevels: [0, 1, 2, 3],
    specialRules: resolveRules(specialRules ?? []),
    stanceDamage: monsterDamage[id] ?? [],
    trophyIcon: trophy(data.name.replace(/\s+/g, '-')),
    ...rest,
    id,
  };
}

const monsterWeaknesses = {
  dygorax: ['coral', 'metal', 'venom', 'ice'],
  felaxir: ['fire', 'metal', 'venom'],
  hurom: ['fire', 'thunder'],
  hydar: ['fire', 'metal', 'ice'],
  jekoros: ['crystal', 'feather'],
  kharja: ['horn', 'coral', 'crystal', 'ice'],
  korowon: ['horn', 'thunder', 'feather', 'venom'],
  mamuraak: ['fire', 'crystal', 'feather'],
  morkraas: ['fire', 'metal', 'ice'],
  nagarjas: ['coral', 'crystal', 'thunder', 'venom'],
  orouxen: ['crystal', 'thunder', 'feather'],
  ozew: ['horn', 'crystal'],
  pazis: ['horn', 'thunder', 'ice'],
  reikal: ['coral', 'feather'],
  sirkaaj: ['horn', 'metal', 'venom'],
  taraska: ['coral', 'ice'],
  tarragua: ['fire', 'thunder', 'feather'],
  toramat: ['coral', 'metal', 'venom'],
  vyraxen: ['horn', 'coral', 'ice'],
  xitheros: ['fire', 'horn', 'thunder', 'venom'],
  zekalith: ['crystal', 'metal', 'feather'],
  zekath: ['crystal', 'metal', 'feather'],
} satisfies Record<string, ElementId[]>;

export const monsters: Monster[] = [
  monster('vyraxen', {
    description:
      'A winged predator crowned with long, flared spines. It dives through the canopy in flames; its landing boils nearby water and blankets the ground in steam.',
    element: 'fire',
    expansionId: 'core',
    habitat: 'Slopes of Woltyar',
    name: 'Vyraxen',
    specialRules: ['vyraxen-prologue'],
    weaknesses: monsterWeaknesses.vyraxen,
  }),
  monster('toramat', {
    description: 'An armored charger of the Red Peaks. It lowers its plated head and barrels through dust and rock.',
    element: 'horn',
    expansionId: 'core',
    habitat: 'Salt Desert and Red Peaks',
    name: 'Toramat',
    specialRules: [
      'toramat-behavior-deck-setup',
      'toramat-dust-tokens',
      'toramat-hardening-track',
      'toramat-special-attrition-cards',
    ],
    weaknesses: monsterWeaknesses.toramat,
  }),
  monster('ozew', {
    description:
      'A winged insect with a charged horn. Its helical swarm flight generates magnetic fields strong enough to throw airships off course.',
    element: 'thunder',
    expansionId: 'core',
    habitat: 'Dragon’s Ridge Mountains',
    name: 'Ozew',
    specialRules: ['ozew-behavior-deck-setup', 'ozew-rumble-deck-setup', 'ozew-swarm-deck-setup'],
    weaknesses: monsterWeaknesses.ozew,
  }),
  monster('korowon', {
    description: 'A leviathan of the coral reefs whose roar can be heard from Alborea’s harbor on stormy nights.',
    element: 'coral',
    expansionId: 'core',
    habitat: 'Coral coast',
    name: 'Korowon',
    weaknesses: monsterWeaknesses.korowon,
  }),
  monster('felaxir', {
    description:
      'The pack leader. A silver-furred carnivore that hunts with its brood and has made the seekers’ desert camps its territory.',
    element: 'crystal',
    expansionId: 'core',
    habitat: 'Sunset Plains',
    name: 'Felaxir',
    weaknesses: monsterWeaknesses.felaxir,
  }),
  monster('hurom', {
    description: 'A burrowing beast with claws of living metal, said to sit upon a throne under the mountain.',
    element: 'metal',
    expansionId: 'core',
    habitat: 'Goldark mines',
    name: 'Hurom',
    weaknesses: monsterWeaknesses.hurom,
  }),
  monster('tarragua', {
    description: 'The Iron Eater. A colossal grazer that devours ore and grows plates of raw metal along its back.',
    element: 'metal',
    expansionId: 'core',
    habitat: 'Zarka Temple ruins',
    name: 'Tarragua',
    weaknesses: monsterWeaknesses.tarragua,
  }),
  monster('orouxen', {
    description: 'A luminous cave-dweller from the submerged lands whose hide glitters like a field of stars.',
    element: 'coral',
    expansionId: 'core',
    habitat: 'Cave of Stars',
    name: 'Orouxen',
    weaknesses: monsterWeaknesses.orouxen,
  }),
  monster('kharja', {
    description: 'A many-limbed fire predator that nests among the halls of the City of Remembrance.',
    element: 'fire',
    expansionId: 'core',
    habitat: 'City of Remembrance',
    name: 'Kharja',
    weaknesses: monsterWeaknesses.kharja,
  }),
  monster('dygorax', {
    description:
      'The dragon with a thousand faces. Ancient Kaer Maga was built around its tomb, and it was never truly dead.',
    element: 'horn',
    expansionId: 'core',
    habitat: 'Ancient Kaer Maga',
    name: 'Dygorax',
    weaknesses: monsterWeaknesses.dygorax,
  }),
  monster('morkraas', {
    description: 'A crystalline behemoth that spreads crystallization wherever it walks.',
    element: 'crystal',
    expansionId: 'core',
    habitat: 'Crystal Mountain',
    name: 'Morkraas',
    weaknesses: monsterWeaknesses.morkraas,
  }),
  monster('jekoros', {
    description: 'A thunder-drake whose call echoes endlessly through the Echo Caves.',
    element: 'thunder',
    expansionId: 'core',
    habitat: 'Echo Caves',
    name: 'Jekoros',
    weaknesses: monsterWeaknesses.jekoros,
  }),
  monster('the-awakened', {
    aggressionLevels: [0, 1, 2, 3],
    description:
      'An ancient dragon of colossal scale whose living, three-part heart drives the storm across Thyrea. It devoured the Ancient and the Celestial, and its presence stirs monsters into a blind fury.',
    element: 'fire',
    expansionId: 'core',
    habitat: 'Heart of Woltyar',
    name: 'The Awakened',
    specialRules: [
      'alternative-combat-board',
      'the-awakened-ballista-tokens',
      'awakened-storm-track',
      'the-awakened-extended-monster-board',
      'the-awakened-instinct-and-signature-behavior-cards',
    ],
    weaknesses: [],
  }),
  // Nightmare Expansion
  monster('zekath', {
    description: 'A storm-wolf that stalks the wreckage of fallen airships in the northern woods.',
    element: 'thunder',
    expansionId: 'nightmare',
    habitat: 'Dragon’s Ridge woods',
    name: 'Zekath',
    specialRules: ['zekath-special-peril-cards', 'zekath-vibration-track'],
    weaknesses: monsterWeaknesses.zekath,
  }),
  monster('zekalith', {
    description: 'The elder of the Zekath packs, lured underground by a flower that blooms in the dark.',
    element: 'thunder',
    expansionId: 'nightmare',
    habitat: 'Underground caverns',
    name: 'Zekalith',
    specialRules: ['zekalith-special-peril-cards', 'zekalith-vibration-track'],
    weaknesses: monsterWeaknesses.zekalith,
  }),
  monster('xitheros', {
    description: 'A creature described only in the final pages of the Tome of Creatures. Its blood is primordial.',
    element: 'crystal',
    expansionId: 'nightmare',
    habitat: 'Unknown',
    name: 'Xitheros',
    specialRules: ['xitheros-bleeding-cards'],
    weaknesses: monsterWeaknesses.xitheros,
  }),
  monster('taraska', {
    description: 'A lava titan that opens geysers of fire across the board with every step.',
    element: 'fire',
    expansionId: 'nightmare',
    habitat: 'Mouth of the volcano',
    name: 'Taraska',
    specialRules: ['taraska-special-attrition-cards', 'taraska-lava-diagram', 'taraska-lava-geyser'],
    weaknesses: monsterWeaknesses.taraska,
  }),
  // Feather Expansion
  monster('pazis', {
    description: 'The monster of Muara. A plumed raptor that nests in the jungle canopy.',
    element: 'feather',
    expansionId: 'feather',
    habitat: 'Jungle of Muara',
    name: 'Pazis',
    specialRules: ['pazis-paralyzing-spore-cards', 'pazis-special-behavior-deck-setup'],
    weaknesses: monsterWeaknesses.pazis,
  }),
  monster('nagarjas', {
    description: 'The river dragon. It guards the stones of the primordials beneath the waterfall.',
    element: 'feather',
    expansionId: 'feather',
    habitat: 'Muara river',
    name: 'Nagarjas',
    weaknesses: monsterWeaknesses.nagarjas,
  }),
  // Venom Expansion
  monster('hydar', {
    description:
      'A green-scaled jungle dragon crowned with shoots that spread seeds and spores. It defends the forest with thorned vines.',
    element: 'venom',
    expansionId: 'venom',
    habitat: 'The Dying Forest',
    name: 'Hydar',
    specialRules: ['hydar-venom-cards', 'hydar-thornvine-tokens'],
    weaknesses: monsterWeaknesses.hydar,
  }),
  monster('reikal', {
    description:
      'A colossal purple serpent with patterned scales and crushing coils. Its corrosive black blood leaves the surrounding forest to rot.',
    element: 'venom',
    expansionId: 'venom',
    habitat: 'The Dark Swamp',
    name: 'Reikal',
    specialRules: ['reikal-venom-cards', 'reikal-venomous-serpent-cards'],
    weaknesses: monsterWeaknesses.reikal,
  }),
  // Ice Expansion
  monster('sirkaaj', {
    description: 'A ravenous winter predator whose bite freezes the ground it touches.',
    element: 'ice',
    expansionId: 'ice',
    habitat: 'Frozen wastes',
    name: 'Sirkaaj',
    weaknesses: monsterWeaknesses.sirkaaj,
  }),
  monster('mamuraak', {
    description: 'An ice colossus entombed for millennia beneath the star gate.',
    element: 'ice',
    expansionId: 'ice',
    habitat: 'Tomb of Ice',
    name: 'Mamuraak',
    specialRules: ['mamuraak-glaciation-track'],
    weaknesses: monsterWeaknesses.mamuraak,
  }),
];

export const monsterById = (id: string): Monster | undefined => monsters.find((entry) => entry.id === id);
