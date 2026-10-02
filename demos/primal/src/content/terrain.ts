import type { Terrain, TerrainRule } from '../domain/types';

/**
 * Terrain tokens placed on the combat board sectors. The rule text mirrors the Rulebook's
 * terrain section, shown on the board rows and in each token's rule drawer.
 */

const token = (id: string) => `/terrain_tokens/${id}.png`;
const rule = (
  timing: string | null,
  effect: string,
  condition: string | null = null,
  details: string[] = [],
): TerrainRule => ({ condition, details, effect, status: 'verified', timing });

export const terrains: Terrain[] = [
  {
    expansionId: 'core',
    icon: token('rock'),
    id: 'rock',
    name: 'Rock',
    rule: rule(
      'When suffering attrition damage',
      'You may remove the Rock from the game to prevent that damage.',
      'You are in a Rock sector.',
    ),
  },
  {
    expansionId: 'core',
    icon: token('water'),
    id: 'water',
    name: 'Water',
    rule: rule('While you are in this sector', 'Your sequence limit is 3 instead of 5.', null, [
      'A Water terrain modifies your standard sequence limit, but does not prevent any card ability or other game effect from increasing or further decreasing it.',
      'Water Spread: you cannot place more than one Water terrain token in each sector. If you are instructed to place one in a sector that already has one, place a Water terrain token in each of its adjacent sectors instead.',
    ]),
    // Fire's placement turns it to fog: physically a swap of chips, digitally an in-place transform.
    transformsTo: 'fog',
  },
  {
    expansionId: 'core',
    icon: token('brush'),
    id: 'brush',
    name: 'Brush',
    rule: rule(
      'At the start of your Movement phase',
      'You may recycle a Dodge card from your hand to hide in the Brush.',
      'You are in a sector with a Brush terrain.',
      [
        'If you do, place your miniature on the Brush terrain token. Your turn pauses and play passes to the next player in player order.',
        'Name a player who has not yet played their turn this round. When that player has completed their turn, leave the Brush and resume your turn with the Movement phase.',
        'While your turn is paused, you are not the active player and cannot assist other players or taunt the monster.',
        'When you resume your turn, you are once again the active player and play out your turn as usual.',
        'Only one player at a time can hide in the Brush.',
        "Assist: during another player's Action phase, discard a card with Assist to let the active player draw 1. Once per turn per player.",
        'Recycle [Color]: discard X cards of the indicated color to draw X.',
        "Taunt: discard a card with Taunt during another player's turn: the active player draws 1, you take the aggro token, and the monster turns to your sector. Once per turn.",
      ],
    ),
  },
  {
    expansionId: 'core',
    icon: token('cyricae'),
    id: 'cyricae',
    name: 'Cyricae',
    rule: rule(
      'When you play an attack card in your sequence',
      'Increase that attack’s damage by your weapon level.',
      'You are in a Cyricae sector.',
    ),
  },
  {
    expansionId: 'core',
    icon: token('baethanis'),
    id: 'baethanis',
    name: 'Baethanis',
    rule: rule(
      'At the start of your turn',
      'Heal damage equal to your weapon level.',
      'You are in a sector with a Baethanis terrain.',
      ['Heal X: remove X damage tokens from your hunter board.'],
    ),
  },
  {
    expansionId: 'core',
    icon: token('plateau'),
    id: 'plateau',
    name: 'Plateau',
    rule: rule(
      'At the end of your turn',
      'You may decide to move onto the Plateau.',
      'You are in a sector with a Plateau terrain.',
      [
        'If you do, place your hunter miniature on that terrain token.',
        'While you are on the Plateau, whenever a behavior card is revealed, you may immediately place your hunter miniature on that card.',
        'If you do, cancel the effects of that behavior card (for example, skip its Reaction step), then perform a Riding check.',
        'If you start your turn on the Plateau, you must immediately step off it: place your miniature anywhere else in that same sector.',
        'Only one player at a time can be on a Plateau.',
        "Riding check: reveal the top card of the attrition deck and your action deck. If the stamina icons are at least the attrition value, deal your weapon damage and choose a sector; otherwise suffer the monster's damage and place it in your front sector.",
      ],
    ),
  },
  {
    expansionId: 'core',
    icon: token('sand'),
    id: 'sand',
    name: 'Sand',
    rule: rule('When you move from this sector', 'Increase the stamina cost of that movement by 1.'),
  },
  {
    expansionId: 'core',
    icon: token('fire'),
    id: 'fire',
    name: 'Fire',
    rule: rule('While there is a Fire terrain in your sector', 'You cannot play cards into your sequence.', null, [
      'This applies regardless of whether the Fire is red or yellow.',
      'Fire is placed as a consequence of card abilities and comes into play red side up.',
      'At the end of the round, flip any Fire terrain tokens to their yellow side. If a Fire is already yellow, remove it from the game instead.',
      'If you are instructed to place a Fire but there is already a Fire in that sector, flip that Fire to its red side instead. All players in that sector suffer burning.',
      'Terrain interaction, when you place a Fire terrain: remove any Brush in that sector from the game, and remove any Water in that sector from the game and replace it with a Fog terrain.',
      'Burning: take a burning token. The next time you empty your deck, discard it and suffer damage equal to your weapon level. If you are already burning, discard the top 5 cards of your deck instead.',
    ]),
  },
  {
    expansionId: 'core',
    icon: token('fog'),
    id: 'fog',
    name: 'Fog',
    rule: rule('When you move into this sector', 'You become threatened.'),
  },
  {
    expansionId: 'core',
    icon: token('synaerea'),
    id: 'synaerea',
    name: 'Synaerea',
    rule: rule(
      'At the start of your turn',
      'You may suffer damage equal to your weapon level to draw 1.',
      'You are in a Synaerea sector.',
    ),
  },
  {
    expansionId: 'core',
    icon: token('wildmaw'),
    id: 'wildmaw',
    name: 'Wildmaw',
    rule: rule(
      'At the end of your turn',
      'Suffer damage equal to your weapon level.',
      'You are in a Wildmaw sector and threatened.',
    ),
  },
  {
    expansionId: 'ice',
    icon: token('ice'),
    id: 'ice',
    name: 'Ice',
    rule: rule(
      'At the end of your turn',
      'Exile the top card of your action deck.',
      'You are in a sector with Ice terrain and threatened.',
      [
        'Exile: put the card into your exile zone, a game zone outside the field of play. Interactions with exiled cards are dictated exclusively by card abilities.',
        'When Fire is placed in this sector, the Ice melts and becomes Water.',
      ],
    ),
    // Fire melts it: the melt is Fire's placement interaction, available as a manual step too.
    transformsTo: 'water',
  },
  {
    expansionId: 'feather',
    icon: token('jungle_brush'),
    id: 'jungle-brush',
    name: 'Jungle Brush',
    rule: rule(
      'At the start of your Movement phase',
      'You may recycle an Aggro card from your hand to hide in the Jungle Brush.',
      'You are in a sector with a Jungle Brush terrain token.',
      [
        'Place your miniature on the Jungle Brush terrain token. Your turn pauses and play passes to the next player in player order.',
        'Name a player who has not yet played their turn this round. When that player completes their turn, leave the Jungle Brush and resume your turn with the Movement phase.',
        'While your turn is paused, you are not the active player and cannot assist other players or taunt the monster.',
        'When you resume your turn, you are once again the active player and play out your turn as usual.',
        'Only one player at a time can hide in the Jungle Brush.',
      ],
    ),
  },
  {
    expansionId: 'venom',
    icon: token('swamp'),
    id: 'swamp',
    name: 'Swamp',
    rule: rule(
      'When you pay the stamina cost for a Dodge card',
      'Increase that cost by 1.',
      'You are in a sector with a Swamp terrain.',
    ),
  },
  {
    expansionId: 'biome-crystal-caves-flooded-wilds',
    // The Flooded Wilds' token scan: a webp, unlike the core set's pngs.
    icon: '/terrain_tokens/deep_water.webp',
    id: 'deep-water',
    name: 'Deep-Water',
    rule: rule(
      'While in this sector',
      'Your sequence limit is reduced to 3, and when refilling your hand, your hand-size limit is reduced by 1 (draw one less card than usual).',
    ),
  },
];

export const terrainRuleText = (terrain: Terrain): string =>
  terrain.rule.status === 'unavailable'
    ? terrain.rule.effect
    : [terrain.rule.timing, terrain.rule.condition, terrain.rule.effect, ...terrain.rule.details]
        .filter(Boolean)
        .join(' ');

export const terrainById = (id: string): Terrain | undefined => terrains.find((entry) => entry.id === id);
