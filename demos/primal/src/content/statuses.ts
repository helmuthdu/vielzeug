import type { HunterCondition, HunterCounter, MonsterCounter, MonsterToken } from '../domain/types';
import type { Keyword } from './keywords';
import { keywords } from './keywords';

/**
 * Display metadata for a board track or token.
 * - `keywordId` links to the rulebook glossary entry shown in the token rule drawer; `null`
 *   means the state is a plain physical track with no token rule (damage, stamina).
 * - `rule` carries the full rule text when the glossary has no entry (`keywords.json` is generated).
 * - `hint` is the one-line, at-a-glance reminder shown on the board itself.
 * - `art` is the official token artwork under `public/tokens/`; `null` falls back to the icon.
 */
interface StatusBase {
  art: string | null;
  hint: string;
  icon: string;
  keywordId: string | null;
  name: string;
  rule: string | null;
}

export type HunterStatusDefinition =
  | (StatusBase & { id: HunterCounter; kind: 'counter' })
  | (StatusBase & { id: HunterCondition; kind: 'condition' })
  | (StatusBase & { id: 'knockedOut'; kind: 'knockout' });

export type MonsterStatusDefinition =
  | (StatusBase & { id: MonsterCounter; kind: 'counter' })
  | (StatusBase & { id: MonsterToken; kind: 'token' });

export type StatusDefinition = HunterStatusDefinition | MonsterStatusDefinition;

export const hunterStatuses: HunterStatusDefinition[] = [
  {
    art: '/tokens/token_damage_empty.svg',
    hint: 'Wounds taken this fight',
    icon: 'heart-crack',
    id: 'damage',
    keywordId: null,
    kind: 'counter',
    name: 'Damage',
    rule: null,
  },
  {
    art: '/tokens/token_threatened.svg',
    hint: 'Reveal 2 attrition cards, use worse outcome',
    icon: 'triangle-alert',
    id: 'threatened',
    keywordId: null,
    kind: 'condition',
    name: 'Threatened',
    rule: "Place the threatened token on your board when a monster behavior or effect causes it. During your next attrition check, reveal two attrition cards instead of one and use the worse outcome. Remove the threatened token by moving to a different sector: Overrun also removes it and is not considered movement.\n\nExample: The two revealed attrition cards show values 1 and 3. Your sequence holds 2 defensive cards: enough to cover the 1, but not the 3, so the worse outcome stands and you suffer attrition damage equal to the monster's damage value. The token is removed when you move.",
  },
  {
    art: '/tokens/token_aggro.svg',
    hint: 'Monster faces this hunter; becomes first player',
    icon: 'flame',
    id: 'aggro',
    keywordId: null,
    kind: 'condition',
    name: 'Aggro',
    rule: "The aggro token marks which hunter the monster faces. During Monster Upkeep, the monster rotates to the aggro player's sector, and the aggro player becomes the first player in the next round.\n\nA hunter can steal the aggro token by playing a card with Taunt during another player's turn: the monster turns to their sector immediately. Only one hunter can hold the aggro token at a time.",
  },
  {
    art: '/tokens/token_burning.svg',
    hint: 'Deck empty: suffer weapon-level damage',
    icon: 'flame',
    id: 'burning',
    keywordId: null,
    kind: 'condition',
    name: 'Burning',
    rule: 'Place the burning token on your board when a monster effect causes it. The next time you empty your deck, discard the burning token and suffer damage equal to your weapon level instead of the normal deck-empty effect.\n\nIf you are already burning when a new burning effect would apply, discard the top 5 cards of your deck instead of taking the token again.\n\nExample: A hunter with a Level 3 weapon empties their deck while burning. They suffer 3 damage and remove the burning token.',
  },
  {
    art: '/tokens/token_dazed.svg',
    hint: 'Next maneuver card has no effect',
    icon: 'circle-dashed',
    id: 'dazed',
    keywordId: null,
    kind: 'condition',
    name: 'Dazed',
    rule: 'Place the dazed token on your board when a monster effect causes it. The next time you play a Maneuver card, discard the dazed token and treat that card as blank: it has no text effect, no stamina cost, and no damage value. The card still occupies its place in your sequence.\n\nExample: You play a Maneuver card that would deal 2 damage and generate 1 stamina. While dazed, the card does nothing: no damage, no stamina, and the dazed token is removed.',
  },
  {
    art: '/tokens/token_ko_a.svg',
    hint: 'Out of the fight until revived',
    icon: 'skull',
    id: 'knockedOut',
    keywordId: null,
    kind: 'knockout',
    name: 'Knocked out',
    rule: 'When a hunter suffers damage equal to or exceeding their maximum health, they are knocked out. Place the KO token on their board red side up and discard all their damage, stamina, defense, disrupt and strain tokens, as well as any condition tokens. While knocked out, a hunter cannot be targeted by monster behaviors or attacks. At the start of their next turn, flip the KO token to its black side. At the start of their following turn, remove the KO token: the hunter stands again.\n\nWhen knocked out, add a Wound card to your discard pile and reshuffle, and place a deplete token on your armor or helm: a depleted piece no longer counts its health points, but its printed text and abilities keep working. A hunter depletes only one piece per fight: knocked out again with nothing left to deplete, they are out of the game for the rest of the hunt. Wound cards are a campaign rule: they stay in the deck until drawn and discarded; expeditions do not use them, and the ascent tracks its carried wounds on its sheet.',
  },
  {
    art: '/tokens/token_stamina_1.svg',
    hint: 'Discard to generate 1 stamina',
    icon: 'zap',
    id: 'stamina',
    keywordId: null,
    kind: 'counter',
    name: 'Stamina',
    rule: 'Place stamina tokens on your board when a card ability or effect generates them. Discard a stamina token at any time to generate 1 stamina, which can be used to pay card costs. You may only have 1 stamina token at a time unless an ability specifies otherwise.\n\nExample: A card that costs 2 stamina can be paid by discarding 1 stamina token from your board and generating 1 stamina from your hand.',
  },
  {
    art: '/tokens/token_defense.svg',
    hint: 'Counts as a defensive card during attrition',
    icon: 'shield',
    id: 'defense',
    keywordId: null,
    kind: 'counter',
    name: 'Defense',
    rule: 'Place defense tokens on your board when a card ability or effect grants them. Each defense token counts as an extra defensive card during the attrition check, raising your total against the revealed attrition value. Discard all defense tokens at the end of the attrition check.\n\nExample: The attrition card shows a value of 3. Your sequence holds 2 defensive cards and you have 1 defense token: a total of 3, which meets the value, so you suffer no attrition damage and the token is discarded.',
  },
  {
    art: '/tokens/token_disrupt.svg',
    hint: 'Nullifies a defensive card during attrition',
    icon: 'shield-off',
    id: 'disrupt',
    keywordId: null,
    kind: 'counter',
    name: 'Disrupt',
    rule: "Place a disrupt token on a defensive card in another player's sequence during the Attrition phase. That card does not count toward their attrition total: it cannot cover the revealed attrition value. Discard all disrupt tokens at the end of the Attrition phase.\n\nExample: A hunter has 2 defensive cards in their sequence. You place a disrupt token on one of them. Only 1 card counts toward their attrition check.",
  },
  {
    art: '/tokens/token_strain.svg',
    hint: 'Draw 1 fewer card per token on refill',
    icon: 'weight',
    id: 'strain',
    keywordId: null,
    kind: 'counter',
    name: 'Strain',
    rule: 'Place strain tokens on your board when a monster effect or card ability causes them. When you refill your hand, discard all strain tokens and draw one fewer card for each token removed.\n\nExample: You would normally draw 5 cards on refill. You have 2 strain tokens on your board, so you draw 3 cards and discard both strain tokens.',
  },
  {
    art: null,
    hint: 'Counters placed on the mastery card',
    icon: 'sparkles',
    id: 'mastery',
    keywordId: null,
    kind: 'counter',
    name: 'Mastery',
    rule: null,
  },
  {
    art: null,
    hint: 'Counters placed on the weapon',
    icon: 'swords',
    id: 'weapon',
    keywordId: null,
    kind: 'counter',
    name: 'Weapon',
    rule: null,
  },
  {
    art: null,
    hint: 'Counters placed on the worn item',
    icon: 'backpack',
    id: 'item',
    keywordId: null,
    kind: 'counter',
    name: 'Item',
    rule: null,
  },
];

export const monsterStatuses: MonsterStatusDefinition[] = [
  {
    art: '/tokens/token_health_marker.svg',
    hint: 'Damage on the current stance card',
    icon: 'heart-crack',
    id: 'damage',
    keywordId: null,
    kind: 'counter',
    name: 'Damage',
    rule: null,
  },
  {
    art: null,
    hint: 'Per player, from the stance card',
    icon: 'shield',
    id: 'toughness',
    keywordId: null,
    kind: 'counter',
    name: 'Toughness',
    rule: 'When you deal damage to the monster, place that many damage tokens on the current stance card. If the damage the monster sustains is equal to or higher than the stance card’s toughness value: the printed number multiplied by the player count: inflict a wound: reduce the monster’s health by 1, then remove damage tokens equal to the toughness value. When the damage is enough for several wounds, inflict them one at a time: a wound can complete the stance and change the toughness value. Remaining damage carries over to the next stance card.',
  },
  {
    art: '/tokens/token_bonus_damage_empty.svg',
    hint: 'Bonus damage tokens',
    icon: 'plus',
    id: 'bonus',
    keywordId: null,
    kind: 'counter',
    name: 'Damage bonus',
    rule: 'During the game, the monster might add bonuses to its damage value. When that happens, track those bonuses by placing a bonus damage token (+1, +2) on the current stance card. Card abilities that give a damage bonus specify how long that bonus lasts: discard the token to indicate that the monster no longer has that bonus.',
  },
  {
    art: '/tokens/token_struggle.svg',
    hint: 'Unleash at 3 per player',
    icon: 'flame',
    id: 'struggle',
    keywordId: 'unleash',
    kind: 'counter',
    name: 'Struggle',
    rule: null,
  },
  {
    art: '/tokens/token_acceleration.svg',
    hint: '+1 struggle each at upkeep',
    icon: 'fast-forward',
    id: 'acceleration',
    keywordId: 'acceleration-token',
    kind: 'counter',
    name: 'Acceleration',
    rule: null,
  },
  {
    art: '/tokens/token_blind.svg',
    hint: 'Chosen peril card is blank until your next turn',
    icon: 'eye-off',
    id: 'blind',
    keywordId: 'blind',
    kind: 'token',
    name: 'Blind',
    rule: null,
  },
  {
    art: '/tokens/token_confused.svg',
    hint: 'Next boost cancelled; drops at round start',
    icon: 'circle-help',
    id: 'confuse',
    keywordId: 'confuse',
    kind: 'token',
    name: 'Confused',
    rule: null,
  },
  {
    art: '/tokens/token_stun.svg',
    hint: 'Behaviour card cannot trigger this round',
    icon: 'sparkles',
    id: 'stun',
    keywordId: 'stun',
    kind: 'token',
    name: 'Stun',
    rule: null,
  },
  {
    art: '/tokens/token_vunerable.svg',
    hint: 'Next damage doubled',
    icon: 'crosshair',
    id: 'vulnerable',
    keywordId: 'vulnerable',
    kind: 'token',
    name: 'Vulnerable',
    rule: null,
  },
  {
    art: '/tokens/token_slow.svg',
    hint: 'No behaviour refill this turn',
    icon: 'snowflake',
    id: 'slow',
    keywordId: 'slow',
    kind: 'token',
    name: 'Slowed',
    rule: null,
  },
  {
    art: '/tokens/token_unstoppable.svg',
    hint: '+1 struggle per behaviour card',
    icon: 'zap',
    id: 'unstoppable',
    keywordId: null,
    kind: 'token',
    name: 'Unstoppable',
    rule: 'While the monster is unstoppable, it gains 1 struggle after each behavior card it triggers, whether from a stance change or a Peril card.',
  },
  {
    art: null,
    hint: 'Monster damage is doubled',
    icon: 'x',
    id: 'double',
    keywordId: null,
    kind: 'token',
    name: '×2 damage',
    rule: 'The ×2 icon doubles the monster’s damage. The doubled amount still counts as a single source of damage, so card abilities that prevent monster damage also prevent the doubled damage.',
  },
];

export const statusById = (id: HunterCondition | HunterCounter | 'knockedOut'): HunterStatusDefinition | undefined =>
  hunterStatuses.find((status) => status.id === id);

export const monsterStatusById = (id: MonsterCounter | MonsterToken): MonsterStatusDefinition | undefined =>
  monsterStatuses.find((status) => status.id === id);

export const statusRule = (status: StatusDefinition): Keyword | undefined =>
  status.keywordId === null ? undefined : keywords.find((keyword) => keyword.id === status.keywordId);
