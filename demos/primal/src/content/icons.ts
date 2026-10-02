import iconData from './data/icons.json';

/**
 * Card color and general icon meanings from the rulebook's Keywords & Icons tables :
 * the shorthand printed on action cards, behavior cards and rule text.
 */
export interface GameIcon {
  /** Which glossary table the icon comes from. */
  group: 'color' | 'general';
  id: string;
  /** The printed icon, bracketed as in the rulebook, e.g. "[Defensive]". */
  name: string;
  text: string;
}

/** Rulebook icon tables extracted by `scripts/extract-quests.mjs`. */
export const gameIcons: GameIcon[] = iconData as GameIcon[];

/**
 * Card-text tokens that print as monochrome icons in the text's color: "[stamina]" renders as the
 * stamina icon wherever card text is shown, following the theme through `currentcolor`.
 * "[weapon]" is handled separately: it prints the viewing hunter's weapon-class icon.
 */
export const cardTokenIcons: Readonly<Record<string, string>> = {
  aggro: '/icons/icon_aggro.svg',
  defensive: '/icons/icon_defensive.svg',
  mastery: '/icons/icon_mastery.svg',
  offensive: '/icons/icon_offensive.svg',
  rhythm: '/icons/icon_rhythm.svg',
  stamina: '/icons/icon_stamina.svg',
};

/**
 * Card-type tokens that print with their own colored art: the attack, maneuver, parry and dodge
 * icons keep their printed colors in both themes and are never recolored by the text.
 */
export const coloredCardTokens: Readonly<Record<string, string>> = {
  attack: '/icons/icon_attack.svg',
  dodge: '/icons/icon_dodge.svg',
  maneuver: '/icons/icon_maneuver.svg',
  parry: '/icons/icon_parry.svg',
};

/**
 * Art for the rulebook's icon-table entries: the manual's Icon category shows the glyph itself.
 * The card-type entries render as colored images; every other entry renders as a monochrome
 * mask in the text color. Table entries without art keep their bracketed name only.
 */
export const gameIconArt: Readonly<Record<string, string>> = {
  aggro: '/icons/icon_aggro.svg',
  attack: '/icons/icon_attack.svg',
  defensive: '/icons/icon_defensive.svg',
  dodge: '/icons/icon_dodge.svg',
  maneuver: '/icons/icon_maneuver.svg',
  'monster-damage': '/icons/icon_monster_damage.svg',
  offensive: '/icons/icon_offensive.svg',
  parry: '/icons/icon_parry.svg',
  'player-count': '/icons/icon_per_player.svg',
  stamina: '/icons/icon_stamina.svg',
};
