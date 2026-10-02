import { s } from '@vielzeug/spell';
import type {
  CarriedItem,
  ElementId,
  ExpansionId,
  ForgeEquipment,
  Potion,
  WeaponDamage,
  WeaponEquipment,
  WornEquipment,
} from '../domain/types';
import armorFamilies from './data/forge/armor.json';
import helmFamilies from './data/forge/helm.json';
import itemFamilies from './data/forge/items.json';
import potionFamilies from './data/forge/potions.json';
import weaponFamilies from './data/forge/weapons.json';
import { hunterById } from './hunters';
import { resources } from './resources';

const elementExpansion: Record<ElementId, ExpansionId> = {
  coral: 'core',
  crystal: 'core',
  feather: 'feather',
  fire: 'core',
  horn: 'core',
  ice: 'ice',
  metal: 'core',
  thunder: 'core',
  venom: 'venom',
};

const isElementId = (value: string | null): value is ElementId => value !== null && value in elementExpansion;
const artwork = (file: string) => `/cards/${file}`;
const weaponDamage = (value: number | number[] | null): WeaponDamage | null => {
  if (typeof value === 'number') return value;
  if (value?.length === 2 && value.every((entry) => Number.isFinite(entry))) return [value[0], value[1]];
  return null;
};

// Each collection file's schema is the single description of its shape: spell validates the data
// at load (strict objects, so a mistyped key fails with a path instead of flowing downstream)
// and Infer types it without hand-maintained mirror interfaces.
const costSchema = s.union(s.record(s.string(), s.number()), s.object({ anyPlants: s.number() }), s.null());

const baseLevelSchema = s.object({
  cost: costSchema,
  file: s.string(),
  id: s.string(),
  level: s.number().int().min(1).max(3),
  text: s.string(),
});

const deckCompositionSchema = s.object({
  attack: s.number().int().min(0),
  dodge: s.number().int().min(0),
  maneuver: s.number().int().min(0),
  parry: s.number().int().min(0),
});

/** Armor and helm levels: vitality is the worn piece's own stat. */
const wornLevelSchema = s.object({
  cost: costSchema,
  file: s.string(),
  health: s.number().int().min(0).optional(),
  id: s.string(),
  level: s.number().int().min(1).max(3),
  text: s.string(),
});

const itemLevelSchema = s.object({
  cost: costSchema,
  /** The level's effect tracks counters: the hunter board shows its tally. */
  counters: s.boolean().optional(),
  file: s.string(),
  id: s.string(),
  level: s.number().int().min(1).max(3),
  text: s.string(),
});

const weaponLevelSchema = s.object({
  cost: costSchema,
  damage: s.union(s.number(), s.array(s.number()), s.null()),
  deckComposition: deckCompositionSchema.nullable(),
  file: s.string(),
  id: s.string(),
  level: s.number().int().min(1).max(3),
  text: s.string(),
});

/** Armor and helm families: worn pieces with vitality. */
const wornFamilySchema = s.object({
  /** Awakened-set legendaries are only offered while hunting The Awakened. */
  awakenedOnly: s.boolean().optional(),
  element: s.string().nullable(),
  levels: s.array(wornLevelSchema),
  name: s.string(),
});

/** Item families: carried effect pieces, some granted as quest reward cards. */
const itemFamilySchema = s.object({
  /** The printed reward-card number: the key quests and chapter stories grant by. */
  card: s.number().int().min(1).max(38).optional(),
  element: s.string().nullable(),
  levels: s.array(itemLevelSchema),
  name: s.string(),
  /** Quest-reward items are never forgeable and only enter a campaign through quest rewards. */
  reward: s.boolean().optional(),
});

const potionFamilySchema = s.object({
  /** The printed reward-card number: the key quests and chapter stories grant by. */
  card: s.number().int().min(1).max(38).optional(),
  /** What the family's effect does at the table: the herbalist shelf's category tabs. */
  category: s.enum(['defense', 'healing', 'offense', 'utility'] as const),
  levels: s.array(baseLevelSchema),
  name: s.string(),
  /** Quest-reward potions are granted by quests, never prepared. */
  reward: s.boolean().optional(),
});

const weaponFamilySchema = s.object({
  /** Awakened-set legendaries are only offered while hunting The Awakened. */
  awakenedOnly: s.boolean().optional(),
  element: s.string().nullable(),
  /** Overrides the hunter-derived expansion when the family ships with different content. */
  expansionId: s.string().optional(),
  hunter: s.string(),
  levels: s.array(weaponLevelSchema),
  name: s.string(),
});

// One collection per card kind, each parsed by its own schema.
const armor = s.array(wornFamilySchema).parse(armorFamilies);
const helm = s.array(wornFamilySchema).parse(helmFamilies);
const items = s.array(itemFamilySchema).parse(itemFamilies);
const potionsCatalog = s.array(potionFamilySchema).parse(potionFamilies);
const weapons = s.array(weaponFamilySchema).parse(weaponFamilies);

const weaponCards: WeaponEquipment[] = weapons.flatMap((family) => {
  const hunter = hunterById(family.hunter);
  const classRestriction = hunter?.classId ?? null;
  const expansionId = (family.expansionId as ExpansionId | undefined) ?? hunter?.expansionId ?? 'core';
  if (!classRestriction) return [];
  return family.levels.map((lv) => ({
    artwork: artwork(lv.file),
    awakenedOnly: family.awakenedOnly ?? false,
    classRestriction,
    cost: lv.cost,
    damage: weaponDamage(lv.damage),
    deckComposition: lv.deckComposition,
    description: lv.text,
    element: isElementId(family.element) ? family.element : null,
    expansionId,
    familyId: lv.id.replace(/-l[123]$/, ''),
    id: lv.id,
    level: lv.level,
    name: family.name,
    type: 'weapon' as const,
  }));
});

const wornCards: WornEquipment[] = (
  [
    ['armor', armor],
    ['helm', helm],
  ] as const
).flatMap(([type, families]) =>
  families.flatMap((family) => {
    const element = isElementId(family.element) ? family.element : null;
    if (family.element !== null && element === null) return [];
    return family.levels.map((lv) => ({
      artwork: artwork(lv.file),
      awakenedOnly: family.awakenedOnly ?? false,
      cost: lv.cost,
      description: lv.text,
      element,
      expansionId: element === null ? 'core' : elementExpansion[element],
      familyId: lv.id.replace(/-l[123]$/, ''),
      health: lv.health ?? null,
      id: lv.id,
      level: lv.level,
      name: family.name,
      type,
    }));
  }),
);

const itemCards: CarriedItem[] = items.flatMap((family) => {
  const element = isElementId(family.element) ? family.element : null;
  if (family.element !== null && element === null) return [];
  return family.levels.map((lv) => ({
    artwork: artwork(lv.file),
    cost: lv.cost,
    counters: lv.counters ?? false,
    description: lv.text,
    element,
    expansionId: element === null ? 'core' : elementExpansion[element],
    familyId: lv.id.replace(/-l[123]$/, ''),
    id: lv.id,
    level: lv.level,
    name: family.name,
    rewardOnly: family.reward ?? false,
    type: 'item' as const,
  }));
});

export const forgeEquipment: ForgeEquipment[] = [...weaponCards, ...wornCards, ...itemCards];

export const potions: Potion[] = potionsCatalog.flatMap((family) =>
  family.levels.map((lv) => ({
    artwork: artwork(lv.file),
    category: family.category,
    cost: lv.cost,
    description: lv.text,
    expansionId: 'core',
    familyId: lv.id.replace(/-l[123]$/, ''),
    id: lv.id,
    level: lv.level,
    name: family.name,
    rewardOnly: family.reward ?? false,
  })),
);

// The content is static, so id lookups are Maps built once at module init: the UI calls these
// from computeds that re-run on every reactive update, and the persistence schema checks every
// saved quest on every load.
const equipmentById = new Map(forgeEquipment.map((entry) => [entry.id, entry] as const));
const potionsById = new Map(potions.map((potion) => [potion.id, potion] as const));

export const forgeById = (id: string) => equipmentById.get(id);
/** The weapon a weapon-slot id refers to: weapon slots only ever hold weapons. */
export const weaponById = (id: string): WeaponEquipment | undefined => {
  const entry = equipmentById.get(id);
  return entry?.type === 'weapon' ? entry : undefined;
};
/** The worn piece an armor or helm slot id refers to. */
export const wornById = (id: string): WornEquipment | undefined => {
  const entry = equipmentById.get(id);
  return entry && (entry.type === 'armor' || entry.type === 'helm') ? entry : undefined;
};
export const previousForgeEquipment = (entry: ForgeEquipment) =>
  forgeEquipment.find((candidate) => candidate.familyId === entry.familyId && candidate.level === entry.level - 1);
export const potionById = (id: string) => potionsById.get(id);

/** Reward-card items keyed by their printed reward-card number: the quest-reward pipeline. */
export const rewardCardEquipment: ReadonlyMap<number, ForgeEquipment> = new Map(
  items
    .filter((family) => family.reward)
    .flatMap((family) => {
      const piece = forgeById(family.levels[0].id);
      return piece && family.card !== undefined ? ([[family.card, piece]] as const) : [];
    }),
);

/** Reward-card potions keyed by their printed reward-card number. */
export const rewardCardPotions: ReadonlyMap<number, Potion> = new Map(
  potionsCatalog
    .filter((family) => family.reward)
    .flatMap((family) => {
      const potion = potionById(family.levels[0].id);
      return potion && family.card !== undefined ? ([[family.card, potion]] as const) : [];
    }),
);

export const forgeResourceLabel = (id: string): string => resources.find((entry) => entry.id === id)?.name ?? id;
export const forgeTypeLabel = (id: string): string => {
  if (id === 'item') return 'Tools & items';
  return id
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};
export const forgeElementLabel = (id: string | null): string => (id ? forgeResourceLabel(id) : 'Base');
