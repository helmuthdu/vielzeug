#!/usr/bin/env node
// Extracts structured quest content from docs/campaign_book.md into src/content/data/quests.json.
// The campaign book stays the single source of truth for scenario setup, rewards and expiration
// text; this script only turns it into data the app can filter and render. Re-run with
// `pnpm extract:quests` after editing the book.
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const source = readFileSync(path.join(root, 'docs/campaign_book.md'), 'utf8');
const outFile = path.join(root, 'src/content/data/quests.json');

const EXPANSION_HEADINGS = {
  'Feather Expansion': 'feather',
  'Ice Expansion': 'ice',
  'Nightmare Expansion': 'nightmare',
  'Venom Expansion': 'venom',
};

const titleCase = (value) =>
  value
    .toLowerCase()
    .replace(/(^|[\s'(-])([a-z])/g, (_, prefix, letter) => prefix + letter.toUpperCase())
    .replace(/\bOf\b|\bThe\b(?!$)|\bIn\b|\bA\b|\bOn\b|\bBy\b|\bUnder\b|\bWith\b|\bBetween\b/g, (word, offset) =>
      offset === 0 ? word : word.toLowerCase(),
    );

const stripImages = (text) => text.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1');
const clean = (text) => stripImages(text).replace(/\*\*/g, '').replace(/_/g, '').trim();

/** Splits the book into `### N. TITLE` quest sections. */
function questSections() {
  const start = source.indexOf('## QUEST SCENARIOS');
  const end = source.indexOf('## QUESTS UNLOCK GUIDE');
  const body = source.slice(start, end);
  const parts = body.split(/\n(?=### \d+\. )/).slice(1);
  return parts.map((part) => {
    const [, number, title] = part.match(/^### (\d+)\. (.+)$/m);
    return { body: part, number: Number(number), title: titleCase(title.trim()) };
  });
}

function subsection(body, index) {
  const match = body.match(new RegExp(`^#### \\d+\\.${index} [A-Z ]+\\n([\\s\\S]*?)(?=^#### |^### |$(?![\\s\\S]))`, 'm'));
  return match ? match[1].trim() : '';
}

function majorSection(title) {
  const heading = `### ${title}`;
  const start = source.indexOf(heading);
  if (start < 0) return '';
  const contentStart = start + heading.length;
  const next = source.indexOf('\n### ', contentStart);
  return source.slice(contentStart, next < 0 ? undefined : next).trim();
}

function narrativeSubsection(body, title) {
  const match = body.match(
    new RegExp(`^#### ${title}\\n([\\s\\S]*?)(?=^#### |^### |$(?![\\s\\S]))`, 'm'),
  );
  return match ? match[1].trim() : '';
}

// The campaign book labels sectors by compass direction; the combat board (and the app's
// Sector type) names them relative to the monster.
const SECTOR_BY_COMPASS = { east: 'right-flank', north: 'rear', south: 'front', west: 'left-flank' };

function parseTerrain(scenario) {
  const terrain = [];
  for (const line of scenario.split('\n')) {
    const match = line.match(/^- \*\*([A-Z-]+)\*\*: (.+)$/);
    if (!match) continue;
    const label = match[1].toLowerCase();
    const sector = SECTOR_BY_COMPASS[label] ?? label;
    if (!(sector === 'edges' || Object.values(SECTOR_BY_COMPASS).includes(sector))) {
      throw new Error(`Unknown sector label "${match[1]}"`);
    }
    if (match[2].trim() === '-') continue;
    for (const token of match[2].split(',')) {
      const entry = token.trim().match(/^(\d+)x (.+)$/);
      if (!entry) continue;
      terrain.push({ count: Number(entry[1]), sector, terrainId: slugTerrain(entry[2]) });
    }
  }
  return terrain;
}

function slugTerrain(name) {
  const normalized = name.trim().toLowerCase().replace(/beathanis/, 'baethanis').replace(/^swap$/, 'swamp');
  return normalized.replace(/\s+/g, '-');
}

function parseSpecialRules(text) {
  return text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => {
      const match = paragraph.match(/^\*\*([^*]+)\*\*:\s*([\s\S]+)$/);
      return match
        ? { text: clean(match[2].replace(/\n/g, ' ')), title: match[1].trim() }
        : { text: clean(paragraph.replace(/\n/g, ' ')), title: 'Setup' };
    });
}

function parseRewards(text) {
  const rewards = [];
  // One flat resource map: the icon id already encodes the category, so the book's
  // Elements/Materials/Plants lines all feed the same grant bundle.
  const resources = {};
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line.startsWith('-')) continue;
    const content = line.replace(/^-\s*/, '');
    const resourceLine = content.match(/^(Elements|Materials|Plants):\s*(.+)$/);
    if (resourceLine) {
      for (const entry of resourceLine[2].matchAll(/(\d+)x !\[[^\]]*\]\([^)]*\/([a-z]+)\.svg\)/g)) {
        const id = entry[2] === 'venon' ? 'venom' : entry[2];
        resources[id] = (resources[id] ?? 0) + Number(entry[1]);
      }
      continue;
    }
    if (/^Each player gains/.test(content)) continue;
    rewards.push(clean(content));
  }
  return { resources, rewards };
}

function parseExpiration(text) {
  if (!text) return { effects: [], text: '' };
  const effects = [];
  const narrative = [];
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line || line === '---') continue;
    if (line.startsWith('-')) {
      const content = clean(line.replace(/^-\s*/, ''));
      if (/^If the current chapter/i.test(content)) narrative.push(content);
      else effects.push(content);
    } else narrative.push(clean(line));
  }
  return { effects, text: narrative.join(' ') };
}

function summary(text) {
  const match = text.match(/^> \*\*Summary\*\*:\s*(.+)$/m);
  return match ? clean(match[1]) : '';
}

function loreParagraphs(text) {
  return text
    .replace(/^> \*\*Summary\*\*:[^\n]*\n?/gm, '')
    .replace(/^\*\*If the current chapter[^\n]*\*\*\s*\n?/gim, '')
    .replace(/^- Read [^\n]*\n?/gm, '')
    .split(/\n\s*\n/)
    .map((paragraph) => clean(paragraph.replace(/\s*\n\s*/g, ' ').replace(/\s+/g, ' ')))
    .filter(Boolean);
}

function lorePassages(text, kind, context = text) {
  const headings = [...text.matchAll(/^##### (?:(\d+\.\d+\.\d+) )?(.+)$/gm)];
  const sectionTexts = [
    { id: kind, text: headings.length ? text.slice(0, headings[0].index) : text, title: titleCase(kind) },
    ...headings.map((heading, index) => ({
      id: heading[1] ?? heading[2].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      text: text.slice(heading.index + heading[0].length, headings[index + 1]?.index ?? text.length),
      title: heading[2].trim(),
    })),
  ];
  const chapterCondition = context.match(
    /^\*\*If the current chapter is either Chapter (\d+) or (\d+), read (?:Variant|Conclusion) A\./m,
  );
  const maxChapter = chapterCondition ? Number(chapterCondition[2]) : undefined;
  const achievementHeading = headings
    .map((heading) => clean(heading[2].replaceAll('"', '')))
    .find((title) => /^IF YOU HAVE /i.test(title));
  const fallbackAchievement = achievementHeading
    ? titleCase(achievementHeading.replace(/^IF YOU HAVE /i, '').trim())
    : undefined;

  return sectionTexts.flatMap(({ id, text: sectionText, title }) => {
    const paragraphs = loreParagraphs(sectionText);
    if (!paragraphs.length) return [];
    const variant = title.match(/\bVARIANT ([AB])\b/i)?.[1]?.toUpperCase();
    const normalizedTitle = clean(title.replaceAll('"', ''));
    const rawAchievement = normalizedTitle.match(/^IF YOU HAVE (.+)$/i)?.[1];
    const achievement = rawAchievement ? titleCase(rawAchievement) : undefined;
    const condition =
      variant && maxChapter !== undefined
        ? variant === 'A'
          ? { maxChapter }
          : { minChapter: maxChapter + 1 }
        : achievement
          ? { achievement }
          : /^OTHERWISE$/i.test(normalizedTitle) && fallbackAchievement
            ? { unlessAchievement: fallbackAchievement }
            : undefined;
    return [
      {
        ...(condition ? { condition } : {}),
        id,
        paragraphs,
        summary: summary(sectionText),
        title: variant ? `Variant ${variant}` : titleCase(clean(title.replaceAll('"', ''))),
        ...(variant ? { variant } : {}),
      },
    ];
  });
}

/** Expansion ownership and unlock/expiry rules come from the Quests Unlock Guide. */
function parseUnlockGuide() {
  const start = source.indexOf('## QUESTS UNLOCK GUIDE');
  const end = source.indexOf('```mermaid', start);
  const guide = source.slice(start, end);
  const result = new Map();
  // Quests listed before the first expansion heading belong to the base game.
  let expansion = 'core';
  for (const rawLine of guide.split('\n')) {
    const line = rawLine.trim();
    const expansionHeading = line.match(/^- \*\*([A-Za-z]+ Expansion)\*\*:/);
    if (expansionHeading) {
      expansion = EXPANSION_HEADINGS[expansionHeading[1]] ?? null;
      continue;
    }
    const quest = line.match(/^- \*\*Quest (\d+)\*\*:\s*(.+)$/);
    if (quest) {
      // The guide spells quest names more reliably than the scenario headings.
      const name = clean(quest[2]).replace(/\.$/, '');
      result.set(Number(quest[1]), { expansionId: expansion, expires: '', name, unlock: '' });
      result.current = Number(quest[1]);
      continue;
    }
    const rule = line.match(/^- (Unlock|Expires): (.+)$/);
    if (rule && result.current) {
      const entry = result.get(result.current);
      entry[rule[1] === 'Unlock' ? 'unlock' : 'expires'] = clean(rule[2]).replace(/\.$/, '');
    }
  }
  return result;
}

const guide = parseUnlockGuide();

// Derived reward fields, extracted once so the runtime loads them as data instead of re-parsing
// the prose (mirrors what src/content/quests.ts previously derived at module load).
const forgeElementByReward = {
  coral: 'coral', crystal: 'crystal', feather: 'feather', fire: 'fire', horn: 'horn',
  ice: 'ice', metal: 'metal', thunder: 'thunder', venom: 'venom',
};
const expansionPrefixes = { 'Feather Expansion': 'feather', 'Ice Expansion': 'ice', 'Nightmare Expansion': 'nightmare', 'Venom Expansion': 'venom' };

const rewardCardsFromRewards = (rewards) => {
  const cards = [];
  for (const line of rewards) {
    const segment = /reward cards?\s+([^.;]+)/i.exec(line)?.[1] ?? '';
    const numbers = [...segment.matchAll(/\d+/g)].map(Number).filter((n) => n >= 1 && n <= 38);
    for (const card of numbers) {
      cards.push(card);
      if (/both copies/i.test(line)) cards.push(card);
    }
  }
  return cards;
};

const forgeUnlocksFromRewards = (rewards) => {
  const next = new Set();
  for (const reward of rewards) {
    const match = reward.match(/\b([A-Za-z]+)\s+Forge\b/i);
    const element = match ? forgeElementByReward[match[1].toLowerCase()] : undefined;
    if (element) next.add(element);
  }
  return [...next];
};

const progressionEffects = (lines, trigger) =>
  lines.flatMap((text) => {
    const achievementText = text.match(/gain (?:the )?achievements?\s+(.+)/i)?.[1] ?? '';
    const achievements = [...achievementText.matchAll(/["\u201c]([^"\u201d]+)["\u201d]/g)].map((match) => match[1]);
    if (!achievements.length) return [];
    const prefix = Object.entries(expansionPrefixes).find(([label]) => text.startsWith(`${label}:`));
    return [
      {
        achievements,
        automatic: !/\b(if|unless|instead|otherwise|already)\b/i.test(text),
        expansionId: prefix?.[1] ?? null,
        text,
        trigger,
      },
    ];
  });

const quests = questSections().map(({ body, number, title }) => {
  const scenario = subsection(body, 1);
  const monster = scenario.match(/Miniature: \*\*([^*]+)\*\*/)?.[1] ?? '';
  const rewardsText = subsection(body, 6);
  const { resources, rewards } = parseRewards(rewardsText);
  const rule = guide.get(number) ?? { expansionId: 'core', expires: '', name: title, unlock: '' };
  const expiration = parseExpiration(subsection(body, 7));
  return {
    conclusion: summary(subsection(body, 4)),
    expansionId: rule.expansionId,
    expires: rule.expires,
    expiration,
    forgeUnlocks: forgeUnlocksFromRewards(rewards),
    id: `quest-${String(number).padStart(3, '0')}`,
    introduction: summary(subsection(body, 3)),
    lore: {
      conclusions: lorePassages(subsection(body, 4), 'conclusion', body),
      introductions: lorePassages(subsection(body, 3), 'introduction'),
      visions: lorePassages(subsection(body, 5), 'vision'),
    },
    monsterId: monster.toLowerCase().replace(/\s+/g, '-'),
    name: rule.name || title,
    number,
    progressionEffects: [
      ...progressionEffects(rewards, 'reward'),
      ...progressionEffects([expiration.text, ...expiration.effects], 'expiration'),
    ],
    rewardCards: rewardCardsFromRewards(rewards),
    rewardResources: resources,
    rewards,
    specialRules: parseSpecialRules(subsection(body, 2)),
    terrain: parseTerrain(scenario),
    unlock: rule.unlock,
    vision: summary(subsection(body, 5)),
  };
});

writeFileSync(outFile, `${JSON.stringify(quests, null, 2)}\n`);
console.log(`[extract-quests] Wrote ${quests.length} quests to ${path.relative(root, outFile)}`);

const awakened = majorSection('THE AWAKENED');
const campaignLore = {
  awakened: {
    conclusions: lorePassages(narrativeSubsection(awakened, 'CONCLUSION'), 'conclusion', awakened),
    introduction: lorePassages(narrativeSubsection(awakened, 'INTRODUCTION'), 'introduction')[0],
    vision: lorePassages(narrativeSubsection(awakened, 'BLOOD VISION'), 'blood vision')[0],
  },
  lanternBearer: lorePassages(majorSection('THE LANTERN BEARER'), 'lantern bearer')[0],
};
if (
  !campaignLore.awakened.introduction ||
  !campaignLore.awakened.conclusions.length ||
  !campaignLore.awakened.vision ||
  !campaignLore.lanternBearer
) {
  throw new Error('Could not extract all Lantern Bearer and Awakened narrative sections');
}
const campaignLoreFile = path.join(root, 'src/content/data/campaign-lore.json');
writeFileSync(campaignLoreFile, `${JSON.stringify(campaignLore, null, 2)}\n`);
console.log(`[extract-quests] Wrote campaign lore to ${path.relative(root, campaignLoreFile)}`);

// Keywords & icons glossary from the rulebook: powers the Manual's keyword search and the
// board glossary. Glossary entries are `**Name (Scope)**: text` paragraphs; the parenthetical
// is a scope only when it names hunters, monsters or biomes ("Empty (deck)" keeps its parens).
const rulebook = readFileSync(path.join(root, 'docs/rulebook.md'), 'utf8');

const ENTITIES = new Set(
  [
    'Dareon', 'Mirah', 'Thoreg', 'Ljonar', 'Drusk', 'Zaraya', 'Heleren', 'Karah',
    'Vyraxen', 'Felaxir', 'Jekoros', 'Ozew', 'Toramat', 'Dygorax', 'Hurom', 'Orouxen',
    'Kharja', 'Tarragua', 'Sirkaaj', 'Mamuraak', 'Pazis', 'Nagarjas', 'Hydar', 'Reikal',
    'Xitheros', 'Zekath', 'Zekalith', 'Taraska', 'Morkraas', 'Korowon', 'The Awakened',
    'Endless Swamp Biome', 'Nightmare Biome',
  ].map((name) => name.toLowerCase()),
);
const isScope = (parenthetical) =>
  parenthetical
    .split(/(?:,|&|\band\b)\s*/i)
    .every((part) => ENTITIES.has(part.trim().toLowerCase()));

const slug = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const keywordSection = rulebook.slice(
  rulebook.indexOf('### Keywords (Alphabetical)'),
  rulebook.indexOf('\n## Terrain'),
);
const keywords = [];
const usedIds = new Map();
for (const block of keywordSection.split(/\n(?=\*\*[^*]+\*\*:)/)) {
  const match = block.match(/^\*\*([^*]+)\*\*:\s*([\s\S]+)$/);
  if (!match) continue;
  const [, rawName, rawText] = match;
  const paren = rawName.match(/^(.+?) \((.+)\)$/);
  const scoped = paren && isScope(paren[2]);
  const name = scoped ? paren[1].trim() : rawName.trim();
  let id = slug(name);
  usedIds.set(id, (usedIds.get(id) ?? 0) + 1);
  // Names that only differ by their descriptive parens ("Empty (deck)") need distinct ids.
  if (usedIds.get(id) > 1) id = slug(rawName);
  keywords.push({
    id,
    name,
    scope: scoped ? paren[2].trim() : null,
    text: clean(rawText.replace(/\n\s*>?\s*/g, ' ').replace(/\s+/g, ' ')),
  });
}
const keywordsFile = path.join(root, 'src/content/data/keywords.json');
writeFileSync(keywordsFile, `${JSON.stringify(keywords, null, 2)}\n`);
console.log(`[extract-quests] Wrote ${keywords.length} keywords to ${path.relative(root, keywordsFile)}`);

// Card color and general icon tables from the Keywords & Icons section.
const icons = [];
for (const [group, heading] of [
  ['color', '### Color Icons'],
  ['general', '### General Icons'],
]) {
  const start = rulebook.indexOf(heading);
  const tableStart = rulebook.indexOf('|', start);
  const table = rulebook.slice(tableStart, rulebook.indexOf('\n\n', tableStart));
  for (const line of table.split('\n')) {
    const match = line.match(/^\|\s*`?\[([^\]|`]+)\]`?\s*\|\s*([^|]+)\|/);
    if (!match) continue;
    icons.push({ group, id: slug(match[1]), name: `[${match[1].trim()}]`, text: clean(match[2]) });
  }
}
const iconsFile = path.join(root, 'src/content/data/icons.json');
writeFileSync(iconsFile, `${JSON.stringify(icons, null, 2)}\n`);
console.log(`[extract-quests] Wrote ${icons.length} icons to ${path.relative(root, iconsFile)}`);
