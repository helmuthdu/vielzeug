#!/usr/bin/env node
// Joins hero catalog cards with their scans under public/cards/hero_*/ into an id-keyed manifest
// (src/content/data/heroes/scans.json), so the app pairs cards with artwork by direct lookup instead
// of filename parsing at runtime. Scan filenames are `<weapon>_<step>_<name-slug>.webp` where
// `<step>` is `s` (starter), `a1`–`e2` (upgrade step), or `mu[a-e]`/`mf[a-e]` (mastery
// unfocused/focused side; `mus`/`mfs` for the starter mastery). Re-run with
// `pnpm extract:hero-scans` after adding or renaming scans; unmatched cards and orphan files are
// reported so a broken join is visible at generation time, not in the app.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const cardsDir = path.join(root, 'public/cards');
const outFile = path.join(root, 'src/content/data/heroes/scans.json');
const heroesDir = path.join(root, 'src/content/data/heroes');
const heroCardData = Object.fromEntries(
  readdirSync(heroesDir)
    .filter((file) => file.endsWith('.json') && file !== 'scans.json')
    .map((file) => [path.basename(file, '.json'), JSON.parse(readFileSync(path.join(heroesDir, file), 'utf8'))]),
);

const SCAN_PATTERN = /^[a-z_]+_(s|[a-e][12]|mu[a-e]|mus|mf[a-e]|mfs)_(.+)\.webp$/;
const slug = (value) => value.toLowerCase().replace(/[^a-z0-9]/g, '');

// Folder per hunter: `hero_<weapon>_<hunterId>`, resolved by suffix so the mapping stays in one place.
const folders = readdirSync(cardsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && entry.name.startsWith('hero_'))
  .map((entry) => entry.name);

const manifest = {};
const orphans = [];
const unmatched = [];
for (const [hunterId, data] of Object.entries(heroCardData)) {
  const folder = folders.find((name) => name.endsWith(`_${hunterId}`));
  if (!folder) throw new Error(`No scan folder for hunter ${hunterId}.`);
  const files = readdirSync(path.join(cardsDir, folder))
    .filter((file) => file.endsWith('.webp') && !file.startsWith('_') && !/_img_\d+/.test(file))
    .sort();
  const art = new Map();
  const focused = new Map();
  for (const file of files) {
    const match = file.match(SCAN_PATTERN);
    if (!match) continue;
    (file.includes('_mf') ? focused : art).set(slug(match[2]), `${folder}/${file}`);
  }
  const entries = [...data.starter, ...Object.values(data.upgrades).flat()];
  for (const entry of entries) {
    const key = slug(entry.name);
    const artPath = art.get(key) ?? null;
    const focusedPath = focused.get(key) ?? null;
    if (!artPath && !focusedPath) unmatched.push(`${hunterId}/${entry.name}`);
    manifest[entry.id] = { art: artPath, artFocused: focusedPath };
  }
  const referenced = new Set([...art.values(), ...focused.values()]);
  orphans.push(...files.filter((file) => !referenced.has(`${folder}/${file}`)).map((file) => `${folder}/${file}`));
}

const sorted = Object.fromEntries(Object.entries(manifest).sort(([left], [right]) => left.localeCompare(right)));
writeFileSync(outFile, `${JSON.stringify(sorted, null, 2)}\n`);
console.log(`Wrote ${Object.keys(sorted).length} card scans to ${outFile}`);
if (unmatched.length) console.warn(`Cards without scans:\n  ${unmatched.join('\n  ')}`);
if (orphans.length) console.warn(`Orphan scan files:\n  ${orphans.join('\n  ')}`);
