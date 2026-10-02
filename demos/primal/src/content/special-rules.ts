import type { SpecialRule } from '../domain/types';

export type SpecialRuleId =
  | 'alternative-combat-board'
  | 'awakened-awakening-cards'
  | 'awakened-ballista-tokens'
  | 'awakened-behavior-deck'
  | 'awakened-extended-monster-board'
  | 'awakened-instinct-and-signature-behavior-cards'
  | 'awakened-level-3'
  | 'awakened-special-attrition'
  | 'awakened-special-objectives'
  | 'awakened-storm-track'
  | 'crystal-caves-biome'
  | 'deep-water-terrain'
  | 'dust-tokens'
  | 'dygorax-dust-tokens'
  | 'dygorax-hardening-track'
  | 'endless-swamp-biome'
  | 'felaxir-special-attrition'
  | 'felaxir-special-attrition-cards'
  | 'flooded-wilds-biome'
  | 'frozen-wastes-biome'
  | 'goldarks-biome'
  | 'hardening-track'
  | 'hurom-arkeum-tokens'
  | 'hurom-special-attrition'
  | 'hydar-thornvine-tokens'
  | 'hydar-venom-cards'
  | 'jekoros-charge-track'
  | 'jekoros-special-attrition'
  | 'jekoros-special-attrition-cards'
  | 'kharja-damaged-sectors'
  | 'korowon-water-cycle'
  | 'mamuraak-glaciation-track'
  | 'nightmare-biome'
  | 'niz-maraga-biome'
  | 'orouxen-debility-cards'
  | 'ozew-behavior-deck'
  | 'ozew-behavior-deck-setup'
  | 'ozew-rumble-deck'
  | 'ozew-rumble-deck-setup'
  | 'ozew-swarm-deck'
  | 'ozew-swarm-deck-setup'
  | 'pazis-paralyzing-spore-cards'
  | 'pazis-special-behavior-deck-setup'
  | 'reikal-venom-cards'
  | 'reikal-venomous-serpent-cards'
  | 'sunset-plains-biome'
  | 'taraska-lava-diagram'
  | 'taraska-lava-geyser'
  | 'taraska-special-attrition'
  | 'taraska-special-attrition-cards'
  | 'the-awakened-ballista-tokens'
  | 'the-awakened-extended-monster-board'
  | 'the-awakened-instinct-and-signature-behavior-cards'
  | 'the-awakened-special-attrition-cards'
  | 'the-awakened-special-objective-cards'
  | 'thunder-mountains-biome'
  | 'toramat-behavior-deck'
  | 'toramat-behavior-deck-setup'
  | 'toramat-dust-tokens'
  | 'toramat-hardening-track'
  | 'toramat-special-attrition'
  | 'toramat-special-attrition-cards'
  | 'vyraxen-prologue'
  | 'woltyar-biome'
  | 'xitheros-bleeding-cards'
  | 'zekalith-special-peril-cards'
  | 'zekalith-vibration-track'
  | 'zekath-special-peril-cards'
  | 'zekath-vibration-track';

export interface SpecialRuleDefinition {
  description: string;
  id: SpecialRuleId;
  name: string;
  rulebookPage: number;
}

export const SPECIAL_RULES: Record<SpecialRuleId, SpecialRuleDefinition> = {
  'alternative-combat-board': {
    description: 'Use the alternative combat board (reverse side of the board).',
    id: 'alternative-combat-board',
    name: 'Alternative Combat Board',
    rulebookPage: 79,
  },
  'awakened-awakening-cards': {
    description: 'Place the special Awakening cards in the rightmost two behavior slots on the extended monster board.',
    id: 'awakened-awakening-cards',
    name: 'Awakening Cards',
    rulebookPage: 79,
  },
  'awakened-ballista-tokens': {
    description:
      'Ballista tokens are placed in the corners of the combat board. At the end of each round, ballistas activate per the Artillery Assault objective card. Each ballista targets the two sectors nearest to its corner; a ballista has line of sight to the monster if one of its targeted sectors is the front sector. A ballista can be loaded (black side) or unloaded (grey side).',
    id: 'awakened-ballista-tokens',
    name: 'Ballista Tokens (The Awakened)',
    rulebookPage: 99,
  },
  'awakened-behavior-deck': {
    description:
      'The Awakened has a pool of 22 behavior cards divided into two categories: Signature behavior cards (identified by The Awakened’s trophy icon) and Instinct behavior cards (one for each other monster in the game). Signature cards are always included in the behavior deck; Instinct cards are added according to the specific rules of the scenario.',
    id: 'awakened-behavior-deck',
    name: 'Instinct and Signature Behavior Cards (The Awakened)',
    rulebookPage: 101,
  },
  'awakened-extended-monster-board': {
    description:
      'The Awakened’s monster board has 6 behavior slots instead of the standard 3. The rightmost two slots start locked by special Awakening cards. Over the course of the game, the monster removes these cards through specific abilities, unlocking those behavior slots. Once unlocked, the additional slots follow standard behavior slot rules and must be filled and refilled with behavior cards.',
    id: 'awakened-extended-monster-board',
    name: 'Extended Monster Board (The Awakened)',
    rulebookPage: 100,
  },
  'awakened-instinct-and-signature-behavior-cards': {
    description:
      'The Awakened has a pool of 22 behavior cards divided into two categories: Signature behavior cards (identified by The Awakened’s trophy icon) and Instinct behavior cards (one for each other monster in the game). Signature cards are always included in the behavior deck; Instinct cards are added according to the specific rules of the scenario.',
    id: 'awakened-instinct-and-signature-behavior-cards',
    name: 'Instinct and Signature Behavior Cards (The Awakened)',
    rulebookPage: 101,
  },
  'awakened-level-3': {
    description: 'These expedition scenarios must be played at level 3.',
    id: 'awakened-level-3',
    name: 'Level 3 Only',
    rulebookPage: 79,
  },
  'awakened-special-attrition': {
    description:
      'The Awakened features special attrition cards that follow the same special attrition card rules as other monsters. These cards may require specific defensive card colors instead of generic ones.',
    id: 'awakened-special-attrition',
    name: 'Special Attrition Cards (The Awakened)',
    rulebookPage: 100,
  },
  'awakened-special-objectives': {
    description:
      'Special objective cards: The Commander’s Voice and Artillery Assault are always included in the setup. The Heartpiercer is specific to Campaign mode and only used if unlocked through achievements. Also includes a sealed envelope (Reward ID S3) to be opened only when instructed by the game; it contains a secret card unlocked by certain achievements.',
    id: 'awakened-special-objectives',
    name: 'Special Objective Cards & Sealed Envelope (The Awakened)',
    rulebookPage: 102,
  },
  'awakened-storm-track': {
    description: 'Set the storm level to 1 by placing the storm marker in the corresponding space on the Storm track.',
    id: 'awakened-storm-track',
    name: 'Storm Track',
    rulebookPage: 79,
  },
  'crystal-caves-biome': {
    description:
      'This biome uses a bag with 16 colored crystal tokens (red, yellow, blue, green). During setup, shuffle all tokens and draw one per player, placing it in the sector indicated on the token’s back. At the start of each round, draw one token and place it in the indicated sector. When a player pays the stamina cost to play a card, they may remove a crystal token of the same color as that card from their sector to reduce that stamina cost by 1. At the end of round 6, the cavern collapses and the game ends; rounds 7–10 are marked as broken apart on the round track.',
    id: 'crystal-caves-biome',
    name: 'Crystal Caves Biome',
    rulebookPage: 6,
  },
  'deep-water-terrain': {
    description:
      'While in a sector with deep-water terrain, your sequence limit is reduced to 3. When refilling your hand, your hand-size limit is reduced by 1 (draw one less card than usual).',
    id: 'deep-water-terrain',
    name: 'Deep-Water Terrain',
    rulebookPage: 7,
  },
  'dust-tokens': {
    description:
      'At the start of your Attrition phase, take a disrupt token for each Dust in your sector. Place disrupt tokens on defensive cards in your sequence; those cards do not count for your attrition check this turn. Discard disrupt tokens at the end of your Attrition phase. Remove all Dust tokens from the board at the end of the round. Maximum 2 Dust tokens per sector.',
    id: 'dust-tokens',
    name: 'Dust Tokens',
    rulebookPage: 70,
  },
  'dygorax-dust-tokens': {
    description:
      'At the start of your Attrition phase, take a disrupt token for each Dust in your sector. Place disrupt tokens on defensive cards in your sequence; those cards do not count for your attrition check this turn. Discard disrupt tokens at the end of your Attrition phase. Remove all Dust tokens from the board at the end of the round. Maximum 2 Dust tokens per sector.',
    id: 'dygorax-dust-tokens',
    name: 'Dust Tokens (Dygorax)',
    rulebookPage: 71,
  },
  'dygorax-hardening-track': {
    description:
      'Set the hardening level to 0. The Hardening track measures the monster’s hardening level. When the hardening level reaches 3, the monster becomes Hardened. While Hardened, excess damage is not retained when converting to wounds, the monster cannot be stunned or confused, and you cannot inflict Vulnerable.',
    id: 'dygorax-hardening-track',
    name: 'Hardening Track (Dygorax)',
    rulebookPage: 71,
  },
  'endless-swamp-biome': {
    description:
      'This biome uses a bag with 16 Toxic Fume tokens. During setup, shuffle all tokens and draw one per player, placing it in the sector indicated on the token’s back. At the start of each round, draw one token and place it in the indicated sector. At the end of your turn, if you are in a sector containing one or more Toxic Fume tokens, pick one up and place it on your hunter board. A player who accumulates 3 Toxic Fume tokens is eliminated from the game.',
    id: 'endless-swamp-biome',
    name: 'Endless Swamp Biome',
    rulebookPage: 7,
  },
  'felaxir-special-attrition': {
    description:
      'Remove two base attrition cards with an attrition value of 1 from the attrition deck, and add Felaxir’s special attrition cards instead. Special attrition cards may require specific defensive card colors instead of generic ones.',
    id: 'felaxir-special-attrition',
    name: 'Special Attrition Cards (Felaxir)',
    rulebookPage: 74,
  },
  'felaxir-special-attrition-cards': {
    description:
      'Remove two base attrition cards with an attrition value of 1 from the attrition deck, and add Felaxir’s special attrition cards instead. Special attrition cards may require specific defensive card colors instead of generic ones.',
    id: 'felaxir-special-attrition-cards',
    name: 'Special Attrition Cards (Felaxir)',
    rulebookPage: 74,
  },
  'flooded-wilds-biome': {
    description:
      'This biome introduces deep-water terrain. Use double-sided water tokens (water on front, deep-water on back). During rounds 2, 3, 5, 6, 8, 9, and 10, the tide rises. At the start of these rounds, flip all water in play to the deep-water side; flip them back at the end of the round. While a player is in a sector with deep-water terrain, their sequence limit is reduced to 3, and when refilling their hand, their hand-size limit is reduced by 1 (draw one less card than usual).',
    id: 'flooded-wilds-biome',
    name: 'Flooded Wilds Biome',
    rulebookPage: 7,
  },
  'frozen-wastes-biome': {
    description:
      'During rounds 1, 3, and 5, all players’ mastery cards are considered blank. From round 8 onward, all mastery cards remain blank permanently for the rest of the fight. A blank mastery card has no Focus ability text (when unfocused) and no Mastery ability text (when focused), and cannot be focused during rounds in which it is blank.',
    id: 'frozen-wastes-biome',
    name: 'Frozen Wastes Biome',
    rulebookPage: 7,
  },
  'goldarks-biome': {
    description:
      'During rounds 2, 5, 8, 9, and 10, whenever a player or the monster suffers damage, that damage is doubled. When you inflict a wound to the monster during these rounds, remove any excess damage (do not carry it over).',
    id: 'goldarks-biome',
    name: 'Goldarks Biome',
    rulebookPage: 6,
  },
  'hardening-track': {
    description:
      'Set the hardening level to 0. The Hardening track measures the monster’s hardening level. When the hardening level reaches 3, the monster becomes Hardened. While Hardened, excess damage is not retained when converting to wounds, the monster cannot be stunned or confused, and you cannot inflict Vulnerable.',
    id: 'hardening-track',
    name: 'Hardening Track',
    rulebookPage: 70,
  },
  'hurom-arkeum-tokens': {
    description:
      'Arkeum tokens protect Hurom from attacks. When you play an attack card, if you are in a sector with an Arkeum token, that token prevents any damage you would normally deal to Hurom. Then remove that Arkeum token from the board. In each sector, you can have a maximum of 1 Arkeum token per player.',
    id: 'hurom-arkeum-tokens',
    name: 'Arkeum Tokens (Hurom)',
    rulebookPage: 97,
  },
  'hurom-special-attrition': {
    description:
      'Take Hurom’s special attrition cards and place them near the monster board. These cards are out of play until a card ability instructs you to interact with them.',
    id: 'hurom-special-attrition',
    name: 'Hurom Special Attrition Cards',
    rulebookPage: 77,
  },
  'hydar-thornvine-tokens': {
    description:
      'Thornvine tokens are placed on the board by Hydar’s card abilities. When you pay the stamina cost for a [Defensive] card, if you are in a sector with a thornvine token, increase that cost by 1.',
    id: 'hydar-thornvine-tokens',
    name: 'Thornvine Tokens (Hydar)',
    rulebookPage: 4,
  },
  'hydar-venom-cards': {
    description:
      'Each player has a reserve of 3 Hydar’s Venom cards. When instructed, add a Venom card to your discard pile. Venom cards clog up your action deck. Unlike Wound cards, Venom cards accumulate in your hand; the only way to get rid of them is to use them to generate stamina, but doing so causes you to suffer damage equal to your weapon level.',
    id: 'hydar-venom-cards',
    name: 'Venom Cards (Hydar)',
    rulebookPage: 4,
  },
  'jekoros-charge-track': {
    description:
      'Set the charge level to 0. The Charge track measures Jekoros’ charge level over the course of the game. Each time you are instructed to increase the charge level by X, move the charge marker X spaces along the track. Jekoros’ card abilities interact with the charge level.',
    id: 'jekoros-charge-track',
    name: 'Charge Track (Jekoros)',
    rulebookPage: 77,
  },
  'jekoros-special-attrition': {
    description:
      'Remove all base attrition cards with an attrition value of 1 from the attrition deck, and add Jekoros’ special attrition cards instead. Special attrition cards may require specific defensive card colors instead of generic ones.',
    id: 'jekoros-special-attrition',
    name: 'Special Attrition Cards (Jekoros)',
    rulebookPage: 77,
  },
  'jekoros-special-attrition-cards': {
    description:
      'Remove all base attrition cards with an attrition value of 1 from the attrition deck, and add Jekoros’ special attrition cards instead. Special attrition cards may require specific defensive card colors instead of generic ones.',
    id: 'jekoros-special-attrition-cards',
    name: 'Special Attrition Cards (Jekoros)',
    rulebookPage: 77,
  },
  'kharja-damaged-sectors': {
    description:
      'Players place damage tokens in specific sectors on the board to indicate they have been damaged. These sectors have no inherent effect in the game, but some of Kharja’s card abilities reference them.',
    id: 'kharja-damaged-sectors',
    name: 'Damaged Sectors (Kharja)',
    rulebookPage: 69,
  },
  'korowon-water-cycle': {
    description:
      'This is a card trait. A trait has no inherent effect in the game, but card abilities may reference other cards that possess or lack specific traits.',
    id: 'korowon-water-cycle',
    name: 'Water Cycle (Korowon)',
    rulebookPage: 115,
  },
  'mamuraak-glaciation-track': {
    description:
      'The Glaciation track measures the glaciation level over the course of the game. Each time you are instructed to increase the glaciation level by X, move the glaciation marker X spaces along the track. Some of Mamuraak’s card abilities interact with the Glaciation track, so their effects become more impactful as the glaciation level increases.',
    id: 'mamuraak-glaciation-track',
    name: 'Glaciation Track (Mamuraak)',
    rulebookPage: 3,
  },
  'nightmare-biome': {
    description:
      'Each player’s base weapon damage equals their weapon level (rounded down). At the start of round 4, each player gains a Transformation token (human side up). Playing three consecutive offensive cards flips it to the monster side, restoring that player’s base weapon damage to its printed value; after flipping, they cannot assist other players or receive assists.',
    id: 'nightmare-biome',
    name: 'Nightmare Biome',
    rulebookPage: 6,
  },
  'niz-maraga-biome': {
    description:
      'Next to each round on the round track, one or two icons show action card types. Each time the round marker advances, all players must recycle a card from their hand matching the color shown for the current round. If a player cannot recycle a card of that color, they suffer damage equal to the monster’s Aggression Level. If two color icons are shown, each player must recycle one card of each indicated color; if they cannot, they suffer damage as described.',
    id: 'niz-maraga-biome',
    name: 'Niz-Maraga Biome',
    rulebookPage: 6,
  },
  'orouxen-debility-cards': {
    description:
      'Each player has a reserve of 4 Debility cards. These cards are added to a player’s hand or discard pile by Orouxen’s card abilities. At the start of your Action phase, place any Debility cards from your hand into your sequence; they count toward your sequence limit as if they were action cards. When you discard the action cards in your sequence during your End of turn step, discard all Debility cards in your sequence as well. At the end of the scenario, remove all Debility cards from your deck.',
    id: 'orouxen-debility-cards',
    name: 'Debility Cards (Orouxen)',
    rulebookPage: 73,
  },
  'ozew-behavior-deck': {
    description:
      'Leave Ozew’s Lightning behavior card out of the behavior deck. It is considered out of play until a card ability instructs you to interact with it.',
    id: 'ozew-behavior-deck',
    name: 'Behavior Deck Setup (Ozew)',
    rulebookPage: 76,
  },
  'ozew-behavior-deck-setup': {
    description:
      'Leave Ozew’s Lightning behavior card out of the behavior deck. It is considered out of play until a card ability instructs you to interact with it.',
    id: 'ozew-behavior-deck-setup',
    name: 'Behavior Deck Setup (Ozew)',
    rulebookPage: 76,
  },
  'ozew-rumble-deck': {
    description:
      'Shuffle the Rumble cards to form the rumble deck and place it near the monster board. Rumble cards indicate specific sectors of the board (marked sectors) that some of Ozew’s card abilities reference. When a Rumble card becomes active, discard the previous active Rumble card, if any.',
    id: 'ozew-rumble-deck',
    name: 'Rumble Deck Setup (Ozew)',
    rulebookPage: 76,
  },
  'ozew-rumble-deck-setup': {
    description:
      'Shuffle the Rumble cards to form the rumble deck and place it near the monster board. Rumble cards indicate specific sectors of the board (marked sectors) that some of Ozew’s card abilities reference. When a Rumble card becomes active, discard the previous active Rumble card, if any.',
    id: 'ozew-rumble-deck-setup',
    name: 'Rumble Deck Setup (Ozew)',
    rulebookPage: 76,
  },
  'ozew-swarm-deck': {
    description:
      'Shuffle Ozew’s Swarm cards to form the swarm deck and place it near the monster board. This deck is considered out of play until a card ability instructs you to interact with it. While a Swarm card is in play, you cannot deal damage to Ozew; instead, damage is dealt to a Swarm card. Defeat a Swarm card by dealing cumulative damage equal to Ozew’s toughness value.',
    id: 'ozew-swarm-deck',
    name: 'Swarm Deck Setup (Ozew)',
    rulebookPage: 76,
  },
  'ozew-swarm-deck-setup': {
    description:
      'Shuffle Ozew’s Swarm cards to form the swarm deck and place it near the monster board. This deck is considered out of play until a card ability instructs you to interact with it. While a Swarm card is in play, you cannot deal damage to Ozew; instead, damage is dealt to a Swarm card. Defeat a Swarm card by dealing cumulative damage equal to Ozew’s toughness value.',
    id: 'ozew-swarm-deck-setup',
    name: 'Swarm Deck Setup (Ozew)',
    rulebookPage: 76,
  },
  'pazis-paralyzing-spore-cards': {
    description:
      'Pazis can add Paralyzing Spore cards to a player’s deck. When instructed, take a Paralyzing Spore card from your personal reserve and place it on top of your discard pile. While a Paralyzing Spore card is in your hand, you cannot move. At the end of your Action phase, discard it from your hand. Each player has a reserve of 4 Paralyzing Spore cards.',
    id: 'pazis-paralyzing-spore-cards',
    name: 'Paralyzing Spore Cards (Pazis)',
    rulebookPage: 3,
  },
  'pazis-special-behavior-deck-setup': {
    description:
      'Leave Pazis’ Aerial Evasion card out of the behavior deck. It is considered out of play until a card ability instructs you to interact with it.',
    id: 'pazis-special-behavior-deck-setup',
    name: 'Special Behavior Deck Setup (Pazis)',
    rulebookPage: 3,
  },
  'reikal-venom-cards': {
    description:
      'Each player has a reserve of 4 Reikal’s Venom cards. When instructed, add a Venom card to your discard pile. Venom cards clog up your action deck. Unlike Wound cards, Venom cards accumulate in your hand; the only way to get rid of them is to use them to generate stamina, but doing so causes you to suffer damage equal to your weapon level.',
    id: 'reikal-venom-cards',
    name: 'Venom Cards (Reikal)',
    rulebookPage: 4,
  },
  'reikal-venomous-serpent-cards': {
    description:
      'Venomous Serpent cards are placed next to your hunter board when a Venomous Serpent engages you. The ability text of that card applies only to you while engaged. To remove a Venomous Serpent card, you must play a [Defensive] card in your sequence without resolving either its ability text or effect (the attack deals no damage to Reikal, but eliminates the Venomous Serpent).',
    id: 'reikal-venomous-serpent-cards',
    name: 'Venomous Serpent Cards (Reikal)',
    rulebookPage: 4,
  },
  'sunset-plains-biome': {
    description:
      'During rounds 2, 5, and 8, all action cards played during that round are considered blank; effects based on a card’s color still apply.',
    id: 'sunset-plains-biome',
    name: 'Sunset Plains Biome',
    rulebookPage: 7,
  },
  'taraska-lava-diagram': {
    description:
      'Taraska’s behavior cards feature a Lava diagram that highlights a specific side of the monster in orange. This diagram is used by the Lava Geyser keyword ability. The front of the monster is always at the bottom of the diagram.',
    id: 'taraska-lava-diagram',
    name: 'Lava Diagram (Taraska)',
    rulebookPage: 6,
  },
  'taraska-lava-geyser': {
    description: 'Places fire terrain tokens during its behaviors via the Lava diagram.',
    id: 'taraska-lava-geyser',
    name: 'Lava Geyser (Taraska)',
    rulebookPage: 6,
  },
  'taraska-special-attrition': {
    description:
      'Remove three base attrition cards with attrition values of 0, 1, and 2 from the attrition deck. Then add Taraska’s special attrition cards instead. Special attrition cards may require specific defensive card colors instead of generic ones.',
    id: 'taraska-special-attrition',
    name: 'Special Attrition Cards (Taraska)',
    rulebookPage: 6,
  },
  'taraska-special-attrition-cards': {
    description:
      'Remove three base attrition cards with attrition values of 0, 1, and 2 from the attrition deck. Then add Taraska’s special attrition cards instead. Special attrition cards may require specific defensive card colors instead of generic ones.',
    id: 'taraska-special-attrition-cards',
    name: 'Special Attrition Cards (Taraska)',
    rulebookPage: 6,
  },
  'the-awakened-ballista-tokens': {
    description:
      'Ballista tokens are placed in the corners of the combat board. At the end of each round, ballistas activate per the Artillery Assault objective card. Each ballista targets the two sectors nearest to its corner; a ballista has line of sight to the monster if one of its targeted sectors is the front sector. A ballista can be loaded (black side) or unloaded (grey side).',
    id: 'the-awakened-ballista-tokens',
    name: 'Ballista Tokens (The Awakened)',
    rulebookPage: 99,
  },
  'the-awakened-extended-monster-board': {
    description:
      'The Awakened’s monster board has 6 behavior slots instead of the standard 3. The rightmost two slots start locked by special Awakening cards. Over the course of the game, the monster removes these cards through specific abilities, unlocking those behavior slots. Once unlocked, the additional slots follow standard behavior slot rules and must be filled and refilled with behavior cards.',
    id: 'the-awakened-extended-monster-board',
    name: 'Extended Monster Board (The Awakened)',
    rulebookPage: 100,
  },
  'the-awakened-instinct-and-signature-behavior-cards': {
    description:
      'The Awakened has a pool of 22 behavior cards divided into two categories: Signature behavior cards (identified by The Awakened’s trophy icon) and Instinct behavior cards (one for each other monster in the game). Signature cards are always included in the behavior deck; Instinct cards are added according to the specific rules of the scenario.',
    id: 'the-awakened-instinct-and-signature-behavior-cards',
    name: 'Instinct and Signature Behavior Cards (The Awakened)',
    rulebookPage: 101,
  },
  'the-awakened-special-attrition-cards': {
    description:
      'The Awakened features special attrition cards that follow the same special attrition card rules as other monsters. These cards may require specific defensive card colors instead of generic ones.',
    id: 'the-awakened-special-attrition-cards',
    name: 'Special Attrition Cards (The Awakened)',
    rulebookPage: 100,
  },
  'the-awakened-special-objective-cards': {
    description:
      'Special objective cards: The Commander’s Voice and Artillery Assault are always included in the setup. The Heartpiercer is specific to Campaign mode and only used if unlocked through achievements. Also includes a sealed envelope (Reward ID S3) to be opened only when instructed by the game; it contains a secret card unlocked by certain achievements.',
    id: 'the-awakened-special-objective-cards',
    name: 'Special Objective Cards & Sealed Envelope (The Awakened)',
    rulebookPage: 102,
  },
  'thunder-mountains-biome': {
    description:
      'During your movement phase, you suffer damage equal to the monster’s aggression level (minimum 1) unless you move by paying the stamina cost with a [Dodge] card. During rounds 3, 4, 6, 7, 9, and 10, all damage is doubled.',
    id: 'thunder-mountains-biome',
    name: 'Thunder Mountains Biome',
    rulebookPage: 7,
  },
  'toramat-behavior-deck': {
    description:
      'Leave Toramat’s Crashing Charge and Out of Control behavior cards out of the behavior deck. They are considered out of play until a card ability instructs you to interact with them.',
    id: 'toramat-behavior-deck',
    name: 'Behavior Deck Setup (Toramat)',
    rulebookPage: 70,
  },
  'toramat-behavior-deck-setup': {
    description:
      'Leave Toramat’s Crashing Charge and Out of Control behavior cards out of the behavior deck. They are considered out of play until a card ability instructs you to interact with them.',
    id: 'toramat-behavior-deck-setup',
    name: 'Behavior Deck Setup (Toramat)',
    rulebookPage: 70,
  },
  'toramat-dust-tokens': {
    description:
      'At the start of your Attrition phase, take a disrupt token for each Dust in your sector. Place disrupt tokens on defensive cards in your sequence; those cards do not count for your attrition check this turn. Discard disrupt tokens at the end of your Attrition phase. Remove all Dust tokens from the board at the end of the round. Maximum 2 Dust tokens per sector.',
    id: 'toramat-dust-tokens',
    name: 'Dust Tokens (Toramat)',
    rulebookPage: 70,
  },
  'toramat-hardening-track': {
    description:
      'Set the hardening level to 0. The Hardening track measures the monster’s hardening level. When the hardening level reaches 3, the monster becomes Hardened. While Hardened, excess damage is not retained when converting to wounds, the monster cannot be stunned or confused, and you cannot inflict Vulnerable.',
    id: 'toramat-hardening-track',
    name: 'Hardening Track (Toramat)',
    rulebookPage: 70,
  },
  'toramat-special-attrition': {
    description:
      'Remove two base attrition cards with an attrition value of 1 from the attrition deck, and add Toramat’s special attrition cards instead. Special attrition cards may require specific defensive card colors instead of generic ones.',
    id: 'toramat-special-attrition',
    name: 'Special Attrition Cards (Toramat)',
    rulebookPage: 70,
  },
  'toramat-special-attrition-cards': {
    description:
      'Remove two base attrition cards with an attrition value of 1 from the attrition deck, and add Toramat’s special attrition cards instead. Special attrition cards may require specific defensive card colors instead of generic ones.',
    id: 'toramat-special-attrition-cards',
    name: 'Special Attrition Cards (Toramat)',
    rulebookPage: 70,
  },
  'vyraxen-prologue': {
    description: 'Prologue scenario uses the aggression 0 stance cards and the Hit the Tail! objective.',
    id: 'vyraxen-prologue',
    name: 'Vyraxen Prologue',
    rulebookPage: 68,
  },
  'woltyar-biome': {
    description:
      'At the start of each round, each player discards the top X cards of their deck, where X equals the current round number. Lava crossing: When a player during their movement crosses the lava rivers that cut diagonally across the board, they suffer burning.',
    id: 'woltyar-biome',
    name: 'Woltyar Biome',
    rulebookPage: 6,
  },
  'xitheros-bleeding-cards': {
    description:
      'Each player has a Bleeding card that relates to their hunter. When a card ability instructs you to shuffle a Bleeding card into your action deck, use your corresponding Bleeding card. When you draw a Bleeding card, discard it immediately and Xitheros gains 1 struggle. Bleeding cards clog up your action deck.',
    id: 'xitheros-bleeding-cards',
    name: 'Bleeding Cards (Xitheros)',
    rulebookPage: 7,
  },
  'zekalith-special-peril-cards': {
    description:
      'Pulsating, Fear, and Dissonance are special peril cards that are not connected with specific stances. These peril cards follow special rules: the first monster stance instructs players to bring a random special peril card into play. As the game progresses, players replace that card with a different special peril card when the Vibration track reaches level 3.',
    id: 'zekalith-special-peril-cards',
    name: 'Special Peril Cards (Zekalith)',
    rulebookPage: 6,
  },
  'zekalith-vibration-track': {
    description:
      'The Vibration track measures Zekalith’s vibration level. Each time you are instructed to increase the vibration level by X, move the vibration marker X spaces along the track. Each time the vibration level reaches 3, randomly replace the special peril card with one of the two special peril cards not currently in play, then reset the Vibration track to 0.',
    id: 'zekalith-vibration-track',
    name: 'Vibration Track (Zekalith)',
    rulebookPage: 6,
  },
  'zekath-special-peril-cards': {
    description:
      'Deception, Spark, and Disturbance are special peril cards that are not connected with specific stances. These peril cards follow special rules: the first monster stance instructs players to bring a random special peril card into play. As the game progresses, players replace that card with a different special peril card when the Vibration track reaches level 3.',
    id: 'zekath-special-peril-cards',
    name: 'Special Peril Cards (Zekath)',
    rulebookPage: 6,
  },
  'zekath-vibration-track': {
    description:
      'The Vibration track measures Zekath’s vibration level. Each time you are instructed to increase the vibration level by X, move the vibration marker X spaces along the track. Each time the vibration level reaches 3, randomly replace the special peril card with one of the two special peril cards not currently in play, then reset the Vibration track to 0.',
    id: 'zekath-vibration-track',
    name: 'Vibration Track (Zekath)',
    rulebookPage: 6,
  },
};

/** The biome board's own scenario rule: the die face's biome, e.g. the Flooded Wilds tide. */
export const biomeSpecialRule = (biome: string): SpecialRule | undefined => {
  const rule = SPECIAL_RULES[`${biome}-biome` as SpecialRuleId];
  return rule ? { text: rule.description, title: rule.name } : undefined;
};
