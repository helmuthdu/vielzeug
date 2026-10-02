#!/usr/bin/env node
// Extracts the printed Primal Challenges cards in docs/trials into the structured catalog
// src/content/data/trials.json. A macOS PDFKit helper (scripts/extract-trials.swift,
// compiled on demand) provides each page's text lines, word positions and image placements :
// the images carry a 16×16 RGBA signature, and this script parses the hunt cards (#1–#10)
// and the Winds series books (#11+) into the catalog's schema and reports everything a human
// should confirm before it ships.
//
// The Winds die maps print each monster's six faces as board images with the terrain tokens
// placed on them as raster icons; the TERRAIN strip under the grid pairs the same icons with
// their printed names. The parser reads the faces' biomes off the grid banners, matches every
// placed token against the book's legend icons through the signatures, and derives its sector
// from where it sits on the board: the maps print the cross the physical board shows, with
// the front toward the top of the page.
//
// Re-run with `pnpm extract:trials` after dropping new trial-card PDFs into docs/trials.
// Entries already in the catalog are never overwritten: their hand-curated fields win, but
// structural drift (monster, aggression, base score, modifier counts, rankings, die-map
// setups) is reported. `pnpm extract:trials -- --check` reports without writing.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const docsDir = path.join(root, 'docs/trials');
const outFile = path.join(root, 'src/content/data/trials.json');
const CHECK = process.argv.includes('--check');
const explicit = process.argv.slice(2).filter((arg) => !arg.startsWith('--') && arg.endsWith('.pdf'));

// ---------------------------------------------------------------------------
// Catalogs: read from the real content sources so the extractor validates
// against the live ids instead of a hand-maintained copy.
// ---------------------------------------------------------------------------

const monsterSource = readFileSync(path.join(root, 'src/content/monsters.ts'), 'utf8');
const MONSTERS = new Map();
for (const chunk of monsterSource.split(/monster\('/).slice(1)) {
  const id = chunk.slice(0, chunk.indexOf("'"));
  const name = chunk.match(/\bname: '([^']+)'/);
  if (id && name) MONSTERS.set(name[1].toLowerCase(), id);
}
const terrainSource = readFileSync(path.join(root, 'src/content/terrain.ts'), 'utf8');
const TERRAIN = new Map();
for (const [, id, name] of terrainSource.matchAll(/id: '([a-z-]+)',\s*name: '([^']+)'/g)) {
  TERRAIN.set(name.toLowerCase(), id);
}

const BIOMES = [
  ['crystal-caves', ['crystal', 'caves']],
  ['endless-swamp', ['endless', 'swamp']],
  ['flooded-wilds', ['flooded', 'wilds']],
  ['frozen-wastes', ['frozen', 'wastes']],
  ['goldarks', ['goldarks']],
  ['nightmare', ['nightmare']],
  ['niz-maraga', ['niz', 'maraga']],
  ['sunset-plains', ['sunset', 'plains']],
  ['thunder-mountains', ['thunder', 'mountains']],
  ['woltyar', ['woltyar']],
];
const SERIES_BOXES = [
  ['ice', 'ice'],
  ['feather', 'feather'],
  ['venom', 'venom'],
  ['nightmare 2', 'nightmare-2'],
  ['nightmare', 'nightmare'],
];
const BIOME_BOXES = [
  'biome-endless-swamp-nightmare',
  'biome-goldarks-thunder-mountains',
  'biome-niz-maraga-sunset-plains',
  'biome-woltyar-frozen-wastes',
  'biome-crystal-caves-flooded-wilds',
];

/** Signed points as the cards print them: penalties use en and em dashes. */
const SIGNED_POINTS = /^[+\u2013\u2014-]\d+ points?/;

/** A row counting occurrences ("each …", "victory for each …") is a tally; anything else is a
 *  single yes/no condition the worksheet renders as a flag. */
function modifierKind(condition) {
  return /^(?:each|victory for each)\b/i.test(condition.trim()) ? 'count' : 'flag';
}

const warnings = [];
const warn = (card, message) => warnings.push(`${card}: ${message}`);
const slug = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const titleCase = (value) =>
  value
    .toLowerCase()
    .replace(/(^|[\s'(-])([a-z])/g, (_, prefix, letter) => prefix + letter.toUpperCase())
    .replace(/\bOf\b|\bThe\b(?!$)|\bIn\b|\bA\b|\bOn\b|\bBy\b|\bUnder\b|\bWith\b|\bBetween\b|\bBefore\b/g, (word, offset) =>
      offset === 0 ? word : word.toLowerCase(),
    );

const monsterIdFor = (card, name) => {
  const id = MONSTERS.get(name.toLowerCase()) ?? slug(name);
  if (!MONSTERS.has(name.toLowerCase())) warn(card, `monster "${name}" is not in the catalog (using slug "${id}")`);
  return id;
};
const terrainIdFor = (card, label) => {
  const base = label.replace(/\s*\(back\)\s*$/i, '').toLowerCase();
  return TERRAIN.get(base) ?? null;
};

// ---------------------------------------------------------------------------
// PDFKit helper: compiled on demand, cached like card-audit's OCR binary.
// ---------------------------------------------------------------------------

function runExtractor(files) {
  const source = path.join(root, 'scripts/extract-trials.swift');
  const binary = path.join(os.tmpdir(), 'primal-extract-trials');
  const stamp = `${binary}.stamp`;
  if (!existsSync(binary) || readFileSync(stamp, 'utf8') !== readFileSync(source, 'utf8')) {
    execFileSync('swiftc', ['-o', binary, source], { stdio: 'ignore' });
    writeFileSync(stamp, readFileSync(source, 'utf8'));
  }
  const output = execFileSync(binary, files, { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return JSON.parse(output);
}

// ---------------------------------------------------------------------------
// Hunt cards (#1–#10): one page, the sections printed on every card.
// ---------------------------------------------------------------------------

function parseHunt(doc) {
  const lines = doc.pages[0].lines;
  const indexOfLine = (marker) => lines.findIndex((line) => line === marker || line === `${marker}:`);
  const idxAggression = indexOfLine('AGGRESSION LEVEL');
  const idxRules = indexOfLine('SPECIAL RULES');
  const idxScore = indexOfLine('CHALLENGE SCORE');
  const idxRanking = indexOfLine('RANKING');
  if (idxRules === -1 || idxScore === -1 || idxRanking === -1) {
    return { shape: 'unparsed', reason: `missing section (rules ${idxRules}, score ${idxScore}, ranking ${idxRanking})` };
  }

  const monsterLine = lines.find((line) => /^.+ - Challenge #\d+$/.test(line));
  if (!monsterLine) return { shape: 'unparsed', reason: 'no "Monster - Challenge #N" line' };
  const [, monsterName, number] = monsterLine.match(/^(.+) - Challenge #(\d+)$/);
  const name = titleCase(lines[0]);
  const id = slug(name);

  const firstMarker = Math.min(...[idxAggression, idxRules].filter((index) => index >= 0));
  const loreLines = dedupeRuns(lines.slice(lines.indexOf(monsterLine) + 1, firstMarker)).filter(
    (line) => line.length > 2,
  );

  // Aggression: the printed level is a bare digit beside the marker, or inline after it.
  let aggression = null;
  if (idxAggression >= 0) {
    const window = lines.slice(Math.max(0, idxAggression - 3), idxAggression + 2).filter((line) => /^[0-3]$/.test(line));
    if (window.length) aggression = Number(window[0]);
  }
  if (aggression === null) {
    const inline = lines.find((line) => /^AGGRESSION LEVEL: ?[0-3]/.test(line));
    if (inline) aggression = Number(inline.match(/[0-3]$/)[0]);
  }
  if (aggression === null) warn(id, 'aggression level not found: set it by hand');

  // The note under AGGRESSION LEVEL: full sentences, minus the requirement lines.
  const noteZone = idxAggression >= 0 ? lines.slice(idxAggression + 1, idxRules) : [];
  const aggressionNote =
    noteZone
      .filter(
        (line) =>
          !/required/i.test(line) && !/^[\d ]+$/.test(line) && !/\d+x /.test(line) && !/miniature/i.test(line),
      )
      .join(' ') || null;

  // Requirements and printed restrictions, wherever the card states them.
  const requiredExpansionIds = [];
  for (const match of lines.join('\n').matchAll(/((?:[A-Z][a-z]+(?: and )?)+)\s*Expansions? required/gi)) {
    for (const box of match[1].split(/\s+and\s+/i)) {
      const id2 = box.trim().toLowerCase();
      if (id2 && !requiredExpansionIds.includes(id2)) requiredExpansionIds.push(id2);
    }
  }
  const forbiddenElementIds = [];
  for (const match of lines.join(' ').matchAll(/cannot use (\w+) equipment/gi)) {
    const element = match[1].toLowerCase();
    if (!forbiddenElementIds.includes(element)) forbiddenElementIds.push(element);
  }
  const potionCap = lines.join(' ').match(/maximum of (\d+) equippable Potions/i);

  // Special rules run until the 1..10 round track: printed either as one digit per line or
  // as merged space-separated runs, or, when the track sits above the rules, until the
  // component lines start.
  const trackChar = lines.join('\n').search(/(^|\n)1[\s\n]+2[\s\n]+3[\s\n]+4[\s\n]+5[\s\n]+6[\s\n]+7[\s\n]+8[\s\n]+9[\s\n]+10\b/);
  const trackPos = trackChar === -1 ? -1 : lineIndexOfChar(lines, trackChar);
  const rulesZone = lines.slice(idxRules + 1, idxScore);
  let rulesEnd;
  let componentsStart;
  if (trackPos > idxRules) {
    rulesEnd = trackPos;
    componentsStart = trackPos;
  } else {
    // The track sits above the rules (or is absent): components are the counted lines.
    const firstComponent = rulesZone.findIndex((line) => /\d+x /.test(line) || /miniature/i.test(line));
    rulesEnd = firstComponent === -1 ? idxScore : idxRules + 1 + firstComponent;
    componentsStart = rulesEnd;
  }
  const ruleLines = lines.slice(idxRules + 1, rulesEnd).filter((line) => line.length > 2);
  // Wrapped rule tails the layout stranded inside the component zone: sentence fragments
  // (terminal punctuation, no counted piece) are moved back into the rules, where the
  // punctuation-based merge reattaches them to their unterminated line.
  const strandedTails = lines
    .slice(componentsStart, idxScore)
    .filter(
      (line) =>
        line.length > 2 &&
        /[.!?,]$/.test(line) &&
        !/\d+x /.test(line) &&
        line.includes(' ') &&
        !/required/i.test(line) &&
        !/miniature/i.test(line),
    );
  const specialRules = mergeContinuations([...ruleLines, ...strandedTails]);
  if (specialRules.length === 0) warn(id, 'no special rules parsed');

  // Components: after the rules until CHALLENGE SCORE, minus requirement lines and
  // leftover round-track digits.
  const components = parseComponents(
    id,
    lines.slice(componentsStart, idxScore).filter((line) => !/required/i.test(line) && !/^[\d ]+$/.test(line)),
  );

  // Scoring: intro sentence(s), then modifiers; an "In case of victory:" line gates what follows.
  const scoreZone = lines.slice(idxScore + 1, idxRanking);
  const firstModifier = scoreZone.findIndex((line) => SIGNED_POINTS.test(line));
  const introText = scoreZone.slice(0, firstModifier === -1 ? scoreZone.length : firstModifier).join(' ');
  const scoredOnDefeat = /even in case of defeat/i.test(introText);
  const baseMatch = introText.match(/starting (?:with|from) (\d+)/i);
  const base = baseMatch ? Number(baseMatch[1]) : null;
  if (base === null) warn(id, 'base score not found: set it by hand');
  const modifiers = [];
  let victoryGated = false;
  for (const line of scoreZone) {
    if (/^in case of victory:?$/i.test(line)) {
      victoryGated = true;
      continue;
    }
    const match = line.match(/^([+\u2013\u2014-])(\d+) points?\b[,.]?\s*(.*)$/);
    if (!match) continue;
    const condition = match[3].replace(/^[,.]?\s*/, '').replace(/^(?:if|for) /i, '');
    const scope =
      !scoredOnDefeat || victoryGated || /\bvictory\b/i.test(condition) ? 'victory' : 'always';
    modifiers.push({ condition, kind: modifierKind(condition), points: Number(`${match[1]}${match[2]}`), scope });
  }
  if (modifiers.length === 0) warn(id, 'no score modifiers parsed');

  const rankings = parseRankings(id, lines.slice(idxRanking + 1));

  const seriesLine = lines.find((line) => /^PRIMAL CHALLENGES( 2024)?$/i.test(line));
  return {
    aggression,
    aggressionNote,
    components,
    forbiddenElementIds,
    id,
    lore: loreLines.join(' '),
    maxPotionSlots: potionCap ? Number(potionCap[1]) : null,
    monsterId: monsterIdFor(id, monsterName.trim()),
    name,
    nightmareVariant: /choose whether or not to use the Nightmare variant/i.test(lines.join(' '))
      ? 'optional'
      : 'none',
    number: Number(number),
    rankings,
    requiredExpansionIds,
    scoring: { base, modifiers, scoredOnDefeat },
    series: seriesLine ? titleCase(seriesLine.toLowerCase()) : null,
    shape: 'hunt',
    specialRules,
    terrain: [],
  };
}

/** Collapses OCR's duplicated overlapping lines and merges wrapped rule text. */
function dedupeRuns(values) {
  return values.filter((value, index) => index === 0 || value !== values[index - 1]);
}
/** Maps a character offset in the joined text back to its line index. */
function lineIndexOfChar(lines, charIndex) {
  return lines.join('\n').slice(0, charIndex).split('\n').length - 1;
}
function mergeContinuations(values) {
  const merged = [];
  for (const value of values) {
    const previous = merged[merged.length - 1];
    if (merged.length && (/^[a-z]/.test(value) || !/[.!?:]$/.test(previous))) merged[merged.length - 1] += ` ${value}`;
    else merged.push(value);
  }
  return merged;
}

/** Splits component lines like "Ozew miniature 1x Baethanis 1x Rock" into counted pieces. */
function parseComponents(card, zone) {
  const components = [];
  for (const line of zone) {
    if (/^in case of (victory|defeat)/i.test(line) || SIGNED_POINTS.test(line) || line.length < 3) continue;
    // Wrapped rule text the layout moved past the round track: sentences are not components.
    if (/[.!?,]$/.test(line) && !/\d+x /.test(line) && line.includes(' ')) continue;
    const segments = line.split(/(?=\d+x )/).map((segment) => segment.trim());
    const lead = segments[0].match(/^\d+x /) ? null : segments[0];
    if (lead && lead.length > 2) {
      // A short bare fragment continues the previous counted piece ("2x Thornvine" + "Token").
      const previous = components[components.length - 1];
      if (previous && previous.count !== null && lead.length <= 12 && !/\d+x /.test(lead)) {
        previous.label = `${previous.label} ${lead.toLowerCase()}`;
        continue;
      }
      components.push(piece(lead, /miniature/i.test(lead) ? 1 : null));
    }
    for (const segment of segments) {
      const match = segment.match(/^(\d+)x (.+)$/);
      if (match) components.push(piece(match[2], Number(match[1])));
      else if (segment === segments[0] && segments.length === 1 && !/\d+x /.test(line) && lead === null) {
        // A bare stack of cards, e.g. "Reikal's Venom cards".
        components.push(piece(segment, null));
      }
    }
  }
  return components.filter((component, index) => component.label !== components[index - 1]?.label);
  function piece(label, count) {
    const clean = label.replace(/\s+/g, ' ').trim();
    const normalized = /\((back)\)$/i.test(clean) ? clean.replace(/\((back)\)$/i, '(back)') : clean;
    return { count, label: normalized, terrainId: terrainIdFor(card, normalized) };
  }
}

/** "DRAGON SLAYER 130 points / BEAST MASTER / … / 110 points / … / <50 points" → tiers. */
function parseRankings(card, zone) {
  const names = [];
  const scores = [];
  for (const line of zone) {
    const inline = line.match(/^([A-Z][A-Z' !?]+) (\d+) points$/);
    if (inline && names.length === scores.length) {
      names.push(inline[1].trim());
      scores.push(Number(inline[2]));
      continue;
    }
    const below = line.match(/^<\s*(\d+) points$/);
    const plain = line.match(/^(\d+) points$/);
    if (below) scores.push(null);
    else if (plain && !/^[A-Z]/.test(line)) scores.push(Number(plain[1]));
    else if (/^[A-Z][A-Z' !?]{2,}$/.test(line) && names.length < 6) names.push(line);
  }
  const rankings = names.map((name, index) => ({ minScore: scores[index] ?? null, name: titleCase(name.toLowerCase()) }));
  if (rankings.length !== 6) warn(card, `parsed ${rankings.length} ranking tiers (expected 6)`);
  return rankings;
}

// ---------------------------------------------------------------------------
// Winds series books (#11+): lore and rules pages, then one die-map page per monster.
// ---------------------------------------------------------------------------

function parseSeries(doc) {
  const file = path.basename(doc.file);
  const numberMatch = file.match(/#(\d+)/);
  const allText = doc.pages.map((page) => page.lines.join('\n')).join('\n');
  const nameMatch = allText.match(/The (Winds of [A-Za-z]+) Challenge/i);
  if (!nameMatch) return { shape: 'unparsed', reason: 'no "The Winds of … Challenge" overview' };
  const name = nameMatch[1];
  const id = slug(name);

  // Lore is the story page right after the cover.
  const lorePage = doc.pages.find(
    (page) => page.lines.length > 5 && !/OVERVIEW|EXPEDITIONS/i.test(page.lines.join(' ')),
  );

  // The expansions paragraph names the boxes the mode is designed around.
  const expansionPage = doc.pages.find((page) => page.lines.includes('EXPANSIONS'));
  const recommendedExpansionIds = [];
  if (expansionPage) {
    const paragraph = expansionPage.lines.join(' ');
    for (const [label, boxId] of SERIES_BOXES) {
      if (new RegExp(`\\b${label}\\b`, 'i').test(paragraph) && !recommendedExpansionIds.includes(boxId)) {
        recommendedExpansionIds.push(boxId);
      }
    }
    if (/all Biome Expansions/i.test(paragraph)) recommendedExpansionIds.push(...BIOME_BOXES);
  } else warn(id, 'no EXPANSIONS page found');

  // The score tables: three LEVEL blocks, each a BASE SCORE plus modifier bullets.
  const scoreLevels = {};
  const scorePage = doc.pages.find((page) => page.lines.some((line) => /^BASE SCORE:/.test(line)));
  if (scorePage) {
    for (const level of [1, 2, 3]) {
      const block = splitScoreBlocks(scorePage.lines, level);
      if (!block) {
        warn(id, `score level ${level} not found`);
        continue;
      }
      const base = block.match(/BASE SCORE: (\d+) points?/);
      const modifiers = [];
      for (const segment of block.split(/[•\n]/)) {
        const match = segment.match(/^\s*([+\u2013\u2014-])(\d+) points?,?\s*(.*)$/);
        if (!match) continue;
        modifiers.push({
          condition: match[3].replace(/^(?:if|for) /i, '').trim(),
          kind: modifierKind(match[3]),
          points: Number(`${match[1]}${match[2]}`),
          scope: 'always',
        });
      }
      scoreLevels[String(level)] = { base: base ? Number(base[1]) : null, modifiers };
    }
  } else warn(id, 'no score table page found');

  // The die maps: one page per monster. Their legends: the TERRAIN strip's icon-name pairs,
  // collected across every map page: identify the tokens the boards place.
  const dieMapPages = doc.pages.filter((page) => page.lines.includes('TERRAIN'));
  const legend = legendCorpus(id, dieMapPages);
  const monsters = [];
  for (const page of dieMapPages) {
    const monster = parseMonsterMap(id, page, legend);
    if (monster) monsters.push(monster);
  }
  if (monsters.length === 0) warn(id, 'no monster die-map pages parsed');

  const sessions = allText.match(/series of (\d+) Expeditions/i);
  const wounds = allText.match(/(?:maximum of|more than) (\d+) Wound cards/i);

  return {
    expeditionCount: sessions ? Number(sessions[1]) : 5,
    id,
    lore: lorePage ? lorePage.lines.join(' ') : '',
    maxWoundCards: wounds ? Number(wounds[1]) : 3,
    monsters,
    name,
    nightmareVariant: /choose whether or not to use the Nightmare variant/i.test(allText) ? 'optional' : 'none',
    number: numberMatch ? Number(numberMatch[1]) : null,
    rankings: parseRankings(id, findLinesAfter(doc.pages, 'RANKING')),
    recommendedExpansionIds,
    scoreLevels,
    series: 'Primal Challenges',
    startingAggression: 1,
  };
}

function splitScoreBlocks(lines, level) {
  // The three LEVEL headers share one printed line, so the blocks are split by their
  // "BASE SCORE: N points" markers instead: level N's modifiers run from its marker to
  // the next marker (the bounty heading closes the last block).
  const joined = lines.join('\n');
  const markers = [...joined.matchAll(/BASE SCORE: (\d+) points?/g)];
  const own = markers[level - 1];
  if (!own) return null;
  const start = (own.index ?? 0) + own[0].length;
  const end =
    markers[level] !== undefined
      ? markers[level].index
      : joined.search(/\b(BOUNTY PHASE|END OF THE CHALLENGE)\b/);
  return joined.slice(start, end === -1 ? joined.length : end);
}

/** The die-map page's geometry: the face digits, the six board images between the top digits
 *  and the bottommost biome banner, the token icons inside each board and the legend icons
 *  below the grid. Everything else of that size on the page is cover or monster art. */
function mapGeometry(page) {
  const rows = clusterRows(page.words);
  const faceRows = [];
  const biomeRows = [];
  for (const row of rows) {
    const sorted = [...row].sort((a, b) => a.x - b.x);
    const digits = sorted.filter((word) => /^[1-6]$/.test(word.t));
    if (digits.length === 3) {
      faceRows.push(digits);
      continue;
    }
    const phrases = matchBiomePhrases(sorted);
    if (phrases.length > 0) biomeRows.push({ phrases, words: sorted });
  }
  const geometry = { faceRows, biomeRows, boards: [], tokensByBoard: new Map(), legendIcons: [] };
  if (faceRows.length !== 2 || biomeRows.length < 2) return geometry;
  const faces = [...faceRows[0], ...faceRows[1]];
  const gridTop = Math.min(...faces.map((face) => face.y));
  const gridBottom = Math.max(...biomeRows.flatMap((row) => row.words.map((word) => word.y)));
  const boards = page.images.filter(
    (image) => image.pw > 150 && image.pw < 190 && image.ph > 120 && image.ph < 165 && image.y > gridTop && image.y < gridBottom,
  );
  const tokensByBoard = new Map(boards.map((board) => [board, []]));
  const legendIcons = [];
  for (const image of page.images) {
    if (image.pw >= 70 || image.ph >= 70) continue;
    const board = boards.find(
      (candidate) => Math.abs(candidate.x - image.x) < candidate.pw / 2 + 5 && Math.abs(candidate.y - image.y) < candidate.ph / 2 + 5,
    );
    if (board) tokensByBoard.get(board).push(image);
    else if (image.y > gridBottom) legendIcons.push(image);
  }
  return { ...geometry, boards, tokensByBoard, legendIcons };
}

function parseMonsterMap(card, page, legend) {
  // The monster name: the topmost all-caps word before the die grid.
  const top = page.words
    .filter((word) => word.y < 250 && /^[A-Z][A-Z'-]+$/.test(word.t) && !['TERRAIN', 'PRIMAL'].includes(word.t))
    .sort((a, b) => a.y - b.y)[0];
  if (!top) return null;
  const monsterId = monsterIdFor(card, top.t);

  const { faceRows, biomeRows, boards, tokensByBoard, legendIcons } = mapGeometry(page);
  if (faceRows.length !== 2 || biomeRows.length < 2) {
    warn(card, `die map for "${monsterId}" unclear (${faceRows.length} face rows, ${biomeRows.length} biome rows)`);
    return { monsterId, setups: [] };
  }
  if (boards.length !== 6) {
    warn(card, `die map for "${monsterId}" shows ${boards.length} boards (expected 6)`);
    return { monsterId, setups: [] };
  }
  for (const { label, sig } of legendEntries(card, page, legendIcons)) {
    if (!sig) warn(card, `legend icon "${label}" carries no signature`);
    else if (!TERRAIN.has(label)) warn(card, `legend token "${label}" is not in the terrain catalog`);
  }

  const boardForFace = (face) =>
    boards
      .filter((board) => Math.abs(board.x - face.x) < 40 && board.y > face.y)
      .sort((a, b) => a.y - b.y)[0] ?? null;

  const setups = [];
  for (const face of [...faceRows[0], ...faceRows[1]]) {
    const bannerRow = faceRows[0].includes(face) ? biomeRows[0] : biomeRows[biomeRows.length - 1];
    const label = nearest(bannerRow.phrases, face);
    const board = boardForFace(face);
    const terrain = board
      ? tokensByBoard.get(board).flatMap((token) => {
          const sector = sectorOf(card, monsterId, face.t, token, board);
          const terrainId = identifyToken(card, legend, monsterId, face.t, token);
          return sector && terrainId ? [{ sector, terrainId }] : [];
        })
      : [];
    if (!board) warn(card, `die map for "${monsterId}" has no board under face ${face.t}`);
    setups.push({ biome: label ? label.id : null, roll: Number(face.t), terrain });
  }
  setups.sort((a, b) => a.roll - b.roll);
  if (setups.some((setup) => setup.terrain.length === 0)) {
    warn(card, `a face of "${monsterId}" carries no terrain tokens: confirm the board is really bare`);
  }
  return { monsterId, setups };
}

/** The board sector a token sits in: the maps print the cross the physical board shows, with
 *  the front toward the top of the page, the rear toward the bottom and the flanks at the
 *  sides: whichever axis the token deviates from the center decides. */
function sectorOf(card, monsterId, face, token, board) {
  const rx = (token.x - (board.x - board.pw / 2)) / board.pw;
  const ry = (token.y - (board.y - board.ph / 2)) / board.ph;
  const dx = rx - 0.5;
  const dy = ry - 0.5;
  if (Math.abs(dx) < 0.08 && Math.abs(dy) < 0.08) {
    warn(card, `"${monsterId}" face ${face}: token at the board center: place it by hand`);
    return null;
  }
  if (Math.abs(dy) >= Math.abs(dx)) return dy < 0 ? 'front' : 'rear';
  return dx < 0 ? 'left-flank' : 'right-flank';
}

/** The TERRAIN strip: the icon images below the grid, paired with their printed names. */
function legendEntries(card, page, legendIcons) {
  if (legendIcons.length === 0) return [];
  const iconTop = Math.min(...legendIcons.map((icon) => icon.y));
  const names = page.words.filter((word) => word.y > iconTop + 12 && word.y < iconTop + 60);
  const firstLine = names.filter((word) => word.y < iconTop + 40);
  const secondLine = names.filter((word) => word.y >= iconTop + 40);
  return legendIcons.flatMap((icon) => {
    const name = firstLine.reduce(
      (best, word) => (best && Math.abs(best.x - icon.x) <= Math.abs(word.x - icon.x) ? best : word),
      null,
    );
    if (!name) {
      warn(card, `legend icon at x ${Math.round(icon.x)} has no printed name`);
      return [];
    }
    // Wrapped labels print their second line under the first, at the same x.
    const wrapped = secondLine.find((word) => Math.abs(word.x - name.x) < 3);
    const label = wrapped ? `${name.t} ${wrapped.t}`.toLowerCase() : name.t.toLowerCase();
    return [{ label, sig: icon.sig }];
  });
}

/** Every legend entry across the book's map pages, keyed by terrain id: one book prints the
 *  same icons at several sizes, so a page whose own legend misses a token still resolves it. */
function legendCorpus(card, pages) {
  const corpus = new Map();
  for (const page of pages) {
    for (const { label, sig } of legendEntries(card, page, mapGeometry(page).legendIcons)) {
      const terrainId = TERRAIN.get(label);
      if (!terrainId) continue;
      if (!corpus.has(terrainId)) corpus.set(terrainId, []);
      if (sig) corpus.get(terrainId).push(sig);
    }
  }
  return corpus;
}

/** Mean channel distance over the pixels both signatures paint, penalized by shape mismatch. */
function signatureDistance(a, b) {
  const pixelCount = a.length / 4;
  let overlap = 0;
  let either = 0;
  let difference = 0;
  for (let pixel = 0; pixel < pixelCount; pixel++) {
    const aOn = a[pixel * 4 + 3] > 128;
    const bOn = b[pixel * 4 + 3] > 128;
    if (aOn || bOn) either += 1;
    if (aOn && bOn) {
      overlap += 1;
      difference +=
        (Math.abs(a[pixel * 4] - b[pixel * 4]) +
          Math.abs(a[pixel * 4 + 1] - b[pixel * 4 + 1]) +
          Math.abs(a[pixel * 4 + 2] - b[pixel * 4 + 2])) /
        3;
    }
  }
  if (overlap < 8) return 999;
  return difference / overlap - 30 * (1 - overlap / either);
}

/** Matches a placed token against the legend's icons; close calls are flagged for the eye. */
function identifyToken(card, legend, monsterId, face, token) {
  if (!token.sig) {
    warn(card, `"${monsterId}" face ${face}: a token carries no signature`);
    return null;
  }
  const ranked = [...legend.entries()]
    .map(([terrainId, sigs]) => ({
      score: Math.min(...sigs.map((sig) => signatureDistance(token.sig, sig))),
      terrainId,
    }))
    .sort((a, b) => a.score - b.score);
  const best = ranked[0];
  if (!best) return null;
  const second = ranked[1];
  if (second && second.score - best.score < 10) {
    warn(
      card,
      `"${monsterId}" face ${face}: token read as ${best.terrainId} over ${second.terrainId} by a thin margin: confirm by eye`,
    );
  }
  return best.terrainId;
}

/** Finds printed biome phrases in an x-sorted word row, returning their ids and x centers.
 *  Hyphenated labels print as one word ("NIZ-MARAGA") or split across words, so both forms
 *  are normalized to the same parts before matching. */
function matchBiomePhrases(sorted) {
  const words = sorted.flatMap((word) =>
    word.t
      .toLowerCase()
      .split('-')
      .filter(Boolean)
      .map((part) => ({ t: part, x: word.x })),
  );
  const phrases = [];
  for (let index = 0; index < words.length; index += 1) {
    for (const [id, parts] of BIOMES) {
      const run = words.slice(index, index + parts.length);
      if (run.length !== parts.length) continue;
      if (run.every((word, offset) => word.t === parts[offset])) {
        phrases.push({ id, x: run.reduce((sum, word) => sum + word.x, 0) / run.length });
        index += parts.length - 1;
        break;
      }
    }
  }
  return phrases;
}

/** Groups words into rows by their y coordinate (≈10pt tolerance). */
function clusterRows(words) {
  const rows = [];
  for (const word of [...words].sort((a, b) => a.y - b.y)) {
    const row = rows.find((candidate) => Math.abs(candidate[0].y - word.y) < 10);
    if (row) row.push(word);
    else rows.push([word]);
  }
  return rows;
}
const nearest = (phrases, face) =>
  [...phrases].sort((a, b) => Math.abs(a.x - face.x) - Math.abs(b.x - face.x))[0] ?? null;

function findLinesAfter(pages, marker) {
  for (const page of pages) {
    const index = page.lines.indexOf(marker);
    if (index !== -1) return page.lines.slice(index + 1);
  }
  return [];
}

// ---------------------------------------------------------------------------
// Merge with the committed catalog: new cards append, existing cards report drift.
// ---------------------------------------------------------------------------

function driftOf(existing, parsed) {
  const drift = [];
  const reads = [
    ['number', (card) => card.number],
    ['monsterId', (card) => card.monsterId],
    ['aggression', (card) => card.aggression],
    ['series', (card) => card.series],
    ['modifierCount', (card) => card.scoring?.modifiers?.length ?? card.scoreLevels?.['1']?.modifiers?.length],
    ['base', (card) => card.scoring?.base ?? card.scoreLevels?.['1']?.base],
    ['rankingCount', (card) => card.rankings?.length],
    ['monsterCount', (card) => card.monsters?.length],
  ];
  for (const [label, read] of reads) {
    const parsedValue = read(parsed);
    if (parsedValue !== undefined && parsedValue !== null && String(read(existing)) !== String(parsedValue)) {
      drift.push(`${label}: catalog "${String(read(existing))}" vs card "${String(parsedValue)}"`);
    }
  }
  return drift;
}

/** One die face's terrain as a compact, comparable list: "rock@front water@front …". */
const terrainSummary = (terrain) =>
  (terrain ?? [])
    .map((placement) => `${placement.terrainId}@${placement.sector}`)
    .sort()
    .join(' ');

const files = explicit.length ? explicit : readdirSync(docsDir).filter((file) => file.endsWith('.pdf')).sort();
if (files.length === 0) {
  console.error('No PDFs found in docs/trials.');
  process.exit(1);
}
const documents = runExtractor(files.map((file) => (file.includes('/') ? file : path.join(docsDir, file))));

const catalog = JSON.parse(readFileSync(outFile, 'utf8'));
const hunts = [...catalog.hunts];
const series = [...catalog.series];
const report = [];

for (const doc of documents) {
  const file = path.basename(doc.file);
  const isSeries = doc.pages.length > 2 && doc.pages.some((page) => page.lines.includes('CHALLENGE STRUCTURE'));
  const parsed = isSeries ? parseSeries(doc) : parseHunt(doc);
  if (parsed.shape === 'unparsed') {
    report.push(`✗ ${file}: SKIPPED: ${parsed.reason}`);
    continue;
  }
  const target = parsed.shape === 'hunt' ? hunts : series;
  const existing = target.find((entry) => entry.id === parsed.id);
  delete parsed.shape;
  if (existing) {
    const drift = driftOf(existing, parsed);
    // The die maps are printed data, so the catalog follows the cards: a series entry keeps
    // its hand-curated fields but takes the parsed monster setups, with drift reported.
    if (parsed.monsters) {
      for (const monster of parsed.monsters) {
        const current = existing.monsters?.find((entry) => entry.monsterId === monster.monsterId);
        if (!current) {
          drift.push(`${monster.monsterId}: not in the catalog`);
          continue;
        }
        for (const setup of monster.setups) {
          const currentSetup = current.setups?.find((entry) => entry.roll === setup.roll);
          if (!currentSetup) {
            drift.push(`${monster.monsterId} face ${setup.roll}: not in the catalog`);
            continue;
          }
          if (currentSetup.biome !== setup.biome) {
            drift.push(
              `${monster.monsterId} face ${setup.roll}: biome catalog "${currentSetup.biome}" vs card "${setup.biome}"`,
            );
          }
          if (terrainSummary(currentSetup.terrain) !== terrainSummary(setup.terrain)) {
            drift.push(
              `${monster.monsterId} face ${setup.roll}: terrain catalog [${terrainSummary(currentSetup.terrain)}] vs card [${terrainSummary(setup.terrain)}]`,
            );
          }
        }
      }
      existing.monsters = parsed.monsters;
    }
    report.push(
      drift.length
        ? `! ${file}: "${parsed.id}" exists; drift: ${drift.join('; ')}`
        : `✓ ${file}: "${parsed.id}" matches the catalog`,
    );
  } else {
    target.push(parsed);
    report.push(`+ ${file}: extracted new "${parsed.id}"`);
    if (!isSeries) {
      warn(parsed.id, 'terrain placements are printed on the card diagram only: read it and fill `terrain` by hand');
    }
  }
}

if (warnings.length) {
  report.push('', 'Needs a human pass:');
  report.push(...[...new Set(warnings)].map((message) => `  [VERIFY] ${message}`));
}
console.log(report.join('\n'));

if (!CHECK) {
  writeFileSync(outFile, `${JSON.stringify({ hunts, series }, null, 2)}\n`);
  console.log(`\nWrote ${path.relative(root, outFile)} (${hunts.length} hunts, ${series.length} series).`);
} else {
  console.log('\nCheck only: nothing written.');
}
