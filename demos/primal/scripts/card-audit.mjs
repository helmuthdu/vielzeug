#!/usr/bin/env node
// Generates the card-audit report: one HTML page per hero (action and mastery cards) plus
// equipment pages (armor, helm, item, potion, and weapons per hunter), each rendering every
// card scan next to the dataset values the scan must confirm, and an index page. Structural
// invariants live in src/content/hunter-cards.test.ts; this report is the human value-check
// pass over them. Every joined scan is also OCR-read (macOS Vision via
// scripts/card-audit-ocr.swift, cached in .card-audit-ocr.json) and the card is flagged when
// the printed text diverges from the dataset text: OCR on stylized cards misreads icon
// markers, so flags steer the reviewer to the scan rather than replacing their judgment.
// The pages are self-contained (no app or Refine dependency) so they open directly from the
// filesystem; serve the demo root (e.g. `python3 -m http.server`) instead if you want the
// pages to share localStorage progress. Re-run with `pnpm audit:cards` after dataset or scan
// changes: the output directory is generated, gitignored, and rewritten wholesale.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const outDir = path.join(root, 'card-audit');
const dataDir = path.join(root, 'src/content/data');

const heroCardData = Object.fromEntries(
  readdirSync(path.join(dataDir, 'heroes'))
    .filter((file) => file.endsWith('.json') && file !== 'scans.json')
    .map((file) => [path.basename(file, '.json'), JSON.parse(readFileSync(path.join(dataDir, 'heroes', file), 'utf8'))]),
);
const heroScanData = JSON.parse(readFileSync(path.join(dataDir, 'heroes/scans.json'), 'utf8'));
const forgeCatalog = {
  armor: JSON.parse(readFileSync(path.join(dataDir, 'forge/armor.json'), 'utf8')),
  helm: JSON.parse(readFileSync(path.join(dataDir, 'forge/helm.json'), 'utf8')),
  item: JSON.parse(readFileSync(path.join(dataDir, 'forge/items.json'), 'utf8')),
  potion: JSON.parse(readFileSync(path.join(dataDir, 'forge/potions.json'), 'utf8')),
  weapon: JSON.parse(readFileSync(path.join(dataDir, 'forge/weapons.json'), 'utf8')),
};
const FORGE_KINDS = ['armor', 'helm', 'item', 'potion', 'weapon'];

const slug = (value) => value.toLowerCase().replace(/[^a-z0-9]/g, '');

// Hero and weapon metadata from src/content/hunters.ts.
const huntersSrc = readFileSync(path.join(root, 'src/content/hunters.ts'), 'utf8');
const weaponNames = new Map(
  [...huntersSrc.matchAll(/id: '([a-z-]+)',\s*name: '([^']+)'/g)].map((match) => [match[1], match[2]]),
);
const heroMeta = {};
for (const match of huntersSrc.matchAll(/hunter\('([a-z]+)',\s*\{([\s\S]*?)\n  \}\)/g)) {
  const field = (name) => match[2].match(new RegExp(`${name}: '([^']+)'`))?.[1];
  heroMeta[match[1]] = {
    cardFolder: field('cardFolder'),
    classId: field('classId'),
    name: field('name'),
    title: field('title'),
  };
}

const ENTITY_NAMES = { '&': 'amp', '<': 'lt', '>': 'gt', '"': 'quot', "'": '#39' };
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => `&${ENTITY_NAMES[ch]};`);

// ── OCR assist (macOS Vision) ──────────────────────────────────────────────
// Flags review candidates; never trusted as truth. The comparison is token coverage: the
// share of dataset-text tokens found in the OCR reading. Coverage (not edit distance) because
// the printed card shows the title, trait line, step marker and icon glyphs, which OCR reads
// as noise the dataset stores elsewhere: extra printed tokens must not sink a correct card.
// Bracketed icon markers ("[attack]") are stripped from the expected text: they are printed
// as icons, invisible to OCR.
const OCR_COVERAGE_THRESHOLD = 0.6;
/** Bump when the OCR pipeline (helper scale, recognition settings) changes: busts the cache. */
const OCR_CACHE_VERSION = 3;
const ocrCachePath = path.join(root, '.card-audit-ocr.json');

const normalizeText = (value) =>
  String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\[[^\]]*\]/g, ' ')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/([a-z])(\d)/g, '$1 $2')
    .replace(/(\d)([a-z])/g, '$1 $2')
    .trim();

const tokenize = (value) => new Set(normalizeText(value).split(' ').filter(Boolean));

/** OCR lines that are the printed title, step marker, or cost icon, not card text. */
function printedTextLines(lines, card) {
  return lines.filter(
    (line) =>
      slug(line) !== slug(card.name) &&
      !/^(s|[a-e][12])$/i.test(line.trim()) &&
      !/^\d{1,2}$/.test(line.trim()),
  );
}

/** Returns null when there is nothing to compare (no text, no OCR reading). */
function textCoverage(expected, printed) {
  const expectedTokens = tokenize(expected);
  const printedTokens = tokenize(printed);
  if (expectedTokens.size === 0 || printedTokens.size === 0) return null;
  const matched = [...expectedTokens].filter((token) => printedTokens.has(token));
  const expectedDigits = [...expectedTokens].filter((token) => /^\d+$/.test(token));
  const printedDigits = [...printedTokens].filter((token) => /^\d+$/.test(token));
  // Icon-adjacent digits merge with neighbors in OCR ("2." reads as "24", "3xWL" as "31"),
  // so an expected digit matches when it appears inside a longer printed run. When OCR reads
  // no digits at all the scan is digit-blind (numbers inside icons) and the check is skipped.
  const digitsOk =
    printedDigits.length === 0 ||
    expectedDigits.every((token) => printedDigits.some((digit) => digit === token || digit.includes(token)));
  return { coverage: matched.length / expectedTokens.size, digitsOk };
}

function compileOcrHelper() {
  const source = path.join(root, 'scripts/card-audit-ocr.swift');
  const binary = path.join(os.tmpdir(), 'primal-card-audit-ocr');
  try {
    if (!existsSync(binary) || statSync(binary).mtimeMs < statSync(source).mtimeMs) {
      execFileSync('swiftc', ['-o', binary, source], { stdio: 'ignore' });
    }
    return binary;
  } catch {
    return null;
  }
}

/** OCRs the given `public/cards/...` paths (batched, cached by path + mtime). */
function ocrScanLines(scanPaths) {
  let cache = {};
  try {
    cache = JSON.parse(readFileSync(ocrCachePath, 'utf8'));
    if (cache.__version !== OCR_CACHE_VERSION) cache = {};
  } catch {
    cache = {};
  }
  const pending = [...new Set(scanPaths)].filter((scanPath) => {
    const entry = cache[scanPath];
    return !entry || entry.mtime !== statSync(path.join(root, scanPath)).mtimeMs;
  });
  if (pending.length === 0) return cache;
  const binary = compileOcrHelper();
  if (!binary) {
    console.log('OCR unavailable (swiftc or Vision missing): text comparison skipped');
    return cache;
  }
  for (let offset = 0; offset < pending.length; offset += 32) {
    const batch = pending.slice(offset, offset + 32);
    const output = execFileSync(binary, batch, { encoding: 'utf8', cwd: root, maxBuffer: 64 * 1024 * 1024 });
    let relative = null;
    for (const line of output.split('\n')) {
      if (line.startsWith('=== ')) {
        relative = line.slice(4);
        cache[relative] = { mtime: statSync(path.join(root, relative)).mtimeMs, error: false, lines: [] };
      } else if (relative !== null && line) {
        if (line === '!LOAD-ERROR') cache[relative].error = true;
        else cache[relative].lines.push(line);
      }
    }
    console.log(`OCR ${Math.min(offset + batch.length, pending.length)}/${pending.length} scans`);
  }
  writeFileSync(ocrCachePath, `${JSON.stringify({ __version: OCR_CACHE_VERSION, ...cache }, null, 2)}\n`);
  return cache;
}

const ocrLines = (cache, file) => {
  if (!file) return null;
  const entry = cache[`public/cards/${file}`];
  return entry && !entry.error ? entry.lines : null;
};

/** Attaches `card.ocr = { lines, focusedLines, coverage, digitsOk, nameFound, flagged }`. */
function attachOcr(cards, cache) {
  for (const card of cards) {
    const lines = ocrLines(cache, card.art);
    const focusedLines = card.cardType === 'Mastery' ? ocrLines(cache, card.artFocused) : null;
    const printed = [
      ...printedTextLines(lines ?? [], card),
      ...printedTextLines(focusedLines ?? [], card),
    ].join(' ');
    const expected =
      card.cardType === 'Mastery'
        ? [card.unfocused?.text, card.focused?.text].filter(Boolean).join(' ')
        : [card.trait, card.text].filter(Boolean).join(' ');
    const result = textCoverage(expected, printed);
    const nameFound = titleMatches(card.name, [...(lines ?? []), ...(focusedLines ?? [])]);
    card.ocr = {
      coverage: result?.coverage ?? null,
      digitsOk: result?.digitsOk ?? true,
      focusedLines,
      lines,
      nameFound,
      flagged:
        (result !== null && (result.coverage < OCR_COVERAGE_THRESHOLD || !result.digitsOk)) || !nameFound,
    };
  }
}

/** Vision systematically misreads display-font I as TR ("IRONHEART" → "TRONHEART"), so a
 *  printed title matches at containment or one edit distance; real name errors differ more. */
function titleMatches(name, lines) {
  const nameSlug = slug(name);
  if (!nameSlug) return true;
  const all = lines.join(' ');
  if (slug(all).includes(nameSlug)) return true;
  return lines.some((line) => {
    const lineSlug = slug(line);
    return lineSlug.length > 0 && editDistanceAtMostOne(lineSlug, nameSlug);
  });
}

function editDistanceAtMostOne(a, b) {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (++edits > 1) return false;
    if (a.length === b.length) {
      i++;
      j++;
    } else if (a.length > b.length) i++;
    else j++;
  }
  return a.length - i + (b.length - j) + edits <= 1;
}

const stepLabel = (step) =>
  step === 'S' ? 'Starter deck' : `Branch ${step[0]} · Step ${step[1]}`;
const stepOrder = (step) => (step === 'S' ? '0' : step);

/** Every catalog card id across hunters: the hero-scans manifest is keyed by them. */
const allHeroCardIds = new Set(
  Object.values(heroCardData).flatMap((data) => [
    ...data.starter.map((entry) => entry.id),
    ...Object.values(data.upgrades).flat().map((entry) => entry.id),
  ]),
);

/** Cards for the audit: the catalog joined with scans through the id-keyed hero-scans manifest. */
function heroCardsFor(hunterId) {
  const data = heroCardData[hunterId];
  const join = (entry, step) => ({
    ...entry,
    art: heroScanData[entry.id]?.art ?? null,
    artFocused: heroScanData[entry.id]?.artFocused ?? null,
    step,
  });
  const cards = [
    ...data.starter.map((entry) => join(entry, 'S')),
    ...Object.entries(data.upgrades).flatMap(([step, entries]) => entries.map((entry) => join(entry, step))),
  ];
  const orphanScans = Object.entries(heroScanData)
    .filter(([id, scan]) => !allHeroCardIds.has(id) && (scan.art || scan.artFocused))
    .map(([, scan]) => scan.art ?? scan.artFocused);
  const missingScans = cards.filter((card) => !card.art || (card.cardType === 'Mastery' && !card.artFocused));
  const listedFiles = [...new Set(cards.flatMap((card) => [card.art, card.artFocused].filter(Boolean)))].filter(
    (file) => !existsSync(path.join(root, 'public/cards', file)),
  );
  return { cards, folder: heroMeta[hunterId].cardFolder, missingScans, orphanScans, listedFiles };
}

const fieldRow = (label, value) =>
  value === null || value === undefined || value === '' ? '' : `<dt>${label}</dt><dd>${escapeHtml(value)}</dd>`;

function heroRows(card) {
  const mastery = card.cardType === 'Mastery';
  const counters = mastery && card.unfocused ? ` (${card.unfocused.counters} counters)` : '';
  return [
    fieldRow('Type', mastery ? 'Mastery' : `${card.cardType} · ${card.subtype}`),
    fieldRow('Stamina cost', mastery ? null : card.staminaCost),
    fieldRow('Stamina icons', mastery ? null : card.staminaIcons),
    fieldRow('Trait', card.trait),
    fieldRow('Text', card.text),
    fieldRow('Unfocused', mastery && card.unfocused ? `${card.unfocused.text}${counters}` : null),
    fieldRow('Focused', mastery && card.focused ? card.focused.text : null),
    fieldRow('FAQ', card.faq),
    fieldRow('Dataset id', card.id),
  ].join('');
}

const costLabel = (cost) => {
  if (!cost) return null;
  if ('anyPlants' in cost) return `any plants ×${cost.anyPlants}`;
  return Object.entries(cost)
    .map(([resource, count]) => `${resource} ×${count}`)
    .join(', ');
};

const deckLabel = (deck) =>
  deck ? `${deck.attack}A · ${deck.maneuver}M · ${deck.parry}P · ${deck.dodge}D` : null;

function equipmentRows(card) {
  return [
    fieldRow('Type', card.cardType[0].toUpperCase() + card.cardType.slice(1)),
    fieldRow('Health', card.health),
    fieldRow('Damage', Array.isArray(card.damage) ? `${card.damage[0]}–${card.damage[1]}` : card.damage),
    fieldRow('Deck composition', deckLabel(card.deckComposition)),
    fieldRow('Cost', costLabel(card.cost)),
    fieldRow('Text', card.text),
    fieldRow('Dataset id', card.id),
  ].join('');
}

function cardArticle(card, rows) {
  const mastery = card.cardType === 'Mastery';
  const scan = (file, label) =>
    file
      ? `<img alt="${escapeHtml(card.name)}: ${label}" loading="lazy" src="../public/cards/${escapeHtml(file)}">`
      : `<p class="scan-missing">No ${label} scan joined for this card</p>`;
  const scans = mastery
    ? `${scan(card.art, 'unfocused side')}${scan(card.artFocused, 'focused side')}`
    : scan(card.art, 'scan');
  const ocr = card.ocr;
  const ocrBadge = ocr
    ? ocr.flagged
      ? `<span class="ocr ocr--flag">OCR ${ocr.coverage === null ? '' : `${Math.round(ocr.coverage * 100)}% `}review</span>`
      : `<span class="ocr">OCR ${ocr.coverage === null ? 'n/a' : `${Math.round(ocr.coverage * 100)}%`}</span>`
    : '';
  const ocrDetails = ocr
    ? `<details class="ocr-text"><summary>OCR reading of the scan</summary>${
        ocr.lines ? `<pre>${escapeHtml(ocr.lines.join('\n'))}</pre>` : '<p>No OCR text</p>'
      }${ocr.focusedLines ? `<pre>${escapeHtml(ocr.focusedLines.join('\n'))}</pre>` : ''}</details>`
    : '';
  return `
      <article class="card${ocr?.flagged ? ' is-ocr-flag' : ''}" data-id="${escapeHtml(card.id)}" id="${escapeHtml(card.id)}">
        <div class="scans">${scans}</div>
        <div class="values">
          <h3>${escapeHtml(card.name)} <small>${escapeHtml(card.step)}</small>${ocrBadge}</h3>
          <dl>
            ${rows}
          </dl>
          ${ocrDetails}
          <div class="controls">
            <button class="match" type="button">Match <kbd>M</kbd></button>
            <button class="mismatch" type="button">Mismatch <kbd>X</kbd></button>
            <button class="clear" type="button">Clear</button>
          </div>
          <textarea placeholder="What differs on the scan? (saved with the mismatch)" rows="2"></textarea>
        </div>
      </article>`;
}

function heroPage(hunterId, audit) {
  const meta = heroMeta[hunterId];
  const { cards, missingScans, orphanScans, listedFiles } = audit;
  const sections = [...new Set(cards.map((card) => card.step))]
    .sort((a, b) => stepOrder(a).localeCompare(stepOrder(b)))
    .map(
      (step) => `
      <section>
        <h2>${escapeHtml(stepLabel(step))}</h2>
        ${cards
          .filter((card) => card.step === step)
          .map((card) => cardArticle(card, heroRows(card)))
          .join('')}
      </section>`,
    )
    .join('');
  const anomalies = [
    ...missingScans.map((card) => `No scan joined for ${card.name} (${card.id})`),
    ...orphanScans.map((key) => `Scan "${key}" matches no card in the dataset`),
    ...listedFiles.map((file) => `Scan listed in hero-scans.json but missing on disk: ${file}`),
  ];
  return auditPage({
    pageId: hunterId,
    title: `${escapeHtml(meta.name)}: ${escapeHtml(meta.title)}`,
    metaHtml: escapeHtml(weaponNames.get(meta.classId) ?? ''),
    sections,
    anomalies,
    cards,
  });
}

/** One audit page: topbar, anomaly + OCR-flag banners, sections of card articles, status UI. */
function auditPage({ pageId, title, metaHtml, sections, anomalies, cards }) {
  const ocrFlagged = cards.filter((card) => card.ocr?.flagged);
  const metaLine = [
    metaHtml,
    `${cards.length} cards`,
    `<span class="ocr-flag-count">${ocrFlagged.length} OCR flags</span>`,
    '<span class="progress"></span>',
  ]
    .filter(Boolean)
    .join(' · ');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Card audit: ${title}</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; font: 14px/1.5 system-ui, -apple-system, sans-serif; color: #1a1a1a; background: #fafafa; }
  .topbar { position: sticky; top: 0; z-index: 1; display: flex; gap: 16px; align-items: center; justify-content: space-between; padding: 12px 24px; background: #fff; border-bottom: 1px solid #ddd; }
  .topbar h1 { margin: 0; font-size: 18px; }
  .topbar .meta { margin: 2px 0 0; color: #666; font-size: 13px; }
  .topbar button { font: inherit; padding: 6px 12px; border: 1px solid #bbb; border-radius: 6px; background: #fff; cursor: pointer; }
  .anomalies { margin: 16px 24px; padding: 10px 14px; border-left: 3px solid #b42318; background: #fff; color: #b42318; }
  .anomalies ul { margin: 6px 0 0; padding-left: 18px; }
  main { max-width: 1100px; margin: 0 auto; padding: 0 24px 48px; }
  section > h2 { margin: 32px 0 4px; font-size: 15px; text-transform: uppercase; letter-spacing: 0.06em; color: #555; }
  .card { display: grid; grid-template-columns: 300px 1fr; gap: 20px; margin: 12px 0; padding: 14px; background: #fff; border: 1px solid #ddd; border-radius: 8px; }
  .card.selected { outline: 2px solid #475467; }
  .card.is-match { border-left: 4px solid #067647; }
  .card.is-mismatch { border-left: 4px solid #b42318; }
  .scans { display: grid; gap: 8px; align-content: start; }
  .scans img { width: 300px; height: auto; border-radius: 4px; background: #eee; }
  .scan-missing { display: grid; place-items: center; width: 300px; height: 200px; margin: 0; border: 2px dashed #b42318; border-radius: 4px; color: #b42318; font-size: 13px; text-align: center; }
  .values h3 { margin: 0 0 8px; font-size: 16px; }
  .values h3 small { color: #888; font-weight: 400; }
  .ocr { margin-left: 8px; padding: 1px 8px; border-radius: 10px; background: #eef1f4; color: #556; font-size: 12px; font-weight: 500; vertical-align: 1px; }
  .ocr--flag { background: #fde8e8; color: #b42318; }
  .card.is-ocr-flag { border-color: #e4a5a0; }
  .card.is-ocr-flag.is-match, .card.is-ocr-flag.is-mismatch { border-left-width: 4px; }
  .ocr-text { margin-top: 10px; font-size: 13px; }
  .ocr-text summary { color: #666; cursor: pointer; }
  .ocr-text pre { margin: 6px 0 0; padding: 8px 10px; background: #f4f4f2; border-radius: 6px; white-space: pre-wrap; }
  .ocr-flags { margin: 16px 24px; padding: 10px 14px; border-left: 3px solid #b45309; background: #fff; color: #7a4106; }
  .ocr-flags ul { margin: 6px 0 0; padding-left: 18px; }
  .ocr-flags a { color: #7a4106; }
  .values dl { display: grid; grid-template-columns: 110px 1fr; gap: 2px 12px; margin: 0; }
  .values dt { color: #666; }
  .values dd { margin: 0; }
  .controls { display: flex; gap: 8px; margin-top: 12px; }
  .controls button { font: inherit; padding: 5px 12px; border: 1px solid #bbb; border-radius: 6px; background: #fff; cursor: pointer; }
  .controls kbd { font-size: 11px; color: #888; }
  .controls .match { border-color: #067647; color: #067647; }
  .controls .mismatch { border-color: #b42318; color: #b42318; }
  .card.is-match .controls .match, .card.is-mismatch .controls .mismatch { background: currentColor; }
  .card.is-match .controls .match { color: #fff; }
  .card.is-mismatch .controls .mismatch { color: #fff; }
  textarea { width: 100%; margin-top: 8px; font: inherit; padding: 6px 8px; border: 1px solid #ccc; border-radius: 6px; }
  .hint { max-width: 1100px; margin: 16px auto 0; padding: 0 24px; color: #666; font-size: 13px; }
  .hero-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; max-width: 1100px; margin: 0 auto; padding: 0 24px 48px; list-style: none; }
  .hero-list a { display: block; padding: 14px; background: #fff; border: 1px solid #ddd; border-radius: 8px; color: inherit; text-decoration: none; }
  .hero-list a:hover { border-color: #475467; }
  .hero-list small { display: block; margin-top: 4px; color: #666; }
</style>
</head>
<body>
<header class="topbar">
  <a href="./index.html">All cards</a>
  <div>
    <h1>${title}</h1>
    <p class="meta">${metaLine}</p>
  </div>
  <button class="export" type="button">Export results</button>
</header>
${anomalies.length ? `<div class="anomalies">Join anomalies (fix in the dataset or scan names)<ul>${anomalies.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></div>` : ''}
${ocrFlagged.length ? `<div class="ocr-flags">OCR text mismatch: verify these against the scans first (OCR misreads icon markers, so some flags are noise; cards you mark leave this list)<ul>${ocrFlagged.map((card) => `<li data-card-id="${escapeHtml(card.id)}"><a href="#${escapeHtml(card.id)}">${escapeHtml(card.name)}</a>${card.ocr.coverage === null ? '' : `: ${Math.round(card.ocr.coverage * 100)}%`}</li>`).join('')}</ul></div>` : ''}
<main>${sections}</main>
<script>
(function () {
  var key = 'card-audit:${pageId}';
  var state = {};
  try { state = JSON.parse(localStorage.getItem(key) || '{}'); } catch (error) { state = {}; }
  var cards = Array.prototype.slice.call(document.querySelectorAll('.card'));
  var selected = null;

  function persist() {
    localStorage.setItem(key, JSON.stringify(state));
    renderProgress();
  }
  function renderProgress() {
    var reviewed = 0;
    var flagged = 0;
    cards.forEach(function (card) {
      var entry = state[card.dataset.id];
      if (entry && entry.status) reviewed += 1;
      if (entry && entry.status === 'mismatch') flagged += 1;
    });
    var progress = document.querySelector('.progress');
    if (progress) progress.textContent = reviewed + '/' + cards.length + ' reviewed · ' + flagged + ' flagged';
    var banner = document.querySelector('.ocr-flags');
    if (banner) {
      var remaining = 0;
      banner.querySelectorAll('li').forEach(function (item) {
        var entry = state[item.dataset.cardId];
        item.hidden = Boolean(entry && entry.status);
        if (!entry || !entry.status) remaining += 1;
      });
      banner.hidden = remaining === 0;
      var flagCount = document.querySelector('.ocr-flag-count');
      if (flagCount) flagCount.textContent = remaining + ' OCR flags';
    }
  }
  function apply(card) {
    var entry = state[card.dataset.id];
    card.classList.toggle('is-match', entry && entry.status === 'match');
    card.classList.toggle('is-mismatch', entry && entry.status === 'mismatch');
    card.querySelector('textarea').value = (entry && entry.note) || '';
  }
  function mark(card, status) {
    state[card.dataset.id] = Object.assign({}, state[card.dataset.id], { status: status });
    apply(card);
    persist();
    if (status === 'match') select(nextOf(card));
  }
  function clear(card) {
    delete state[card.dataset.id];
    apply(card);
    persist();
  }
  function select(card) {
    if (selected) selected.classList.remove('selected');
    selected = card || null;
    if (!selected) return;
    selected.classList.add('selected');
    selected.scrollIntoView({ block: 'nearest' });
  }
  function nextOf(card) { return cards[cards.indexOf(card) + 1] || card; }
  function previousOf(card) { return cards[cards.indexOf(card) - 1] || card; }

  cards.forEach(function (card) {
    apply(card);
    card.addEventListener('click', function (event) {
      if (event.target.closest('button, textarea')) return;
      select(card);
    });
    card.querySelector('.match').addEventListener('click', function () { mark(card, 'match'); });
    card.querySelector('.mismatch').addEventListener('click', function () { mark(card, 'mismatch'); select(card); });
    card.querySelector('.clear').addEventListener('click', function () { clear(card); });
    card.querySelector('textarea').addEventListener('input', function (event) {
      state[card.dataset.id] = Object.assign({}, state[card.dataset.id], { note: event.target.value });
      persist();
    });
  });
  document.addEventListener('keydown', function (event) {
    if (event.target.tagName === 'TEXTAREA') return;
    if (!selected) { select(cards[0]); return; }
    if (event.key === 'j' || event.key === 'ArrowDown') { select(nextOf(selected)); event.preventDefault(); }
    else if (event.key === 'k' || event.key === 'ArrowUp') { select(previousOf(selected)); event.preventDefault(); }
    else if (event.key === 'm') { mark(selected, 'match'); event.preventDefault(); }
    else if (event.key === 'x') { mark(selected, 'mismatch'); event.preventDefault(); }
    else if (event.key === 'u' || event.key === 'Backspace') { clear(selected); event.preventDefault(); }
  });
  document.querySelector('.export').addEventListener('click', function () {
    var results = cards.map(function (card) {
      var entry = state[card.dataset.id] || {};
      return {
        id: card.dataset.id,
        status: entry.status || 'unreviewed',
        note: entry.note || '',
      };
    });
    var blob = new Blob([JSON.stringify({ page: '${pageId}', exportedAt: new Date().toISOString(), results: results }, null, 2)], { type: 'application/json' });
    var link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'card-audit-${pageId}.json';
    link.click();
    URL.revokeObjectURL(link.href);
  });
  renderProgress();
  select(cards[0]);
})();
</script>
</body>
</html>`;
}

// ── Equipment (forge catalog) ───────────────────────────────────────────────
const equipmentCard = (kind, family, level) => ({
  art: level.file ?? null,
  artFocused: null,
  cardType: kind,
  cost: level.cost ?? null,
  damage: level.damage ?? null,
  deckComposition: level.deckComposition ?? null,
  health: level.health ?? null,
  id: level.id,
  name: family.name,
  step: `L${level.level}`,
  text: level.text,
});

/** Scan files present in the equipment folders but referenced by no catalog entry. */
function equipmentOrphanScans() {
  const referenced = new Set();
  const dirs = new Set();
  for (const kind of FORGE_KINDS) {
    for (const family of forgeCatalog[kind]) {
      for (const level of family.levels) {
        if (!level.file) continue;
        referenced.add(level.file);
        const dir = path.dirname(level.file);
        if (dir !== '.') dirs.add(dir);
      }
    }
  }
  const orphans = [];
  for (const dir of dirs) {
    for (const file of readdirSync(path.join(root, 'public/cards', dir))) {
      // `_`-prefixed files are extraction source images, not card scans.
      if (file.startsWith('_') || /_img_\d+/.test(file)) continue;
      if (!referenced.has(`${dir}/${file}`)) orphans.push(`${dir}/${file}`);
    }
  }
  return orphans;
}

/** Equipment audits: one per forge kind, plus one weapons page per hunter. */
function equipmentAuditsFor(heroIds) {
  const orphanScans = equipmentOrphanScans();
  const audits = [];
  const build = (pageId, title, metaHtml, kind, families) => {
    const groups = families.map((family) => ({
      family,
      cards: family.levels.map((level) => equipmentCard(kind, family, level)),
    }));
    audits.push({
      cards: groups.flatMap((group) => group.cards),
      groups,
      metaHtml,
      orphanScans,
      pageId,
      title,
    });
  };
  for (const kind of ['armor', 'helm', 'item', 'potion']) {
    build(`equipment-${kind}`, kind[0].toUpperCase() + kind.slice(1), '', kind, forgeCatalog[kind]);
  }
  for (const hunterId of heroIds) {
    const meta = heroMeta[hunterId];
    build(
      `weapon-${hunterId}`,
      `${escapeHtml(meta.name)}: weapons`,
      escapeHtml(weaponNames.get(meta.classId) ?? ''),
      'weapon',
      forgeCatalog.weapon.filter((family) => family.hunter === hunterId),
    );
  }
  return audits;
}

function equipmentPage(audit) {
  const sections = audit.groups
    .map(
      (group) => `
      <section>
        <h2>${escapeHtml(group.family.name)}</h2>
        ${group.cards.map((card) => cardArticle(card, equipmentRows(card))).join('')}
      </section>`,
    )
    .join('');
  const anomalies = audit.cards
    .filter((card) => !card.art || !existsSync(path.join(root, 'public/cards', card.art)))
    .map((card) => `No scan file for ${card.name} ${card.step} (${card.id})`);
  return auditPage({
    pageId: audit.pageId,
    title: audit.title,
    metaHtml: audit.metaHtml,
    sections,
    anomalies,
    cards: audit.cards,
  });
}

const orphanBanner = (equipment) => {
  const orphans = equipment[0]?.orphanScans ?? [];
  return orphans.length
    ? `<div style="max-width: 1100px; margin: 16px auto 0; padding: 10px 14px; border-left: 3px solid #b45309; background: #fff; color: #7a4106;">Equipment scans on disk with no catalog entry: check whether they should be modeled<ul style="margin: 6px 0 0; padding-left: 18px;">${orphans.map((file) => `<li>${escapeHtml(file)}</li>`).join('')}</ul></div>`
    : '';
};

function indexPage(heroIds, audits, equipment) {
  const items = heroIds
    .map((hunterId) => {
      const meta = heroMeta[hunterId];
      const { cards } = audits[hunterId];
      const ocrFlags = cards.filter((card) => card.ocr?.flagged).length;
      return `<li><a href="./${hunterId}.html">${escapeHtml(meta.name)}<small>${escapeHtml(meta.title)} · ${escapeHtml(weaponNames.get(meta.classId) ?? '')} · ${cards.length} cards${ocrFlags ? ` · <strong>${ocrFlags} OCR flags</strong>` : ''}</small></a></li>`;
    })
    .join('');
  const equipmentItems = equipment
    .map((audit) => {
      const ocrFlags = audit.cards.filter((card) => card.ocr?.flagged).length;
      return `<li><a href="./${audit.pageId}.html">${audit.title}<small>${audit.cards.length} cards${ocrFlags ? ` · <strong>${ocrFlags} OCR flags</strong>` : ''}</small></a></li>`;
    })
    .join('');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Card audit</title>
<style>
  .hero-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; max-width: 1100px; margin: 0 auto; padding: 0 24px 24px; list-style: none; }
  .hero-list a { display: block; padding: 14px; background: #fff; border: 1px solid #ddd; border-radius: 8px; color: inherit; text-decoration: none; }
  .hero-list a:hover { border-color: #475467; }
  .hero-list small { display: block; margin-top: 4px; color: #666; }
  h2 { max-width: 1100px; margin: 24px auto 8px; padding: 0 24px; font-size: 15px; text-transform: uppercase; letter-spacing: 0.06em; color: #555; }
</style>
</head>
<body style="margin: 0; font: 14px/1.5 system-ui, -apple-system, sans-serif; color: #1a1a1a; background: #fafafa;">
<header style="max-width: 1100px; margin: 0 auto; padding: 32px 24px 8px;">
  <h1 style="margin: 0 0 4px; font-size: 20px;">Card audit: scan vs dataset</h1>
  <p class="hint" style="margin: 0; color: #666;">Every card scan next to the values it must confirm. Serve the demo root (e.g. <code>python3 -m http.server</code>) so pages share progress in localStorage; keyboard: <kbd>j</kbd>/<kbd>k</kbd> move, <kbd>m</kbd> match, <kbd>x</kbd> mismatch, <kbd>u</kbd> clear.</p>
</header>
<h2>Hunters</h2>
<ul class="hero-list">
${items}
</ul>
<h2>Equipment</h2>
<ul class="hero-list">
${equipmentItems}
</ul>
${orphanBanner(equipment)}
</body>
</html>`;
}

const heroIds = Object.keys(heroMeta).filter((hunterId) => heroCardData[hunterId]);
const audits = Object.fromEntries(heroIds.map((hunterId) => [hunterId, heroCardsFor(hunterId)]));
const equipment = equipmentAuditsFor(heroIds);
const scanPaths = [
  ...heroIds.flatMap((hunterId) =>
    audits[hunterId].cards.flatMap((card) => [card.art, card.artFocused].filter(Boolean)),
  ),
  ...equipment.flatMap((audit) => audit.cards.flatMap((card) => [card.art].filter(Boolean))),
].map((file) => `public/cards/${file}`);
const isCheck = process.argv.includes('--check');
if (!isCheck) {
  const ocrCache = ocrScanLines(scanPaths);
  for (const hunterId of heroIds) {
    attachOcr(audits[hunterId].cards, ocrCache);
  }
  for (const audit of equipment) {
    attachOcr(audit.cards, ocrCache);
  }
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
for (const hunterId of heroIds) {
  writeFileSync(path.join(outDir, `${hunterId}.html`), heroPage(hunterId, audits[hunterId]));
}
for (const audit of equipment) {
  writeFileSync(path.join(outDir, `${audit.pageId}.html`), equipmentPage(audit));
}
writeFileSync(path.join(outDir, 'index.html'), indexPage(heroIds, audits, equipment));

const totalCards =
  heroIds.reduce((sum, hunterId) => sum + audits[hunterId].cards.length, 0) +
  equipment.reduce((sum, audit) => sum + audit.cards.length, 0);
const totalAnomalies =
  heroIds.reduce(
    (sum, hunterId) =>
      sum + audits[hunterId].missingScans.length + audits[hunterId].orphanScans.length + audits[hunterId].listedFiles.length,
    0,
  ) + (equipment[0]?.orphanScans.length ?? 0);
const totalOcrFlags =
  heroIds.reduce((sum, hunterId) => sum + audits[hunterId].cards.filter((card) => card.ocr?.flagged).length, 0) +
  equipment.reduce((sum, audit) => sum + audit.cards.filter((card) => card.ocr?.flagged).length, 0);
console.log(
  `Wrote ${heroIds.length} hero + ${equipment.length} equipment pages (${totalCards} cards) to ${path.relative(root, outDir)}/: ${totalAnomalies} anomalies, ${totalOcrFlags} OCR flags`,
);

// `--check` is the routine structural gate: every card joins a scan on disk, no orphan files,
// and the manifest matches the catalog: fast and runnable anywhere. The OCR text-vs-scan
// comparison is the onboarding verification for new heroes, equipment or expansions: run the full
// `pnpm audit:cards` (on a Mac, Vision reads the scans) when content is added, review its flags
// by hand, and leave the routine gate to structure.
if (isCheck) {
  if (totalAnomalies > 0) {
    console.error(
      `[card-audit] check failed: ${totalAnomalies} structural anomalies (missing scans, orphans, manifest drift)`,
    );
    process.exit(1);
  }
  console.log(`[card-audit] check passed: ${totalCards} cards join their scans, no orphans, no manifest drift`);
}
