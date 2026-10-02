import type {
  AggressionLevel,
  CampaignChapterContent,
  CampaignCondition,
  CampaignQuestUnlockRule,
  ChapterInstruction,
  ExpansionId,
} from '../domain/types';
import campaignLore from './data/campaign-lore.json';

const unlock = (quest: number, conditions: Omit<CampaignQuestUnlockRule, 'questId'> = {}): CampaignQuestUnlockRule => ({
  ...conditions,
  questId: `quest-${String(quest).padStart(3, '0')}`,
});

const step = (
  text: string,
  options: {
    condition?: CampaignCondition;
    expansionId?: ExpansionId;
    expires?: number[];
    resources?: ChapterInstruction['resources'];
    skillPoints?: number;
    unlocks?: number[];
  } = {},
): ChapterInstruction => ({
  condition: options.condition ?? {},
  expansionId: options.expansionId ?? null,
  expires: options.expires ?? [],
  resources: options.resources ?? {},
  skillPoints: options.skillPoints ?? 0,
  text,
  unlocks: options.unlocks ?? [],
});

/** Joins the lines of one narrative paragraph into a single string. */
const prose = (...lines: string[]): string => lines.join(' ');

/** Chapter summaries and reward instructions transcribed from the campaign book. */
export const chapters: CampaignChapterContent[] = [
  {
    forgeLevel: 1,
    forgeUnlocks: ['fire'],
    herbalistLevel: 1,
    instructions: [
      step('Add Vyraxen to your trophies.'),
      step('Set the Forge level to 1 and unlock the Fire Forge card.'),
      step('Each player gains 2× Fire, 1× Bones, 1× Scales and 2× Blood.', {
        resources: { blood: 2, bones: 1, fire: 2, scales: 1 },
      }),
      step('Set the Herbalist level to 1 and unlock the Herbalist card.'),
      step('Each player gains 1× Albalacea, 1× Anthemon, 1× Mellis and 2× Nillea.', {
        resources: { albalacea: 1, anthemon: 1, mellis: 1, nillea: 2 },
      }),
      step('Unlock Quest 1 and Quest 2.', { unlocks: [1, 2] }),
      step('Each player upgrades their card pool.', { skillPoints: 1 }),
      step('Unlock Quest 36.', { expansionId: 'feather', unlocks: [36] }),
    ],
    number: 1,
    paragraphs: [
      prose(
        'The airship plows the sky as it takes you back to Alborea, humanity’s stronghold on Thyrea. Below you, the natural world is still reeling from the thunderous rumbling of Woltyar. Far away, on the horizon, you see the ocean: the only green and verdant land that still welcomes life, and you have always wondered what its secret was.',
        'The airship lands at the port just outside the city walls. Still covered in ash, you disembark with the precious cargo on your shoulders and make your way across the garrison courtyard. When you drop the Vyraxen carcass with a thud, seekers laden with parchment scrolls widen their eyes in astonishment, and a group of hunters stops training to look in your direction.',
      ),
      prose(
        '“No trace of the expedition, Commander,” Thoreg hastens to explain, “…the monster caught our scent and attacked us immediately after the eruption.”',
        'Reja nods, then bends down and rests her hand on the Vyraxen’s face, staring at it with a gloomy expression. You realize that your squad was not the only expedition that has been attacked recently. “Summon the Keeper. His presence is requested at the Council meeting tonight,” she orders a cadet. Then she turns toward you: “The Council will meet later today, at sunset. You have earned the right to attend.” She looks up at the plumes of smoke billowing out of the forge. “But first, come with me. There’s something I want to show you.”',
      ),
      prose(
        'At the forge, Rarog the blacksmith hammers on a great anvil placed in the center of the room, as if it were an altar used to conduct sacred rituals. “That’s precisely why I’m here. We need armor and claws, exactly like a monster’s…” the Commander replies. “Reinforce our own weapons with the skin of those creatures. Just like the first hunters had thought about doing?” he says in a low voice. “The beasts’ armor will make our weapons very heavy… Will the hunters be able to handle them?”',
        '“They will find the strength,” she replies without hesitation. The blacksmith forces his mouth into a sneering grin and begins polishing a blade: “When you lot at Central Command have finished discussing things, bring it here to me. You’ll be able to fight the next one you encounter on equal terms.”',
      ),
      prose(
        'While waiting for the sun to set, you visit Thessa at the Green Palace, home of the herbalists, and hand her the booty recovered in the Crimson Forest. “The Commander has asked me to help the Hunters’ Corps, so we set up a laboratory to distill potions and mixtures for hunting,” she tells you, leading you through the great hall wrapped in vines. The botanical knowledge handed down by your ancestors is still useful today to help you understand the secrets of nature and to allow you to access its power, even if only a small part. “Recently, we have been studying new mixtures. Here is a list of herbs that could be useful to me!”',
      ),
      prose(
        'At sunset the Council meets in a great tent lined with tapestries of the bravest hunters’ deeds. “Settlements under attack, groups of people missing, monsters pushing beyond the limits of their territories… and lastly, today, the awakening of Woltyar, and a Vyraxen attack,” Reja begins. At that moment, the tapestry behind her seat is pulled aside, and a tall man emerges in a long, golden-green robe: the Keeper, Noatar.',
        '“Thyrea is alive… and she seems to have a powerful connection with her creatures. In the blood of the monsters, there is a trace of a power that, like the threads in the tapestry behind me, weaves its way through the lives, events, and most ancient places on the island. Through their blood, I can access this tapestry of life and retrace the threads that lead me to relive the memories of the living beings, places, and events of the past.”',
        '“From dawn tomorrow, the Keeper will become a member of this Council. I want all combat-ready squads to go out on missions: there will be new quests posted every day on the large quest board in the yard. The behaviour of these monsters is getting increasingly unpredictable. Forget what you know about them because, out there, nothing is like we remember it anymore.”',
      ),
    ],
    summary:
      'You return to Alborea with a Vyraxen carcass. Commander Reja shows you the Forge and the Green Palace, then the Council meets at sunset and the Keeper, Noatar, joins its ranks. From dawn, new quests are posted on the board in the yard.',
    title: 'Return to Alborea',
    trophyIds: ['vyraxen'],
  },
  {
    instructions: [
      step('Unlock Quest 3.', { unlocks: [3] }),
      step('Unlock Quest 41.', { expansionId: 'venom', unlocks: [41] }),
      step('Unlock Quest 46.', { expansionId: 'ice', unlocks: [46] }),
    ],
    number: 2,
    paragraphs: [
      prose(
        'Commander Reja strides across the courtyard overlooked by the Hunters’ quarters. She can’t sleep. There are too many images and too many voices crowding her dreams. In the darkness and silence of the hour before dawn, she tightens the straps on her artificial forearm at the elbow: a device made of golden Arkeum, forged by the blacksmith to allow her to continue using her spear, and starts repeating the positions: lunge, dodge, thrust, parry… You and some of the other hunters join her, waiting for her dawn speech.',
      ),
      prose(
        '“Something has changed out there. All the teams that have returned have reported some weird behaviour from the monsters. They are hunting far outside their usual territory and they have been seen attacking and killing each other, not out of hunger, but to assert dominance,” says the Commander, walking among you. “Exploring the wilderness has become much more dangerous. They sniff us out as if they were searching for something…” In a moment of silence, you wonder who are the hunters and who is the prey.',
      ),
      prose(
        '“Years ago, our teachers, Alborea’s first hunters, studied these creatures. They watched how they fought in order to emulate their movements. They realized that their thick skin was an impenetrable shield and their claws were merciless weapons.” Reja pauses to look at the new weapons and armor on the rack, then continues: “Today, I’m asking you all to don that leather and take up those claws. Your appearance, your actions: out there you’ll be beasts, and just as brutal as they are. You will be crushed by the weight of your armor, but you will do it to protect what makes you human.”',
        '“Remember that a monster has the strength to survive alone on Thyrea. We do not, we need each other. And that is how we shall survive.”',
      ),
      prose(
        'As everyone disperses to start training, you can hear the exuberant young recruits speaking aloud. “But that hand? What happened to her?” one of them asks. “They say it happened years ago. She was the young leader of her own hunting squad. One member of her group ended up with the gaping jaws of a monster bearing down on him, but she threw herself in harm’s way to protect him. She forced her spear between that creature’s teeth with such strength that it went straight through its skull. But the monster’s teeth sank deep into her arm and the wound wouldn’t heal, so they had to amputate,” another replies. “After a while, she became the Commander of the Council. There is something about her that inspires you to be better.”',
        'You leave behind your companions, who are busy with training, and go to the quest board where the new quests have already been posted. Inspired by the Commander, you want to test your mettle as soon as possible.',
      ),
    ],
    summary:
      'Before dawn, Commander Reja explains the monsters’ new aggression and the need to adapt. She recounts how she lost her arm, then the hunters train and take on new quests.',
    title: 'The Commander’s Dawn',
  },
  {
    instructions: [
      step('Each player upgrades their card pool.', { skillPoints: 1 }),
      step('Quest 2 expires.', { expansionId: 'nightmare', expires: [2] }),
      step('Quest 36 expires.', { expansionId: 'feather', expires: [36] }),
    ],
    number: 3,
    paragraphs: [
      prose(
        '“Did you bring the plants? Hurry, this way!” Thessa urges you as she runs along the corridors toward the Keeper’s quarters. The Keeper is stretched out on the warm wooden floor, still as a statue, his eyes wide open and rolled back in his head. “Something’s wrong. He’s stuck in the vision; he can’t come back…” Thessa stammers as she grabs the Tarmaret root you brought her and mixes it into her brew. She holds the Keeper’s torso up and places the cup to his lips. “Hopefully this will help,” she explains, in an effort to convince both you and herself that this will work.',
      ),
      prose(
        'You hold your breath until the Keeper jolts back to consciousness and starts talking excitedly. “There was a woman whose body was made of crystal… I have to write it down before the memory slips away,” he says, panting for breath. He grabs a large sheet of cotton paper, draws a woman holding a sceptre topped with a gem, then all around her body, like a frame, he anxiously writes: “The Awakening of the Beast will once again devastate life on Thyrea. Power will flow from the broken lands, and mankind will follow that same path, and they, too, will be drawn into the jaws of the monster.”',
      ),
      prose(
        'On a second sheet of paper, he sketches the luminous lines on the woman’s cheeks and all around her eyes. “Then, she told me of an ancient prophecy and a snake, but it was at that moment that everything became hazy and I could no longer remember.” He looks at you and forces a reassuring smile. “It’s like when we try to remember someone and can’t put together a clear picture. We remember some details, others are lost, but we know that that person existed, even if our memory is confused.”',
        'You make sure he is okay and then take your leave to let him rest. Lost in thought, you make your way across the courtyard, which is by now crowded with other squads, and elbow your way through to check the quest board. Each slip of paper nailed there seems like a piece in a still unfinished mosaic.',
      ),
    ],
    summary:
      'Thessa brings the hunters to the Keeper, trapped in a vision. Revived by a potion, he relays a cryptic prophecy about the awakening of a Beast and mentions a snake.',
    title: 'The Keeper’s Vision',
  },
  {
    forgeLevel: 2,
    herbalistLevel: 2,
    instructions: [
      step('Upgrade the Forge and Herbalist to level 2.'),
      step('Unlock Quest 11.', { unlocks: [11] }),
      step('Unless you have “The Goldarks People”, unlock Quest 7. Otherwise, unlock Quest 8.'),
      step('Unless you have “Calm the Sea”, unlock Quest 9.'),
      step('Quests 1, 2, 3, 4 and 5 expire.', { expires: [1, 2, 3, 4, 5] }),
      step('Quest 31 expires.', { expansionId: 'nightmare', expires: [31] }),
      step('If you have “The Poison of the Pazis”, unlock Reward card 25.', { expansionId: 'feather' }),
      step('Quest 41 expires.', { expansionId: 'venom', expires: [41] }),
      step('Quest 46 expires.', { expansionId: 'ice', expires: [46] }),
    ],
    number: 4,
    paragraphs: [
      prose(
        'In the tent, the air is permeated with fragrant fumes spiraling out of the braziers. The hunting squads wait on the mats, summoned to hear Nael, the Prime Seeker’s report. As the Commander had predicted, he survived and returned to Alborea after his expedition had been given up for lost in the valleys of Woltyar. “Apparently, they’ve found the ruins of ancient civilizations,” you hear the hunters discussing among themselves. “So, it’s true then: Thyrea was inhabited in the past!”',
      ),
      prose(
        '“We believe that ancient civilizations had existed and lived here on Thyrea for over a thousand years. They died out many centuries before our arrival and the foundation of Alborea. We have identified three main peoples, which originated from the subdivision of a single older clan,” he explains. In the north, the Zarka controlled the Arkeum deposits, from which they made statues, jewellery, and even musical instruments, whose contemplation was part of a course of study in pursuit of knowledge and power. To the west, the Tecli left their ruins between the Sunset Plains and the Crystal Plateau. In the southern lands lived the Krismari, who worshipped the stars, the sky, and the sea, and whose knowledge on the subject, as far as we can understand, far exceeded our own.',
      ),
      prose(
        '“Were all these clans united under a single leader? Or do you think they were at war with each other?” a hunter asks. “We found no traces of wars or battles between the clans. In fact, we are inclined to think that the cultures intermixed and were related in many ways,” Nael replies. “It seems that they used art to express their knowledge of and closeness with nature. Indeed, nature is a recurring theme throughout all their artworks, sometimes shown as terrible and powerful, at other times as being in perfect harmony with humanity.”',
      ),
      prose(
        '“But there’s more… all these groups painted and sculpted three creatures that we found intriguing: three great Dragons.” Nael pauses, observing the restless and fascinated gazes of the hunters. “The first is the Ancient, often portrayed by the Tecli, who painted it with gold and green scales, entwined with ancient trees, its body decorated with countless faces with human or beastly features. The second, the Celestial, is represented by the Krismari as a large, feathered dragon, depicted in the waves of the sea, but often also in the sky, surrounded by points of light and constellations. The third Dragon, the Indomitable, is the mightiest of the three, depicted as black in color and accompanied by lightning and ferocious tempests, as depicted by the Zarka civilization.”',
        '“We do not know whether these Dragons were gods to them or if, on the other hand, they represented creatures that actually existed. Perhaps it was simply a way for each of the populations to visually represent the nature of Thyrea itself, a force that mankind worshipped, feared, or perhaps hoped to control by giving it form.”',
      ),
      prose(
        '“Nael, what have you found regarding the end of these civilisations? Do we know what happened to them?” the Commander asks pressingly, in chorus with others. “Unfortunately, not: we simply don’t know. The end of these cultures is a mystery… For now, we can do nothing more than speculate,” Nael replies. A heavy silence has fallen in the tent, broken only by the howling of the wind blowing incessantly beyond the city walls.',
      ),
    ],
    questUnlocks: [
      unlock(7, { noAchievements: ['The Goldarks People'] }),
      unlock(8, { allAchievements: ['The Goldarks People'] }),
      unlock(9, { noAchievements: ['Calm the Sea'] }),
    ],
    rewardCardUnlocks: [{ allAchievements: ['The Poison of the Pazis'], card: 25, copies: 2, expansionId: 'feather' }],
    summary:
      'Prime Seeker Nael returns with findings about three ancient cultures: the Zarka, the Tecli and the Krismari, and their depictions of three Dragons: the Ancient, the Celestial and the Indomitable.',
    title: 'Three Dragons',
  },
  {
    instructions: [
      step('Each player upgrades their card pool.', { skillPoints: 1 }),
      step('Unless you have “Secrets from the Past”, unlock Quest 12.'),
      step('Unless you have “Arkeum Dust”, unlock Quest 13.'),
      step('Unless you have “The Jungle of Muara”, unlock Quest 37. Otherwise, unlock Quest 38.', {
        expansionId: 'feather',
      }),
      step('Unless you have “The Fallen Star”, unlock Quest 15. Otherwise, unlock Quest 47.', { expansionId: 'ice' }),
    ],
    number: 5,
    paragraphs: [
      prose(
        'Just like every year since the foundation of the city, the Ceremony of Light is taking place in Alborea, but this one seems different. The lights that have been lit in the city are not enough to ward off the concerns preoccupying the entire community. A large bonfire burns small, wicked-looking effigies that symbolise future dangers that need to be banished, and on every street corner countless lanterns have been lit from its flames: lanterns carved from stone and embedded in the walls of the houses when the city was built by the founders of Alborea.',
      ),
      prose(
        'In Thessa’s laboratory at the Green Palace, she and Nael are busy studying ancient scrolls. “This very night, the Keeper had a vision. From the shadows, a figure appeared with a humped back covered in feathers, its face had a long, pointed beak and it had sharp, black claws. The creature, however, then shakes itself, removes its feathered cloak and beaked bone mask, and reveals itself to be human. She picks up a lantern from the dark ground and holds it up high in front of her: at her touch, the lantern is filled with dazzling light and the vision ends,” Nael explains. “So, we are wondering where the symbol of our traditions comes from.”',
      ),
      prose(
        '“Here, look. This is the diary of a builder. He says that they drew the map of the city they were going to build and that they marked out specific points where they planned to build the stone lanterns. Apparently, they correspond to the positions of the stars they had followed to fly to Thyrea… When it’s all lit up, the city itself becomes a giant map of the starry sky!” says Nael in amazement.',
        '“But does it say anything about why they chose the lantern as their symbol?” asks Thessa. “It continues, here… It says that the fleet of airships that had flown from the Outer Islands to Thyrea had hung lanterns on the sides of the ships, which were always kept alight to avoid getting lost and make sure the fleet stayed together during long crossings,” Nael reads.',
        'He and Thessa continue leafing through and reading the ancient manuscripts for some time but find nothing that could connect the woman with the bone mask who appeared in the Keeper’s visions to their past.',
      ),
    ],
    questUnlocks: [
      unlock(12, { noAchievements: ['Secrets from the Past'] }),
      unlock(13, { noAchievements: ['Arkeum Dust'] }),
      unlock(15, { noAchievements: ['The Fallen Star'] }),
      unlock(37, { noAchievements: ['The Jungle of Muara'] }),
      unlock(38, { allAchievements: ['The Jungle of Muara'] }),
      unlock(47, { allAchievements: ['The Fallen Star'] }),
    ],
    summary:
      'The Ceremony of Light takes place in Alborea. Thessa and Nael research its origins and its link to the Keeper’s vision of a masked figure lighting a lantern.',
    title: 'The Ceremony of Light',
  },
  {
    instructions: [
      step('Unlock Quest 22.', { unlocks: [22] }),
      step('Quest 10 expires.', { expires: [10] }),
      step('Unless you have “The Blood of the Serpent”, unlock Quest 42. Otherwise, unlock Quest 43.', {
        expansionId: 'venom',
      }),
    ],
    number: 6,
    paragraphs: [
      prose(
        'Tonight, the Keeper walks alone through the streets of Alborea. The city is shrouded in a surreal silence: the sentries patrolling the walls tread lightly, the tavern has already closed, and the still waters of the sea fill the inlets of the harbour. In the night sky, an unnaturally large, silvery moon has risen. The Keeper reaches the town square, where grows a thousand-year-old tree with light-colored wood that shines like a pearl under the moonlight. He sits among its thick roots and looks up. He watches the halo of light around the moon begin to pulsate and expand over the inky blue of the night sky. His eyes fill with that light… and he begins to travel.',
      ),
      prose(
        'In his vision, the Keeper finds a memory of the Celestial Dragon as it flies through the sapphire skies of the north. In the same stars, the Dragon had read the arrival of this very night: a raging beast at the center of a cyclone of lightning advancing from the peaks of the Three Spears, dragging the storm with it. The beast in the storm attacks the Celestial. During the battle, they fly all over Thyrea. Their blood falls on the white snow, their scales fall into the mouth of Woltyar, and the feathers of the Celestial fall on the jungle until, finally, their wings cast dark shadows over the waters of the sea. In every burst of light, in every fiery breath, the Celestial hears the voice of the beast, and, in it, its desire for power.',
      ),
      prose(
        'As they fly over the Teal Sea, the beast of thunder has the upper hand: it plunges its snout into the Celestial’s chest and sinks its teeth into the other Dragon’s heart. It rips it from its nest of veins and arteries, and crushes it between its fangs to squeeze out its power-soaked blood. The Celestial plummets toward the sea, which opens wide to receive the body of its Dragon in the waves. The sea floor splits apart, creating a fault line, and the waters begin to churn and swirl ceaselessly.',
      ),
      prose(
        'The Indomitable Dragon roars triumphantly, its storm thickens, and through the dense clouds the roar of its voice echoes throughout Thyrea. At its call, the lights in the aurora borealis turn red and flutter like tongues of fire. In the depths of space, the oldest stars dim and recede, leaving only a cold, empty void in their place. That night lasted so long that the sun did not rise for days, eclipsed by the large, motionless moon. There was nothing but the red light of the aurora borealis and the stars falling from the sky.',
      ),
    ],
    questUnlocks: [
      unlock(42, { noAchievements: ['The Blood of the Serpent'] }),
      unlock(43, { allAchievements: ['The Blood of the Serpent'] }),
    ],
    summary:
      'Under an unusually large moon, the Keeper sees the Celestial Dragon battle a storm beast and fall into the sea. The aurora turns red and the storm intensifies.',
    title: 'The Red Aurora',
  },
  {
    instructions: [
      step('Make a decision as a group about the training camp at Woltyar.'),
      step('Each player upgrades their card pool.', { skillPoints: 1 }),
      step('Unless you have “The Herbarium”, unlock Quest 24.'),
      step('Quests 7, 9 and 11 expire.', { expires: [7, 9, 11] }),
      step('Unless you have “The Tome of Creatures”, unlock Quest 33.', { expansionId: 'nightmare' }),
    ],
    number: 7,
    paragraphs: [
      prose(
        'A lively fire crackles in the brazier in the center of the common room where the returning hunters and those about to leave on a mission cross paths to compare notes and swap stories. “Yes, when they woke up this morning they had red pupils, like the fire of a Vyraxen, and they were crying tears of blood from their eyes,” says Thoreg. “They said they all had the same nightmare,” adds Mirah, busy carving wood for her arrows. “It was dark and they were climbing a mountain. During the ascent, they were attacked by a number of increasingly angry monsters. They killed them, one after the next, and took their strength to keep climbing… but none of them can remember what they found once they reached the top.”',
      ),
      prose(
        '“It’s the Awakening; the beasts are no longer attacking out of mere hunger… I’m starting to think that all this is not just affecting the monsters,” says Thoreg. “It’s affecting us, too,” Ljonar finishes his comrade’s sentence, “it compels us to fight, to be more aggressive, more ferocious.”',
        '“It’s not just aggression: I’ve never felt so strong… with each passing day, my hammer seems lighter. I feel faster, more alert, and sometimes I even feel like I’m learning from the movements of those monsters,” Thoreg explains. “We’re also pretending to look like them,” Mirah thinks wryly, turning over her helmet in the shape of a feral beastly face in her hands. “This is what has allowed us to survive. How could we face these monsters if we didn’t have our weapons, and if we hadn’t found this strength, which increases every day?” Ljonar asks everyone. In answer to his question, the last tongue of fire in the brazier goes out.',
      ),
      prose(
        'At that moment, the door is thrown wide open and the Commander bursts into the room. “During their return from the Woltyar region, some squads have reported that every day spent in the shadow of the volcano has made them stronger and more resilient,” Reja begins, “as if they were able to absorb the power and strength that is awakening along with the volcano. And at this very moment, humanity desperately needs this strength.” The eyes of the hunters meet: everyone seems to have shared the same experience, and no one appears to doubt the Commander’s theory. “For all who wish to join, tomorrow, a group will depart with the task of setting up a new training camp near the foothills of the volcano,” Reja concludes.',
        '“How much more blood will be shed in order for us to survive?” Ljonar asks under his breath. “Everything here challenges us to endure…” says Dareon, ready to grin and bear whatever fate has in store for the hunters of Thyrea. “I feel alive when I fight to survive.”',
      ),
    ],
    questUnlocks: [
      unlock(24, { noAchievements: ['The Herbarium'] }),
      unlock(33, { noAchievements: ['The Tome of Creatures'] }),
    ],
    summary:
      'The hunters share nightmares and a growing, unnatural strength. Commander Reja confirms reports from Woltyar and announces a new training camp on its slopes.',
    title: 'Shared Nightmares',
  },
  {
    forgeLevel: 3,
    herbalistLevel: 3,
    instructions: [
      step('Upgrade the Forge and Herbalist to level 3.'),
      step('If you have “The Voice of Woltyar”, each player upgrades their card pool.', {
        condition: { allAchievements: ['The Voice of Woltyar'] },
        skillPoints: 1,
      }),
      step('Unlock Quest 25.', { unlocks: [25] }),
      step('Quest 37 expires.', { expansionId: 'feather', expires: [37] }),
      step('If you have “The Herbarium”, unlock Quest 44.', { expansionId: 'venom' }),
      step('Quest 47 expires.', { expansionId: 'ice', expires: [47] }),
    ],
    number: 8,
    paragraphs: [
      prose(
        'Leaning over the large table, Nael fills roll after roll of transcriptions taken from an ancient codex he found sealed in a tomb: a collection of stories the Krismari, Tecli, and Zarka peoples had handed down over the centuries. “In these pages, it is said to have been a musical language… it seems to describe a melody, rather than a thought formulated in words. Few wise men were able to read or write it. The translation given here in the ancient common language is but a fraction of the true meaning of these symbols.” Then he begins reading: The Myth of the Gith.',
      ),
      prose(
        '“Originally, there were the Primordials. Their Voice was as dense as the earth, as colorful as the sky, and as deep as the sea. The first men feared them and gazed upon them in awe. Wherever there were Primordials, the natural world flourished, trees were laden with fruit, and living beings were filled with emotion. Men lived in harmony thanks to the gifts bestowed by those mysterious creatures: they received water when the rivers were dry, and they received light when the nights were too long and cold.',
        'One day, however, a man set off on a journey: he felt as if something was missing. On his way, he encountered Primordials that were as tall as mountains, with their backs covered in forests. One, in particular, fascinated him: it had two large round eyes shining like lights plucked from the firmament, ivory horns, and a long moustache cascading from the sides of its fanged mouth. The man asked it for help to fill the void he felt. Intrigued, the creature stared at him with its starry eyes and stretched out a claw to meet his hand.',
        'At that moment, the man heard the melody running through all of nature. The song of the Primordials was of unparalleled beauty: every note and every silence had a profound meaning. The man then looked up at the sky, and in the blue night, he saw a large luminous circle. He gazed deeper between the stars until he realised the circle was actually the body of a creature he had never seen before: an enormous dragon with a serpentine body that had looped back on itself to bite its own tail.',
        'The man stood staring at the sky for a long time after the image had melted away, wondering about the meaning of what he had seen. In his quest for answers, which he would never give up on, the man who had set out on that journey filled the emptiness he had felt.”',
      ),
      prose(
        '“The Primordials are always described differently. I wonder if they are not a figment of the writers’ imaginations. They talk about them as if there were no boundaries between them and nature. Like creatures that are perfectly blended with the energy of Thyrea,” Nael reflects aloud after he finishes reading the text. “Who knows if one day we, too, will be able to hear the notes of that great melody running through Thyrea,” he says, as he puts out the lantern resting on the table.',
      ),
    ],
    questUnlocks: [unlock(44, { allAchievements: ['The Herbarium'] })],
    summary:
      'Nael translates the Myth of the Gith: the Primordials, deeply bound to nature, bestowed gifts upon humanity, and a self-devouring dragon appeared in the sky.',
    title: 'The Myth of the Gith',
  },
  {
    instructions: [
      step('Each player upgrades their card pool.', { skillPoints: 1 }),
      step('Quests 8, 15 and 20 expire.', { expires: [8, 15, 20] }),
      step('Unless you have “The Dragon Star”, unlock Quest 28.'),
      step('Quest 48 expires. Unless you have both “The Fallen Star” and “The Dragon Star”, unlock Quest 49.', {
        expansionId: 'ice',
        expires: [48],
      }),
    ],
    number: 9,
    paragraphs: [
      prose(
        'I still remember when humankind was fascinated and inspired by our singing, and soon their Voices merged into the Echo. In each Voice, we can hear a trace of their desires, a distinct motif that contributes to the immense symphony. One chorus of Voices, in particular, which initially appeared as a slight dissonance in the Echo, is getting more incessant every day. It vibrates powerfully within me, grows in intensity, and enriches the melody by adding depth and contrast. It brings with it a lust for power that overwhelms me, from which I can no longer separate myself.',
      ),
      prose(
        'From up here, on the mountaintop, I feel like I can see all of Thyrea. I am alone, at the summit. What if that chorus is telling the truth? What if this was the challenge that gives meaning to who we are? The storm rages in and above me. The sky releases the same desire that gushes forth from my soul. In the black clouds that enshroud the mountain, the conflict that stirs in my heart takes shape.',
        'I feel a sensation that has lain dormant for centuries awaken. What use is the force of the storm if not to increase my power? What do I need the breath of fire or the power of thunder for? What if I were the snake? The lightning pierces the night, and it seems to me that the clouds take the shape of lots of dragons with ravenous mouths. Why hide it? This is what I want. “The power that was divided will be united once again,” I think, and my roar mingles with the thunder of the tempest.',
        'Everything goes dark. I can no longer feel anything.',
      ),
      prose(
        '“Quickly, bring the herbs and a cold compress!” exclaims the Commander, who has been holding the man’s hand the entire time. “Noatar’s power is increasing every day,” she explains. “These long, intense visions are getting more and more frequent… Sometimes I’m almost afraid he won’t be able to return from them.”',
        'Finally, the Keeper awakens, moving with a jerk. He remains silent, bewildered by what he has just experienced. He gestures for the infusion prepared by Thessa, then finally finds the strength to speak, addressing those present with an almost unrecognisable voice, as if it took some time for him to return to his true self. “I was in the memories of the Indomitable Dragon, on top of the Three Spears…” he takes a breath, then continues: “It was mankind’s lust for power that started everything.”',
      ),
    ],
    questUnlocks: [
      unlock(28, { noAchievements: ['The Dragon Star'] }),
      unlock(49, { unlessAllAchievements: ['The Fallen Star', 'The Dragon Star'] }),
    ],
    summary:
      'A voice within the Echo speaks of a lust for power mirrored by the storm. The Keeper awakens from a vision and reveals humanity’s part in what is coming.',
    title: 'The Voice in the Echo',
  },
  {
    instructions: [
      step('If you have “The Voice of Woltyar”, each player upgrades their card pool.', {
        condition: { allAchievements: ['The Voice of Woltyar'] },
        skillPoints: 1,
      }),
      step('Unlock Quest 30 unless you have “The Three Spears” or “The Echo of the Waterfall”.'),
      step('Unless you have “The Three Spears”, unlock Quest 29.'),
      step('Quest 13 expires.', { expires: [13] }),
      step('Unless you have “The Echo of the Waterfall”, unlock Quest 40.', { expansionId: 'feather' }),
      step('Unless you have both “A Debt to Be Paid” and “The Herbarium”, unlock Quest 35.', {
        expansionId: 'nightmare',
      }),
    ],
    number: 10,
    paragraphs: [
      prose(
        'The Keeper reaches the ancient tree in the center of the square and flops to the ground. “How much more blood must flow,” he murmurs. The gnarled roots press against his flesh, but he is already far away: his white eyes are already filled with a new vision.',
      ),
      prose(
        'High in the sky, the Ancient Dragon grits its fangs to defend itself from the attacks of the enormous black Dragon, which bears down on it like a furious storm. Each strike of its claws hits like lightning and shatters the green scales of the Ancient. Every roar rumbles like thunder. The desire for power, which motivates the Dragon of the storm, explodes and spreads through the Echo reverberating in the sky over all of Thyrea.',
        'The sunset is invaded by the darkness of the night when the attacker takes hold of the Ancient in a fatal grip, sinks its fangs into its chest, and tears out its heart, thick with Thyrea’s memories. The body, now drained of the Ancient’s blood and power, falls to the ground. The earth trembles at the sight of her dragon and opens wide at the moment of impact; the trees dry up and sink underground with it.',
      ),
      prose(
        'Up there in the sky, the Indomitable Dragon flaps its wings and hovers on the spot. Its luminous heart beats, lightning flashes around it, and on its scales, stained red with blood, the stars it stole from the sky still shine. Suddenly, its ember-like eyes whiten and go blind. The Dragon bends its head backwards and its muscles stiffen. A moment later, its body swells up, its scales turn silver, and new, sharply pointed horns grow to form a large crown all around its enraged face.',
        'In an explosion of light, the Indomitable is transformed, dies, and is reborn into a new Dragon. Its first roar rumbles triumphantly and echoes in the heart of every creature on Thyrea. Its wings have taken on the color of the sun, which is setting on the last day of human civilisation.',
      ),
    ],
    questUnlocks: [
      unlock(29, { noAchievements: ['The Three Spears'] }),
      unlock(30, { noAchievements: ['The Three Spears', 'The Echo of the Waterfall'] }),
      unlock(35, { unlessAllAchievements: ['A Debt to Be Paid', 'The Herbarium'] }),
      unlock(40, { noAchievements: ['The Echo of the Waterfall'] }),
    ],
    summary:
      'The Keeper witnesses the Indomitable Dragon tear the heart from the Ancient Dragon and be reborn with silver scales and sun-colored wings.',
    title: 'Rebirth of the Indomitable',
  },
  {
    awakenedSetUnlocks: [
      { allAchievements: ['The Bones of the Ancient'], set: 'ancient' },
      { allAchievements: ['The Dragon Star'], set: 'celestial' },
    ],
    instructions: [
      step('Each player upgrades their card pool.', { skillPoints: 1 }),
      step('If you have “The Bones of the Ancient”, unlock all cards with Reward ID S1.'),
      step('If you have “The Dragon Star”, unlock all cards with Reward ID S2.'),
      step('If you have “The Lantern Bearer”, read The Path of the Lantern.', { expansionId: 'feather' }),
      step('If you have “The Lake of the Celestial”, unlock Reward card 38.', { expansionId: 'ice' }),
      step('Prepare The Awakened scenario on the alternative combat board.'),
    ],
    loreQuestions: [
      'What happened to the ancient civilizations?',
      'What is the Voice? Who can hear it?',
      'What was the origin of the Three Dragons?',
      'What are the powers of the Awakened Dragon?',
      'What is the meaning of the Ouroboros, the symbol of the serpent biting its own tail?',
    ],
    number: 11,
    paragraphs: [
      prose(
        'Night has just fallen when the watchmen start sounding the large drums and horns on the walls. The courtyard fills with hurried footsteps. “The storm is approaching!” shout the hunters returning from the northern lands. “All of Thyrea is responding. There are earthquakes in every region, and floods, and everywhere the sky is black with ash from Woltyar!” As you follow the flow of people into the great hall of Central Command, you turn to look back at the horizon before the city gates close again. The towering black clouds of the storm thicken over the entire continent. The edges of the clouds ripple and seem to grab onto the sky like claws, dragging forward the heavy, hazy body of the storm.',
      ),
      prose(
        '“We knew this time would come. Well, here we are, the final hunt.” Reja’s words cut through the silence and general tension in the room. “Many of you already know that the storm is not a natural phenomenon. A gigantic Dragon was sighted a few days ago taking flight from the top of the Three Spears. The storm is moving with the creature, and it is getting bigger and more threatening with each passing day. It brings no wind or rain with it, only darkness and death.”',
        'The Commander nods to Noatar, the Keeper, who continues: “The description we have of this Dragon coincides with my visions: it is the monster that devoured the Celestial and the Ancient in the past… It is the one responsible for bringing about the demise of the ancient civilisations. As the crystal-bodied woman prophesied, this monster is the answer to so many of our questions, the cause of the blind, savage fury that has overtaken Thyrea and all her creatures.”',
      ),
      prose(
        '“But how are we going to tackle a monster like that?” she is bombarded with questions, with increasing desperation in their voices. “What hope is there against a Dragon that size?” The Commander calls everyone to order: “The hunters will not fight alone. We will employ the ballistas, war machines that have been specially built for this battle. They will be positioned here, in the rear. We will draw the Dragon into the center and the ballistas will surround it, so we always have a clear line of fire… They will aim for the heart.” Then she looks up at you: “The best teams will face the Dragon and they will have the task of drawing it out toward the bolts of the ballistas.”',
        '“And what about the storm?” the buzz of worried voices grows. “Leave the storm to me… I’ll take care of it,” replies the Commander with a certainty that leaves you dumbfounded. You see a new spark in her eyes, and you hear some hunters whispering: “Look at her eyes… so, what they say is true. She has changed: like Noatar, she too has discovered the power.”',
      ),
      prose(
        '“That’s all for now. Go, hunters,” says the Commander, “rest well… because we leave at dawn. This will be a long night, before the battle.” Outside, the deafening crash of thunder echoes in the air as the storm warns the world below of its supernatural presence. You listen to the distant roaring of thunderclaps and your thoughts return to those lost, ancient civilisations. Did mankind really face this monster in the past? Has the fate of humanity already been written? With heavy footsteps, you retire to your rooms, in silence and with your head full of questions to be answered.',
      ),
    ],
    rewardCardUnlocks: [{ allAchievements: ['The Lake of the Celestial'], card: 38, expansionId: 'ice', toAll: true }],
    summary:
      'The ancient Dragon is sighted flying from the Three Spears with the storm at its back. The hunters ready the ballistae while the Commander prepares to face the storm.',
    title: 'The Awakened',
  },
];

export const finalBattle = {
  battlefieldObjects: [
    {
      count: 4,
      icon: '/terrain_tokens/ballista_ready.svg',
      id: 'alborean-ballistae',
      name: 'Ballista',
      rule: {
        condition: 'Resolve the Artillery Assault objective card ability.',
        details: [
          'Ballistas represent the weaponry supporting the hunters in their battle against the Awakened.',
          'A ballista has line of sight to the monster if one of its targeted sectors is the front sector.',
          'A loaded ballista has its black side visible; an unloaded ballista has its grey side visible.',
        ],
        effect: 'Each ballista targets the two sectors nearest to its corner of the board.',
        status: 'verified' as const,
        timing: 'At the end of each round',
      },
      sector: 'edges' as const,
    },
  ],
  conclusion:
    'The Dragon falls. As the storm clears, the hunters gather around its still-beating, three-part heart and face one final question: whether humanity should claim its power or end the cycle of violence.',
  conditionalRules: [
    {
      achievement: 'The Spear that Killed the Dragon',
      text: 'Use The Heartpiercer objective card.',
      title: 'The Heartpiercer',
    },
    {
      achievement: 'Ouroboros',
      text: 'Take envelope S3. When the Awakened reaches Stance IV, open it and put its objective card into play.',
      title: 'Envelope S3',
    },
  ],
  endings: {
    dawn: {
      paragraphs: [
        prose(
          'With the killing of the Awakened Beast, a new era began on Thyrea. The island’s monsters abandoned their frenzied instincts, which had been inspired by the Voice of the Dragon. With this lust for violence removed, it was as if they had forgotten their purpose. Some said these once wild monsters wandered alone for a long time through the lands of Thyrea, like simple animals guided by their basic survival instincts. Many creatures were thought to have retreated to the island’s unexplored areas. According to others, they probably left Thyrea forever, or maybe they slowly died out completely.',
        ),
        prose(
          'For humankind, on the other hand, the Age of Harmony had begun. Thyrea finally became a hospitable and welcoming place, just as the Alboreans had always hoped it would be, long ago, when they first arrived on the island. Over time, several cities were founded, nestled in the continent’s lush vegetation, sisters of Alborea. The civilization of humankind grew and developed with respect for nature, its gifts, and its need to maintain balance.',
          'In the past, Thyrea was dominated by the pervasive, violent emotion of the Dragon, but with the beginning of the Age of Harmony, it finally returned to being free, its true self, as it was in the beginning, at the time of the Primordials. Just as it was back then, today the power is an unknowable mystery that belongs to nature alone, and which inspires contemplation and research in man. The hunters abandoned their weapons and armor, now preserved as relics of Alborea’s history. Many of them became the guardians of places that had experienced the violence of hunting in the past.',
        ),
        prose(
          'While the ancients once trained in the Voice of the Dragons, Alboreans today are dedicated to training the human voice. The Dragon’s power was something that could be taken away, and it grew through possession and violence. By contrast, the human voice, that inner strength found in the soul of each of us: grows and multiplies with every experience of giving and sharing. May the hunger for power be laid to rest, and long may the melody of Alborea resonate throughout the lands of Thyrea.',
        ),
      ],
      summary:
        'The Dragon’s power is rejected and destroyed. The frenzy leaves Thyrea, humanity enters an Age of Harmony, and the hunters become guardians of a world rebuilt through cooperation.',
      title: 'The Dawn of Mankind',
    },
    rebirth: {
      paragraphs: [
        prose(
          'The Three Dragons of Alborea, as they were called by their people, were reborn after sharing the power of the Awakened Beast. Noatar, Nael, and Reja welcomed within themselves the deepest emotions of the Dragon bloodline, which had been lost for eons, as well as the powers and ancient forms of the Ancient, the Celestial, and the Indomitable. The rebirth of the Dragons marked the beginning of humankind’s new domination over the lands of Thyrea.',
          'From the beginning, their Voices were full of hope and the will to grow and develop. Their power shaped every aspect of nature on the island, which soon became an ideal place for Alborea and human civilization to thrive and prosper.',
        ),
        prose(
          'In a few years, the entire continent was colonized by the Alborean people, who built cities and magnificent places of worship in honor of the Dragons and the hunters who had conquered the power through their courage. After the demise of the Awakened Beast, the monsters that once lived on Thyrea were influenced and tamed by the Voices of the new Dragons. Some creatures are said to have gone extinct, to have fled the island, or been hunted and killed by humans.',
          'Over time, the Alboreans began to train in the power, inspired by the song of the Three Dragons, just as the ancients had done in the past. Some of them will eventually learn to control fire, others to read the mysteries of the sky or to observe the distant memories of their bloodline in the threads that make up the complex tapestry of the power. But with training alone, no one will ever come close to possessing the power the Dragons hold. Ever since devouring the heart of the Beast, the Three have had to constantly deal with their desire for power. Even in human form, the Dragon is said to have left a profound mark on them, on their spirits and souls. For them, their bestial form is an indelible scar that binds them to a dark past.',
        ),
        prose(
          'Many have wondered what the Dragons have discovered through their power. It is thought that the Three have always hidden from humankind the darkest truths and secrets about the past, the origins of humanity, and the power of the Dragon.',
        ),
      ],
      summary:
        'The Dragon’s heart is claimed. Noatar, Nael, and Reja become the Three Dragons of Alborea, beginning an age of human dominion over Thyrea and its monsters.',
      title: 'The Rebirth of Power',
    },
  },
  icon: '/monsters/The-Awakened.svg',
  introduction:
    'Under a storm-darkened twilight, the hunters and four Alborean ballistas advance on the Dragon. Its luminous heart feeds the tempest while Commander Reja calls the party to turn fear into strength and bring a new dawn.',
  lanternBearer: campaignLore.lanternBearer,
  lore: campaignLore.awakened,
  monsterId: 'the-awakened',
  name: 'The Awakened',
  rules: [
    { text: 'Use the alternative combat board and the Awakened’s extended monster board.', title: 'Combat board' },
    {
      text: 'Place four ballista tokens face up in the corners of the combat board, black side up.',
      title: 'Ballistae',
    },
    { text: 'Place the special Awakening cards in the last two behavior slots.', title: 'Awakening cards' },
    { text: 'Set the storm level to 1.', title: 'Storm level' },
    {
      text: 'Replace two value-1 and one value-2 base attrition cards with the Awakened’s special attrition cards.',
      title: 'Attrition deck',
    },
    {
      text: 'Build the behavior deck from signature cards and the instinct cards matching campaign trophies.',
      title: 'Behavior deck',
    },
    { text: 'Use The Commander’s Voice and Artillery Assault objectives.', title: 'Objectives' },
  ],
  terrain: [
    { count: 1, sector: 'rear' as const, terrainId: 'rock' },
    { count: 1, sector: 'right-flank' as const, terrainId: 'rock' },
    { count: 1, sector: 'left-flank' as const, terrainId: 'rock' },
  ],
};

export const chapterByNumber = (number: number): CampaignChapterContent | undefined =>
  chapters.find((chapter) => chapter.number === number);

export const TOTAL_CHAPTERS = chapters.length;

/** The aggression level the campaign book assigns to each chapter. */
export function campaignAggression(chapter: number): Exclude<AggressionLevel, 0> {
  if (chapter >= 8) return 3;
  if (chapter >= 4) return 2;
  return 1;
}
