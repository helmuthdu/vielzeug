/**
 * Domain model for Primal: The Hunter's Journal.
 *
 * Two families of types live here:
 * - Game content (`Hunter`, `Monster`, `Quest`, …): static data shipped with the app.
 * - Application state (`Campaign`, `Expedition`, …): what the players change over time.
 *
 * Content is referenced by stable ids, never embedded, so state stays small and expansion-aware.
 */

// ---------------------------------------------------------------------------
// Expansions
// ---------------------------------------------------------------------------

export type ExpansionId =
  | 'core'
  | 'nightmare'
  | 'nightmare-2'
  | 'feather'
  | 'venom'
  | 'ice'
  | 'heart-of-the-wild'
  | 'mount-havoc'
  | 'biome-endless-swamp-nightmare'
  | 'biome-goldarks-thunder-mountains'
  | 'biome-niz-maraga-sunset-plains'
  | 'biome-woltyar-frozen-wastes'
  | 'biome-crystal-caves-flooded-wilds';

export interface Expansion {
  artwork: string | null;
  description: string;
  /** What the box adds, grouping the library: new monsters and quests, new hunters, or biome boards. */
  family: 'biomes' | 'core' | 'hunters' | 'monsters';
  id: ExpansionId;
  name: string;
  purchaseUrl: string | null;
  /** Core content is always enabled and cannot be toggled. */
  required: boolean;
}

/** Every piece of game content declares which expansion box it ships in. */
export interface GameContent {
  expansionId: ExpansionId;
  id: string;
}

// ---------------------------------------------------------------------------
// Resources
// ---------------------------------------------------------------------------

export type ElementId = 'fire' | 'thunder' | 'coral' | 'crystal' | 'metal' | 'horn' | 'ice' | 'venom' | 'feather';
export type MaterialId = 'blood' | 'bones' | 'scales' | 'iride' | 'kobaureo' | 'zima';
export type PlantId = 'albalacea' | 'anthemon' | 'mellis' | 'nillea' | 'saelicornia' | 'tarmaret';
export type ResourceId = ElementId | MaterialId | PlantId;
export type ResourceCategory = 'element' | 'material' | 'plant';

export interface Resource extends GameContent {
  category: ResourceCategory;
  icon: string;
  id: ResourceId;
  name: string;
}

export type ResourceBundle = Partial<Record<ResourceId, number>>;
export type RecipeCost = ResourceBundle | { anyPlants: number };

// ---------------------------------------------------------------------------
// Hunters
// ---------------------------------------------------------------------------

export type WeaponClassId =
  | 'great-sword'
  | 'great-bow'
  | 'hammer'
  | 'sword-and-shield'
  | 'dual-blades'
  | 'gunbow'
  | 'spear'
  | 'war-drum';

export interface WeaponClass {
  /** Folder under /public/cards holding the weapon-line equipment scans. */
  cardFolder: string;
  icon: string;
  id: WeaponClassId;
  name: string;
}

export type SkillBranchId = 'A' | 'B' | 'C' | 'D' | 'E';

export type SkillStep = 1 | 2;

/** Branches carry no printed name: the cards they add describe them. */
export interface SkillTreeBranch {
  id: SkillBranchId;
  /** Two upgrade steps per branch as printed on the character sheet. */
  steps: [SkillTreeStep, SkillTreeStep];
}

export interface SkillTreeStep {
  /** Cards the step adds by rule (2 action cards, or 2 action cards + 1 mastery) even when `cardIds` is empty. */
  cardCount: 2 | 3;
  /** Cards this step adds, in catalog order with the mastery last; empty when the catalog does not cover the hunter. */
  cardIds: string[];
}

export type HunterCardKind = 'action' | 'mastery';

/** Focused/unfocused split for mastery cards. */
export interface MasteryFocus {
  counters: number;
  text: string;
}

/**
 * A hunter's printed action or mastery card, paired with its scan when one exists. Cards known only
 * from a scan carry the name and step but no type, text or kind.
 *
 * Mastery cards use `unfocused`/`focused` instead of `text`.
 */
export interface HunterCard {
  /** The printed aggro symbol: playing the card can draw the monster's attention. */
  aggro: boolean;
  art: string | null;
  /** Focused-side scan of a mastery card. */
  artFocused: string | null;
  cardType: string | null;
  faq: string | null;
  /** Focused effect of a mastery card (empty string when the mastery has no focused side). */
  focused: { text: string } | null;
  hunterId: string;
  id: string;
  kind: HunterCardKind | null;
  name: string;
  staminaCost: number | 'X' | null;
  /** Stamina the card generates when discarded (`null` for masteries and cards with no icon). */
  staminaIcons: number | null;
  /** `S` for the starter deck, otherwise branch + step (`A1` … `E2`). */
  step: 'S' | `${SkillBranchId}${SkillStep}`;
  subtype: string | null;
  text: string | null;
  trait: string | null;
  /** Unfocused trigger and counter requirement of a mastery card. */
  unfocused: MasteryFocus | null;
}

/** The six strength axes a build profiles: 1 (weak) to 5 (defining). */
export type HunterStrengthAxis = 'control' | 'defense' | 'mobility' | 'power' | 'speed' | 'support';

/** A strength profile on the shared 1–5 scale, derived from a build's cards and gear. */
export interface HunterStrengths extends Record<HunterStrengthAxis, number> {}

export interface Hunter extends GameContent {
  artwork: string;
  /** Folder under /public/cards holding the hunter's action card scans. */
  cardFolder: string;
  classId: WeaponClassId;
  description: string;
  name: string;
  /** Descriptive playstyle tags: never enforced as party roles. */
  playstyle: string[];
  skillTree: SkillTreeBranch[];
  title: string;
}

// ---------------------------------------------------------------------------
// Monsters, terrain, scenarios
// ---------------------------------------------------------------------------

export type AggressionLevel = 0 | 1 | 2 | 3;
export type MonsterStance = 1 | 2 | 3 | 4 | 5;

export interface MonsterStanceDamage {
  aggression: AggressionLevel;
  nightmare: boolean;
  /** Per-player damage needed for one wound on each stance. */
  stances: Partial<Record<MonsterStance, number>>;
}

export interface Monster extends GameContent {
  aggressionLevels: AggressionLevel[];
  description: string;
  element: ElementId;
  habitat: string;
  name: string;
  specialRules: SpecialRule[];
  stanceDamage: readonly MonsterStanceDamage[];
  trophyIcon: string;
  weaknesses: ElementId[];
}

export type Sector = 'front' | 'left-flank' | 'right-flank' | 'rear' | 'edges';

export interface TerrainRule {
  condition: string | null;
  details: string[];
  effect: string;
  status: 'unavailable' | 'verified';
  timing: string | null;
}

export interface Terrain extends GameContent {
  icon: string | null;
  name: string;
  rule: TerrainRule;
  /** The terrain this token becomes through the game's transformation chains (ice melts to water). */
  transformsTo?: string;
}

export interface TerrainPlacement {
  count: number;
  /** Null = in play without a fixed sector: hidden from the battlefield map, listed with the tokens. */
  sector: Sector | null;
  terrainId: string;
}

/** One terrain token on the board: a physical chip with its current identity and place. */
export interface TerrainToken {
  id: string;
  sector: Sector | null;
  terrainId: string;
}

/**
 * The fight's terrain changes. The scenario's printed placements stay the source of truth;
 * only what the fight did to them persists: tokens placed by behaviors, tokens that
 * transformed (ice melts to water, water to fog) and tokens taken off the board.
 */
export interface TerrainChanges {
  /** Tokens placed during the fight, beyond the scenario's setup. */
  placed: TerrainToken[];
  /** Base token ids taken off the board. */
  removed: string[];
  /** Base token id → the terrain it became. */
  transformed: Record<string, string>;
}

export interface BattlefieldObject {
  count: number;
  icon: string;
  id: string;
  name: string;
  rule?: TerrainRule;
  sector: Sector;
}

export interface SpecialRule {
  text: string;
  title: string;
}

export interface CampaignCondition {
  allAchievements?: string[];
  blockedByQuestIds?: string[];
  maxChapter?: number;
  minChapter?: number;
  noAchievements?: string[];
  unlessAllAchievements?: string[];
}

export interface CampaignAchievementRule extends CampaignCondition {
  achievement: string;
}

export interface CampaignQuestUnlockRule extends CampaignCondition {
  questId: string;
}

export interface QuestProgressionEffect {
  achievements: string[];
  automatic: boolean;
  expansionId: ExpansionId | null;
  text: string;
  trigger: 'expiration' | 'reward';
}

export interface NarrativeCondition {
  achievement?: string;
  maxChapter?: number;
  minChapter?: number;
  unlessAchievement?: string;
}

export interface NarrativePassage {
  condition?: NarrativeCondition;
  id: string;
  paragraphs: string[];
  summary: string;
  title: string;
  variant?: 'A' | 'B';
}

export interface QuestLore {
  conclusions: NarrativePassage[];
  introductions: NarrativePassage[];
  visions: NarrativePassage[];
}

export interface Quest extends GameContent {
  achievementRules: CampaignAchievementRule[];
  conclusion: string;
  expiration: { text: string; effects: string[] };
  expirationUnlocks: CampaignQuestUnlockRule[];
  /** Human-readable expiry rule; empty when the quest never expires. */
  expires: string;
  /** Forge elements awarded when this quest is completed. */
  forgeUnlocks?: ElementId[];
  introduction: string;
  lore: QuestLore;
  monsterId: string;
  name: string;
  number: number;
  progressionEffects: QuestProgressionEffect[];
  /** Reward-card numbers this quest grants when completed; a number twice means both copies. */
  rewardCards: number[];
  /** The resource grant this quest awards: one flat bundle, every consumer's shape. */
  rewardResources: ResourceBundle;
  rewards: string[];
  rewardUnlocks: CampaignQuestUnlockRule[];
  specialRules: SpecialRule[];
  terrain: TerrainPlacement[];
  /** Human-readable unlock rule from the campaign book's unlock guide. */
  unlock: string;
  vision: string;
}

export interface ExpeditionScenario extends GameContent {
  monsterId: string;
  name: string;
  /** The scenario's number within its monster's printed scenarios, or the trial card's number. */
  number: number;
  objective: string;
  /** Every box that must be enabled to play this; trial cards can need several. */
  requiredExpansionIds: ExpansionId[];
  rulebookPage?: number;
  source?: 'core';
  specialRules: SpecialRule[];
  terrain: TerrainPlacement[];
  /** The trial card this scenario renders, when it is one; resolves via `trialHuntById`. */
  trialId?: string;
}

export interface DeckComposition {
  attack: number;
  dodge: number;
  maneuver: number;
  parry: number;
}

export type EquipmentSlot = 'weapon' | 'armor' | 'helm' | 'item';
export type EquipmentIds = Record<`${EquipmentSlot}Id`, string | null>;
/** The three potion slots beside a player board; tuples from the persisted schemas are readonly. */
export type PotionLoadout = readonly [string | null, string | null, string | null];
export type PotionSlot = 0 | 1 | 2;
export type WeaponDamage = number | readonly [normal: number, piercing: number];

/** Fields every equipment piece shares regardless of kind. */
interface EquipmentBase extends GameContent {
  artwork: string;
  cost: RecipeCost | null;
  description: string;
  element: ElementId | null;
  familyId: string;
  level: number;
  name: string;
}

/** A hunter's weapon: the class-restricted piece that defines the action deck it builds around. */
export interface WeaponEquipment extends EquipmentBase {
  /** The Awakened-set legendaries: wearable only while the hunt target is The Awakened. */
  awakenedOnly: boolean;
  classRestriction: WeaponClassId;
  damage: WeaponDamage | null;
  deckComposition: DeckComposition | null;
  type: 'weapon';
}

/** Armor and helm: worn pieces carrying vitality. */
export interface WornEquipment extends EquipmentBase {
  /** The Awakened-set legendaries: wearable only while the hunt target is The Awakened. */
  awakenedOnly: boolean;
  health: number | null;
  type: 'armor' | 'helm';
}

/** An item: a carried effect piece with no stats of its own. */
export interface CarriedItem extends EquipmentBase {
  /** The effect tracks counters (Lava Buckler, Tome of Creatures): the board shows a tally. */
  counters: boolean;
  /** Quest-reward items: never forgeable; in a campaign, only wearable once granted by a quest. */
  rewardOnly: boolean;
  type: 'item';
}

/** Every forgeable or earnable piece, discriminated by `type`: one shape per kind, no null padding. */
export type ForgeEquipment = WeaponEquipment | WornEquipment | CarriedItem;

/** What a potion does at the table: the herbalist shelf's category tabs. */
export type PotionCategory = 'defense' | 'healing' | 'offense' | 'utility';

export interface Potion extends GameContent {
  artwork: string;
  /** The family's effect category, shown as the herbalist shelf tabs. */
  category: PotionCategory;
  /** Herbalist recipes cost resources; quest-reward potions are granted, so they cost nothing. */
  cost: RecipeCost | null;
  description: string;
  /** The family this level belongs to: a Winds bounty raise swaps a potion to its family's next level. */
  familyId: string;
  level: number;
  name: string;
  /** Quest-reward potions are never preparable; they enter a campaign through quest rewards. */
  rewardOnly: boolean;
}

// ---------------------------------------------------------------------------
// Campaign chapters
// ---------------------------------------------------------------------------

export type ChapterPhase = 'quest-board' | 'preparing' | 'hunt' | 'result';

/**
 * A state-changing instruction printed in the chapter's rewards box. Structured effects are
 * applied by the campaign domain while the text remains available as a table-side checklist.
 */
export interface ChapterInstruction {
  condition: CampaignCondition;
  /** `null` applies to every campaign; otherwise only when that expansion is enabled. */
  expansionId: ExpansionId | null;
  expires: number[];
  resources: ResourceBundle;
  skillPoints: number;
  text: string;
  unlocks: number[];
}

export interface CampaignChapterContent {
  /** Awakened-set grants: each hunter's set weapon is assigned directly, the armor and helm are queued. */
  awakenedSetUnlocks?: (CampaignCondition & { set: 'ancient' | 'celestial' })[];
  forgeLevel?: number;
  forgeUnlocks?: ElementId[];
  herbalistLevel?: number;
  instructions: ChapterInstruction[];
  /** Open questions the chapter leaves the hunters with, read aloud as a group. */
  loreQuestions?: string[];
  number: number;
  /** The chapter's narrative prose, transcribed from the campaign book and revealed through LoreEntry bands. */
  paragraphs: string[];
  questUnlocks?: CampaignQuestUnlockRule[];
  /** Reward cards the chapter story grants when the condition holds. */
  rewardCardUnlocks?: (CampaignCondition & {
    card: number;
    copies?: number;
    expansionId?: ExpansionId;
    toAll?: boolean;
  })[];
  summary: string;
  title: string;
  trophyIds?: string[];
}

// ---------------------------------------------------------------------------
// Application state
// ---------------------------------------------------------------------------

export type GameMode = 'ascent' | 'campaign' | 'challenge' | 'expedition';

/** The creation stamps a campaign carries: chosen when the binder is opened, never after. */
export type VariantId = 'hunters-trial';

export interface CampaignConfig {
  expansionIds: ExpansionId[];
  name: string;
  nightmareVariant: boolean;
  variants: VariantId[];
}

/**
 * The part of a hunter that a saved loadout captures: the worn equipment, the action deck built
 * for it and the mastery card chosen for it. The deck holds action-card ids only: masteries sit
 * beside the board and follow the card pool.
 */
export interface HunterBuild {
  deckCardIds: string[];
  equipment: EquipmentIds;
  /** The mastery card this build plays; every hunter owns a starter and one per branch-2 upgrade. */
  masteryCardId: string;
}

/** Everything a saved build carries onto a player board: worn equipment, the action deck and the three potion slots. */
export interface BoardBuild extends HunterBuild {
  potionLoadoutIds: PotionLoadout;
}

/** A build as applied onto one hunter's board: the saved-build fields plus which hunter wears it. */
export interface AppliedBuild extends BoardBuild {
  hunterId: string;
}

/** A reusable build a player saved for a hunter; usable in any campaign or expedition where its pieces are legal. */
export interface HunterLoadout extends BoardBuild {
  /** The community-catalog entry this build publishes to; absent while the build is not online. */
  catalogEntryId?: string;
  createdAt: string;
  hunterId: string;
  id: string;
  name: string;
  /** The `rev` the published snapshot holds; a higher `rev` is unpublished local drift. */
  publishedRev?: number;
  /** Write counter for conflict detection: two devices holding the same rev edited concurrently. */
  rev: number;
  /** Free-form notes on how the build is meant to play; kept on the build, never shared by code. */
  strategy: string;
  updatedAt: string;
}

/** The fields every run mode's hunter member carries: the board build plus the hunt's potion record. */
export interface SubjectHunter extends BoardBuild {
  consumedPotionIds: string[];
  hunterId: string;
  playerName: string;
}

export interface CampaignHunter extends SubjectHunter {
  craftedEquipmentIds: string[];
  notes: string;
  potionInventoryIds: string[];
  resources: ResourceBundle;
  /** Quest-reward items this hunter has been assigned; one entry per granted copy. */
  rewardEquipmentIds: string[];
  /** Potions received as quest or chapter rewards: they refill after every hunt, unlike crafted ones. */
  rewardPotionIds: string[];
  skillPoints: number;
  /** Unlocked skill-tree steps per branch, 0–2. */
  skillTree: Record<SkillBranchId, 0 | 1 | 2>;
}

export type QuestStatus = 'locked' | 'available' | 'active' | 'completed' | 'expired';

export interface QuestState {
  /** Chapter in which the status last changed. */
  chapter: number;
  questId: string;
  status: QuestStatus;
}

export interface Note {
  createdAt: string;
  id: string;
  scope: 'campaign' | 'chapter' | 'hunter' | 'quest';
  targetId: string | null;
  text: string;
}

/**
 * Stopwatch state for a physical monster fight.
 * `elapsedMs` accumulates while paused; `startedAt` marks the running segment; `durationMs`
 * freezes the final reading when the result is recorded (`null` when the timer was never used).
 */
export interface HuntTimer {
  durationMs: number | null;
  elapsedMs: number;
  startedAt: string | null;
}

export type HuntEventActor = { hunterId: string; kind: 'hunter' } | { kind: 'monster'; monsterId: string };

interface HuntEventBase {
  elapsedMs: number | null;
  recordedAt: string;
  sequence: number;
}

export type HuntEvent =
  | (HuntEventBase & {
      actor: { hunterId: string; kind: 'hunter' };
      consumed: boolean;
      potionId: string;
      type: 'potion';
    })
  | (HuntEventBase & { actor: { hunterId: string; kind: 'hunter' }; facts: FightHunterFacts; type: 'build' })
  | (HuntEventBase & { actor: HuntEventActor; delta: number; type: 'damage'; value: number })
  | (HuntEventBase & {
      actor: HuntEventActor;
      counter: Exclude<HunterCounter, 'damage'> | Exclude<MonsterCounter, 'damage'>;
      delta: number;
      type: 'counter';
      value: number;
    })
  | (HuntEventBase & { actor: HuntEventActor; active: boolean; effect: HunterCondition | MonsterToken; type: 'effect' })
  | (HuntEventBase & { actor: { hunterId: string; kind: 'hunter' }; token: KoToken | null; type: 'knockout' })
  | (HuntEventBase & {
      actor: { hunterId: string; kind: 'hunter' };
      depleted: boolean;
      slot: DepletedSlot;
      type: 'depletion';
    })
  | (HuntEventBase & {
      actor: { kind: 'monster'; monsterId: string };
      damage: number;
      threshold: number;
      type: 'wound-ready';
    })
  | (HuntEventBase & {
      actor: { kind: 'monster'; monsterId: string };
      damageRemoved: number;
      stance: MonsterStance;
      type: 'wound';
    })
  | (HuntEventBase & {
      actor: { kind: 'monster'; monsterId: string };
      from: MonsterStance;
      to: MonsterStance;
      toughness: number;
      type: 'stance';
    })
  | (HuntEventBase & { actor: { kind: 'monster'; monsterId: string }; type: 'unleash' })
  | (HuntEventBase & {
      actor: HuntEventActor;
      monsterState: MonsterFightState | null;
      scope: 'hunter' | 'monster';
      type: 'reset';
    })
  | (HuntEventBase & {
      action: 'placed' | 'removed' | 'transformed';
      actor: { kind: 'monster'; monsterId: string };
      sector: Sector | null;
      terrainId: string;
      tokenId: string;
      type: 'terrain';
    });

/** One hunter's recorded board at fight start: the build without the potion loadout. */
export interface HuntRecordHunter extends HunterBuild {
  hunterId: string;
}

export interface HuntRecord {
  durationMs: number | null;
  events: HuntEvent[];
  fightStart: FightStart;
  hunters: HuntRecordHunter[];
  id: string;
  monsterId: string;
  outcome: HuntResult;
  recordedAt: string;
}

// ---------------------------------------------------------------------------
// Hunter fight state
// ---------------------------------------------------------------------------

/** Numeric token tracks on a hunter board during a fight. */
export type HunterCounter = 'damage' | 'defense' | 'disrupt' | 'item' | 'mastery' | 'stamina' | 'strain' | 'weapon';

/** Present/absent token states: the rules make these boolean, not stacked. */
export type HunterCondition = 'aggro' | 'burning' | 'dazed' | 'threatened';

/** Equipment slots that can carry a deplete token. */
export type DepletedSlot = 'armor' | 'helm';

/** Deplete tokens on the worn armor and helm: a depleted piece's health points stop counting. */
export interface HunterDepletedSlots {
  armor: boolean;
  helm: boolean;
}

/**
 * The KO token's visible side. It lands red side up when a hunter is knocked out, flips to black at
 * the start of their next turn, and leaves the board (the hunter rises) at the start of the one after.
 * `dead` marks the final knockout: a hunter depletes one piece on their first knockout, and the next
 * one: with nothing left to deplete: takes them out of the game for good.
 */
export type KoToken = 'red' | 'black' | 'dead';

/**
 * Temporary per-hunter fight state. Mirrors the physical tokens on the player board. Damage reaching
 * the health of the worn armor and helm knocks the hunter out, which clears every other token;
 * `knockedOut` is the KO token's side, or `null` while the hunter stands. Deplete tokens sit on the
 * equipment cards and survive a knockout for the rest of the fight.
 */
export interface HunterFightState {
  aggro: boolean;
  burning: boolean;
  damage: number;
  dazed: boolean;
  defense: number;
  depleted: HunterDepletedSlots;
  disrupt: number;
  /** Counters on the worn item: Lava Buckler, Tome of Creatures, Ancestors' Gift, Northern Star. */
  item: number;
  knockedOut: KoToken | null;
  mastery: number;
  stamina: number;
  strain: number;
  threatened: boolean;
  weapon: number;
}

export interface FightHunterFacts {
  armorHealth: number | null;
  helmHealth: number | null;
  masteryGoal: number | null;
}

export interface FightStart {
  hunters: Record<
    string,
    FightHunterFacts & {
      state: HunterFightState;
    }
  >;
  monsterId: string;
  monsterState: MonsterFightState;
}

// ---------------------------------------------------------------------------
// Monster fight state
// ---------------------------------------------------------------------------

/**
 * Numeric tracks on the monster board during a fight; `bonus` is the +1/+2 damage tokens on the stance
 * card and `toughness` the stance card's per-player toughness value.
 */
export type MonsterCounter = 'damage' | 'toughness' | 'bonus' | 'struggle' | 'acceleration';

/**
 * Tokens placed on or around the monster board; the monster holds at most one of each. `double` is the
 * ×2 damage modifier some abilities grant: not a physical token, but it toggles like one.
 */
export type MonsterToken = 'blind' | 'confuse' | 'stun' | 'vulnerable' | 'slow' | 'unstoppable' | 'double';

/**
 * Temporary monster fight state. Physical stance changes are mirrored only after confirmation;
 * the damage track and printed toughness remain distinct from confirmed wounds.
 */
export interface MonsterFightState {
  acceleration: number;
  /** Total of the bonus damage tokens (+1, +2) on the current stance card. */
  bonus: number;
  damage: number;
  /** Current physical stance, mirrored only after an explicit monster-board selection. */
  stance: MonsterStance;
  struggle: number;
  /** What the fight did to the board's terrain: the printed placements stay the source of truth. */
  terrain: TerrainChanges;
  tokens: Record<MonsterToken, number>;
  /** Toughness printed on the current stance card, per player; a wound costs `toughness × party` damage. */
  toughness: number;
}

/**
 * Bookkeeping every hunt subject carries: its identity, the party's fight tokens, the hunt
 * stopwatch, the monster board and the enabled expansions. All four subjects share it verbatim.
 */
export interface HuntState {
  createdAt: string;
  expansionIds: ExpansionId[];
  /** Ordered tracker events for the current fight; moved into the result record on completion. */
  fightEvents: HuntEvent[];
  fightStart: FightStart | null;
  /** Temporary fight state keyed by hunterId; reset each time the hunt begins. */
  hunterState: Record<string, HunterFightState>;
  huntHistory: HuntRecord[];
  huntTimer: HuntTimer;
  /** The record's stable id: the vault key and the SubjectRef target. */
  id: string;
  /** Temporary monster fight state; reset each time the hunt begins. */
  monsterState: MonsterFightState;
  /** Write counter for conflict detection: two devices holding the same rev edited concurrently.
   *  Stamped by the store on every committed write: the domain never touches it beyond
   *  seeding 0 at creation. */
  rev: number;
  updatedAt: string;
}

/** Which table-side subject a board action or shared session targets. */
export interface SubjectRef {
  id: string;
  kind: GameMode;
}

/** How a hunt ended: the one result vocabulary every subject records. */
export type HuntResult = 'victory' | 'defeat';

/** A run mode's lifecycle: ascents and challenges end in sudden death. */
export type RunStatus = 'running' | 'finished';

export interface Campaign extends HuntState {
  achievements: string[];
  activeQuestId: string | null;
  chapter: number;
  defeats: number;
  finalBattleWon: boolean;
  forge: { level: number; unlockedElementIds: ElementId[] };
  herbalist: { level: number };
  hunters: CampaignHunter[];
  /** Which subject shape this is: the explicit discriminator for the hunt subjects. */
  kind: 'campaign';
  name: string;
  /** True while the campaign plays the Nightmare variant: the stance cards join the
   *  behavior decks, flipped between quests while the boxes carry the expansion. */
  nightmareVariant: boolean;
  notes: Note[];
  phase: ChapterPhase;
  quests: QuestState[];
  resolvedChapter: number;
  /** The recorded score of each won quest hunt, in fight order: one slot per quest
   *  chapter, dense because chapters only advance on victory. The final battle records
   *  no sheet of its own. */
  scores: TrialScoreRecord[];
  totalDefeats: number;
  trophies: string[];
  /** Rewards waiting to be handed to a hunter: equipment or potion ids, one entry per copy. */
  unassignedRewards: string[];
  variants: VariantId[];
}

export type ExpeditionStatus = 'draft' | 'ready' | 'played';

/** Expeditions unlock every card, equipment piece, and potion: a member is the shared
 *  shape with nothing on top. */
export type ExpeditionHunter = SubjectHunter;

export interface Expedition extends HuntState {
  aggression: AggressionLevel | null;
  hunters: ExpeditionHunter[];
  kind: 'expedition';
  monsterId: string | null;
  /** True while the hunt plays the Nightmare variant: the stance cards join the behavior
   *  decks while the boxes carry the expansion. A trial card that prints no Nightmare
   *  rows carries no variant — the card plays standard. */
  nightmareVariant: boolean;
  result: HuntResult | null;
  scenarioId: string | null;
  status: ExpeditionStatus;
  /** The trial card's recorded score sheet; absent until the party fills it. */
  trialScore?: TrialScoreRecord;
}

/**
 * Mount Havoc's standalone ascent: three chapters, each one level-1/2/3 session of prep,
 * a drawn random encounter and a hunt. Sudden death: one defeat ends the run.
 */
export type AscentPhase = 'preparing' | 'encounter' | 'hunt' | 'result';

/** An ascent hunter: the shared member plus the chapter-scoped progression the climb sheet tracks. */
export interface AscentHunter extends SubjectHunter {
  skillPoints: number;
  /** Unlocked skill-tree steps per branch, 0–2: same shape as a campaign hunter. */
  skillTree: Record<SkillBranchId, 0 | 1 | 2>;
  /** Wound cards carried between chapters; the sheet caps this at 3. */
  woundCount: number;
}

export interface Ascent extends HuntState {
  /** 1-based chapter; also the gear/potion level and the monster aggression this chapter fights at. */
  chapter: 1 | 2 | 3;
  /** Monsters beaten so far: trophies, and the reason they left the draw pile. */
  defeatedMonsterIds: string[];
  /** Remaining monsters still in the encounter deck, shuffled at creation; a draw pops the last. */
  drawPile: string[];
  hunters: AscentHunter[];
  kind: 'ascent';
  name: string;
  /** True while the climb plays the Nightmare variant: the stance cards join the behavior decks. */
  nightmareVariant: boolean;
  /** The drawn encounter awaiting its hunt; set by the draw, cleared when the chapter advances. */
  pending: { monsterId: string; scenarioId: string } | null;
  phase: AscentPhase;
  result: HuntResult | null;
  /** The recorded score of each won chapter, in climb order. */
  scores: TrialScoreRecord[];
  status: RunStatus;
}

/**
 * The Winds challenge series (Primal Challenges #11–#12): five expeditions against
 * die-rolled biome setups. Each session opens on the quest board, spends its preparation on
 * the sheet's draft or the last hunt's spoils, fights, and closes on the result: where the
 * bounty raises or heals. Sudden death: one defeat ends the run.
 */
export type ChallengePhase = 'quest-board' | 'preparing' | 'hunt' | 'result';

/** Biome boards a Winds die face can roll, as printed on the setup pages. */
export type TrialBiomeId =
  | 'crystal-caves'
  | 'endless-swamp'
  | 'flooded-wilds'
  | 'frozen-wastes'
  | 'goldarks'
  | 'nightmare'
  | 'niz-maraga'
  | 'sunset-plains'
  | 'thunder-mountains'
  | 'woltyar';

/** The equipment slots the Winds setup sheet drafts: two drawn level-1 cards, one worn. */
export type ChallengeDraftSlot = 'armor' | 'helm' | 'weapon';

/** A hunter through a Winds series: the shared member plus the sheet's progression tracks. */
export interface ChallengeHunter extends SubjectHunter {
  /** The sheet's drawn level-1 pair per slot, dealt once when the hunter joins and worn from
   *  during setup: persisted so the printed "draw two, wear one" ritual survives reloads. */
  draftPairs: Record<ChallengeDraftSlot, string[]>;
  /** True once the hunter has worn this hunt's equipment reward: the sheet allows exactly one. */
  equipmentRewardTaken: boolean;
  skillPoints: number;
  skillTree: Record<SkillBranchId, 0 | 1 | 2>;
  /** Wound cards carried between expeditions; the sheet caps this at 3. */
  woundCount: number;
}

/** The rolled expedition setup: the chosen monster, the die-rolled biome and the face it
 *  came from: the face selects the printed terrain configuration. */
export interface ChallengeEncounter {
  biome: TrialBiomeId;
  monsterId: string;
  roll: 1 | 2 | 3 | 4 | 5 | 6;
}

/** One recorded score sheet: the worksheet's answers and their tally, kept together. */
export interface TrialScoreRecord {
  /** One answer per printed modifier, in printed order: flags are 0 or 1. */
  answers: number[];
  /** The answers' tally: base plus counted modifiers, floored at zero. */
  total: number;
}

export interface Challenge extends HuntState {
  /** The run's aggression level: starts at 1 and rises when a reward's bounty raises it. */
  aggression: 1 | 2 | 3;
  /** The result's bounty choice: `null` until keep or raise is taken. */
  bounty: 'keep' | 'raise' | null;
  /** Monsters beaten so far: trophies, and the pool the next monster is drawn from. */
  defeatedMonsterIds: string[];
  /** 1-based session counter: each session is one expedition of the five. */
  expeditionNumber: 1 | 2 | 3 | 4 | 5;
  hunters: ChallengeHunter[];
  kind: 'challenge';
  name: string;
  /** True while the series plays the Nightmare variant: the stance cards join the behavior decks. */
  nightmareVariant: boolean;
  /** The rolled encounter awaiting its hunt; cleared when the series advances. */
  pending: ChallengeEncounter | null;
  phase: ChallengePhase;
  result: HuntResult | null;
  /** The recorded score of each played expedition, in session order. */
  scores: TrialScoreRecord[];
  /** The Winds series being played: `winds-of-spring` or `winds-of-summer`. */
  seriesId: string;
  status: RunStatus;
}

/** A campaign, expedition, ascent or challenge: the four subjects a hunt is fought in. */
export type HuntSubject = Campaign | Expedition | Ascent | Challenge;

/** Narrows a hunt subject to its campaign form. */
export const isCampaignSubject = (subject: HuntSubject): subject is Campaign => subject.kind === 'campaign';

/** Narrows a hunt subject to its expedition form. */
export const isExpeditionSubject = (subject: HuntSubject): subject is Expedition => subject.kind === 'expedition';

/** Narrows a hunt subject to its Mount Havoc ascent form. */
export const isAscentSubject = (subject: HuntSubject): subject is Ascent => subject.kind === 'ascent';

/** Narrows a hunt subject to its Winds challenge form. */
export const isChallengeSubject = (subject: HuntSubject): subject is Challenge => subject.kind === 'challenge';
