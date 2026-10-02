import type { TerrainPlacement } from '../domain/types';

/**
 * Mount Havoc's standalone ascent: three chapters of story, one per level. The prose is the
 * expansion campaign sheet's narrative; the terrain is the chapter's environmental adjustment
 * placed on the drawn scenario's battlefield.
 */
export interface AscentChapter {
  /** Chapter art shown full-bleed on the story screen and the new-game card. */
  art: string;
  number: 1 | 2 | 3;
  /** Narrative paragraphs, in reading order. */
  paragraphs: string[];
  summary: string;
  /** Terrain the chapter adds to every encounter's battlefield. */
  terrain: readonly TerrainPlacement[];
  title: string;
}

export const ASCENT_CHAPTERS: readonly AscentChapter[] = [
  {
    art: '/backgrounds/bg_mount_havoc_1.webp',
    number: 1,
    paragraphs: [
      'I open my eyes. Looming over me, I see a still, gray sky. The immobile sun radiates an eerie pallid light; I cannot feel the warmth in its rays. My hands slide over the sandy ground. I get up. My armor weighs heavy on my shoulders – I feel like I have been wearing it for too long. My comrades around me are still asleep.',
      '“Where am I?”',
      'I am surrounded by an ocean of sand, and my footsteps sink into the desert slopes. All around me, as if carved in the sand, I can see countless depictions of human faces on the dunes. They emerge from the desert like faded images of a distant past. I stare at their eyes and their impassive expressions. I feel I know these faces, but it is as if my memories have lost their meaning. I squeeze the dark sand in my hands. “There is nothing left for me here.”',
      'My comrades, now on their feet, glance at me with an empty look in their eyes and, without saying a word, come over to join me. As we make our way across the desert hills, the faces at our feet get distorted with every step we take on the sand. A strong, blustery wind rises ahead of us, roaring with feral rage. A blink of an eye. A whisper.',
      '“We are not alone.”',
      'A dark shadow approaches, coming towards us. We are ready to fight.',
    ],
    summary: 'You awaken in a desert of carved faces: a dark shadow approaches on the wind.',
    terrain: [{ count: 2, sector: 'front', terrainId: 'sand' }],
    title: 'The Desert of Faces',
  },
  {
    art: '/backgrounds/bg_mount_havoc_2.webp',
    number: 2,
    paragraphs: [
      'A blood-stained sunset tinges the air with a gloomy light. Alone and unmatched, the great mountain looms large in front of us. Its sharp peak soars into the leaden sky. A red storm envelops it that seems to be quivering like the beating of an angry heart. Below the mountain, barren valleys stretch bleakly in every direction, as far as the eye can see.',
      '“I must reach that peak.”',
      'The blood of battle has not yet dried upon our hands, but I am still steeped in that feeling of violence; it flows angrily in my veins.',
      'The climb is steep, but there is no room for fatigue in my heart. I hear the mountain calling me. It speaks an ancestral language, older than the world itself.',
      'Its rocks seem to tighten around us, as if they wanted to swallow us. They are shaped like beastly faces, monstrous figures that seem to emerge from the mountainside, and, with wide-open jaws, launch themselves towards us. I stare at those dazed and deformed looks, their expressions strained in desperate violence.',
      'I clutch the weapons in my hands so hard that they bleed. My blood mixes with the monster’s, and a deep desire begins to boil in my heart.',
      '“I want to reach that peak. And nothing will stop me.” We look up, panting with anger. A path winds its way up through the sharp peaks, its end obscured by darkness. In that same darkness, we feel something moving. Disturbing noises.',
      'Deep, feral breathing.',
      '“It’s coming towards us.”',
      '“It will be on us any second now.”',
      'We are ready to face it.',
    ],
    summary: 'The blood-red mountain calls above barren valleys, and something breathes in the dark.',
    terrain: [{ count: 2, sector: 'front', terrainId: 'rock' }],
    title: 'The Blood Mountain',
  },
  {
    art: '/backgrounds/bg_mount_havoc_3.webp',
    number: 3,
    paragraphs: [
      '“You’ve almost reached the top... Are you sure you want to continue?” a cold, strange voice resonates through the rumbling storm. The tone is flat and emotionless.',
      '“Who said that? Where is this voice coming from?”',
      'I turn around and, as if just awakened from a strange dream, I am gripped by a disturbing sense of vertigo while glancing back at the path I have traveled. The pathway cuts into the steep ridge of the mountainside, like a wound on the back of a monster. Trails of blood and the remains of slain beasts lie on either side to mark our passage.',
      '“How did we get so high up? I don’t remember anything.”',
      'All around me, a white fog has risen from the ground. Inside this pallid haze, the thunderous sounds of the storm are muffled. I grope my way forward. Suddenly, in the haze, I can make out a dark silhouette; a slender figure is sitting on the side of the path. She is wearing a long black robe with a hood covering her face. In front of her, a small lantern emits a feeble light. She raises an arm and gestures towards a high point beyond the fog. “Once you reach the summit of the mountain,” she whispers in a thin voice, “you will not be able to find the path to get back down again.”',
      'A gust of wind sweeps away the mist that surrounds us and reveals the sharp peak of the mountain. Just one final, steep, ascent separates us from the top. My eyes are captivated by its shadowy darkness, which looks so dreadful and so powerful. I turn around again. The hooded figure has vanished, but her lantern lies at the edge of the path. I watch as it emits one last glimmer of light before going out.',
      'The storm rages furiously above me and I am seized by an irrepressible instinct.',
      '“I can’t stop now. I have to get to the top.”',
      'I leap forward like a hungry beast hunting for food. My bulky armor no longer weighs on my shoulders – it seems to have fused with my skin. With every step, I feel an enormous power awakening within me.',
      'I throw myself into the darkness. It envelops me, interrupted only by the flash of violent lightning from the sky. Something moves in the darkness in front of us. A new enemy wants to prevent us from our ascent. We feel it approaching, but no one can stop me now. It has no idea what awaits it. I have never felt so strong. I am ready to annihilate it.',
    ],
    summary: 'A hooded stranger warns there is no way back: you climb into the storm anyway.',
    terrain: [{ count: 2, sector: 'edges', terrainId: 'fog' }],
    title: 'The Summit',
  },
];

/** Read on the victory screen after chapter 3 is cleared. */
export const ASCENT_EPILOGUE: readonly string[] = [
  'At the mountain peak, the storm envelops everything.',
  'I hear the echoes of distant roars, the dull cracking of broken bones, the violent sound of hearts being ripped out of chests and devoured.',
  'I advance alone, in the dark. My footsteps are getting heavier and heavier. I can no longer hear any sound or feel any contact with the ground. My body is getting more and more powerful, but I no longer recognize its movements or its swollen muscles. My lungs swell, but there is no more air for them to breathe. I feel like I’m being suffocated; I cry out but cannot hear any sound. I feel myself falling into the depths of a shapeless, infinite darkness, captured by the inky obscurity that unites everything and devours everything...',
  'Suddenly, I open my eyes wide. In my hand, the dagger is ready to attack. I am trembling with fear. My swollen muscles seem to fizz with power and an immense rage runs through me. I get up and stomp forward with heavy, violent strides. I feel that at this very moment, I could face the fiercest monsters in Thyrea.',
  'I stop. Breath. Light floods my room. I can feel the air in my lungs again and feeling returns to my body. “That nightmare again.”',
  'I drop the dagger. I’m back, I’m myself again. I walk across the room to a large mirror. I look at myself. My body is still trembling, but I’m alive. I look up and see my face reflected in the glass. Tears of blood surround my eyes, flowing painfully as if from a wound in my very soul.',
];

export const ascentChapterByNumber = (number: number): AscentChapter | undefined =>
  ASCENT_CHAPTERS.find((chapter) => chapter.number === number);

/** The new-game card art for the mode. */
export const ASCENT_ART = '/backgrounds/bg_mount_havoc_2.webp';
