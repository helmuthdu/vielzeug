/**
 * A small original bestiary and class list for the map scene: generic
 * archetypes with the numbers the turn engine needs. Nothing here comes from a
 * published game system, so the demo can ship it.
 */

export interface UnitClass {
  /** One-line description of the class's signature trick, shown in the inspector. */
  ability: string;
  /** Hue used for the token fill, so classes read apart on the canvas. */
  hue: number;
  /** Movement in cells per turn. */
  move: number;
  /** Display name. */
  name: string;
  /** Attack reach in cells (grid distance, not path cost). */
  range: number;
  /** Short label for the token. */
  token: string;
}

/** Enemy archetypes (diamond tokens). Hues are spaced at least 25° apart
 * across both catalogs so no two classes read alike on the canvas. */
export const ENEMY_CATALOG: readonly UnitClass[] = [
  { ability: 'Charges in and hits hardest up close.', hue: 10, move: 4, name: 'Brute', range: 1, token: 'B' },
  {
    ability: 'Outruns everyone and repositions every turn.',
    hue: 60,
    move: 6,
    name: 'Skirmisher',
    range: 1,
    token: 'S',
  },
  { ability: 'Opens fire from five cells away.', hue: 110, move: 3, name: 'Archer', range: 5, token: 'A' },
  { ability: 'Casts across the battlefield at range four.', hue: 185, move: 3, name: 'Caster', range: 4, token: 'X' },
  {
    ability: 'Slow, but controls the cells right in front of it.',
    hue: 260,
    move: 2,
    name: 'Sentinel',
    range: 2,
    token: 'T',
  },
  { ability: 'Swarms in numbers: fast and fragile.', hue: 315, move: 5, name: 'Swarm', range: 1, token: 'W' },
];

/** Hero classes (circle tokens). */
export const HERO_CATALOG: readonly UnitClass[] = [
  {
    ability: 'Holds the line: steady advance, dependable reach two.',
    hue: 225,
    move: 3,
    name: 'Vanguard',
    range: 2,
    token: 'V',
  },
  { ability: 'Marked Shot: strikes from five cells away.', hue: 145, move: 4, name: 'Ranger', range: 5, token: 'R' },
  {
    ability: 'Sanctuary: supports at reach two and never breaks stride.',
    hue: 35,
    move: 3,
    name: 'Cleric',
    range: 2,
    token: 'C',
  },
  {
    ability: 'Overload: the longest reach on the field, but barely moves.',
    hue: 290,
    move: 2,
    name: 'Mage',
    range: 6,
    token: 'M',
  },
];

export function archetype(name: string): UnitClass | undefined {
  return ENEMY_CATALOG.find((entry) => entry.name === name);
}

export function heroClass(name: string): UnitClass | undefined {
  return HERO_CATALOG.find((entry) => entry.name === name);
}

/** The catalog entry for a unit: hero classes for heroes, the bestiary for enemies. */
export function unitClass(team: 'enemy' | 'hero', catalogId: string | undefined): UnitClass | undefined {
  if (!catalogId) return undefined;
  return team === 'hero' ? heroClass(catalogId) : archetype(catalogId);
}
