#!/usr/bin/env node
// Optimizes the demo's photographic artwork so views stay light: a deck builder grid used
// to pull ~12 MB of 732x1020 scans shown in ~100 px tiles. For every raster under a target
// folder this resizes + recompresses to the display-appropriate size: .webp in place, and
// .png/.jpg/.jpeg converted to .webp (original deleted, references in src/ rewritten).
// Requires `cwebp` (brew install webp). Run after adding images: `pnpm optimize:images`.
//
// Repeat runs are near-instant: a .webp already at or below its target width and byte budget
// is skipped without spawning cwebp, so only new or oversized files are re-encoded.
//
// SVGs and files outside the target folders (e.g. terrain token PNGs asserted by tests) are
// left alone. Dynamic references that build an extension in a template string
// (`/backgrounds/bg_${n}.png`) cannot be rewritten automatically: the script reports any
// reference that no longer resolves so it can be fixed by hand.
import { execFile, execFileSync } from 'node:child_process';
import { closeSync, existsSync, openSync, readSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { cpus } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const demoRoot = path.resolve(import.meta.dirname, '..');
const publicRoot = path.join(demoRoot, 'public');
const sourceRoot = path.join(demoRoot, 'src');
const cwebp = process.env.CWEBP ?? 'cwebp';
const concurrency = Math.max(2, Math.min(8, cpus().length - 1));

/** width: resize to this width (height auto); q: WebP quality; maxBytes: skip a compliant .webp already under this size. */
const targets = [
  { dir: 'cards', width: 640, q: 72, maxBytes: 150_000 },
  { dir: 'backgrounds', width: 1600, q: 76, maxBytes: 400_000 },
  { dir: 'heroes', width: 1024, q: 78, maxBytes: 250_000 },
  { dir: 'monsters', width: 800, q: 78, maxBytes: 250_000 },
  { dir: 'game_boxes', width: 800, q: 78, maxBytes: 250_000 },
];

const rasterExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp']);

if (!hasCwebp()) {
  console.error('cwebp not found: install it with `brew install webp` (or set CWEBP).');
  process.exit(1);
}

/** @type {Array<{ file: string, target: typeof targets[number] }>} */
const jobs = [];
for (const target of targets) {
  const base = path.join(publicRoot, target.dir);
  if (!existsSync(base)) continue;
  for (const file of walk(base)) {
    const extension = path.extname(file).toLowerCase();
    if (!rasterExtensions.has(extension)) continue;
    if (extension === '.webp' && isCompliant(file, target)) continue;
    jobs.push({ file, target });
  }
}

let recompressed = 0;
let converted = 0;
let bytesBefore = 0;
let bytesAfter = 0;
/** @type {Array<{ from: string, to: string }>} */
const renames = [];

await runPool(jobs, async ({ file, target }) => {
  const extension = path.extname(file).toLowerCase();
  const size = statSync(file).size;
  const tmp = `${file}.optimize.tmp`;
  try {
    await execFileAsync(
      cwebp,
      ['-quiet', '-q', String(target.q), '-m', '6', '-mt', '-resize', String(target.width), '0', file, '-o', tmp],
      { stdio: 'ignore' },
    );
    const shrunk = statSync(tmp).size;
    if (extension === '.webp') {
      // Re-encoding only pays off when there is a real win; a marginal gain is not worth the
      // extra generation loss on an already-optimized scan.
      if (shrunk < size * 0.9) {
        renameSync(tmp, file);
        recompressed += 1;
        bytesBefore += size;
        bytesAfter += shrunk;
      } else rmSync(tmp, { force: true });
      return;
    }
    const webp = file.replace(/\.[^.]+$/, '.webp');
    if (existsSync(webp)) {
      rmSync(tmp, { force: true });
      console.warn(`skipped ${path.relative(publicRoot, file)}: ${path.basename(webp)} already exists`);
      return;
    }
    if (shrunk >= size) {
      rmSync(tmp, { force: true });
      console.warn(`kept ${path.relative(publicRoot, file)} as-is: WebP would not be smaller`);
      return;
    }
    renameSync(tmp, webp);
    rmSync(file);
    converted += 1;
    bytesBefore += size;
    bytesAfter += shrunk;
    renames.push({ from: path.basename(file), to: path.basename(webp) });
  } catch (error) {
    rmSync(tmp, { force: true });
    console.warn(`skipped ${path.relative(publicRoot, file)}: ${error instanceof Error ? error.message : error}`);
  }
});

const rewritten = rewriteReferences(renames);
const dangling = findDanglingReferences();

const mb = (bytes) => (bytes / 1048576).toFixed(1);
console.log(
  `Recompressed ${recompressed} and converted ${converted} images (${renames.length} renamed): ` +
    `${mb(bytesBefore)} MB -> ${mb(bytesAfter)} MB (-${mb(bytesBefore - bytesAfter)} MB). ` +
    `Rewrote ${rewritten} reference${rewritten === 1 ? '' : 's'} in src/.`,
);
if (dangling.length) {
  console.warn('\nReferences that no longer resolve: fix them by hand:');
  for (const line of dangling) console.warn(`  ${line}`);
  process.exitCode = 1;
}
if (converted) console.warn('If scans were added under public/cards/, run `pnpm extract:hero-scans` afterwards.');

/** A .webp already at or below the target width and byte budget needs no work. */
function isCompliant(file, target) {
  if (statSync(file).size > target.maxBytes) return false;
  const dimensions = webpDimensions(file);
  return dimensions !== null && dimensions.width <= target.width;
}

/** Reads a WebP's canvas size from its header without decoding it. */
function webpDimensions(file) {
  const buffer = Buffer.alloc(30);
  const fd = openSync(file, 'r');
  try {
    if (readSync(fd, buffer, 0, 30, 0) < 30) return null;
  } finally {
    closeSync(fd);
  }
  if (buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WEBP') return null;
  const fourcc = buffer.toString('ascii', 12, 16);
  if (fourcc === 'VP8X') {
    return {
      width: 1 + (buffer[24] | (buffer[25] << 8) | (buffer[26] << 16)),
      height: 1 + (buffer[27] | (buffer[28] << 8) | (buffer[29] << 16)),
    };
  }
  if (fourcc === 'VP8L') {
    const bits = buffer.readUInt32LE(21);
    return { width: 1 + (bits & 0x3f_ff), height: 1 + ((bits >> 14) & 0x3f_ff) };
  }
  if (fourcc === 'VP8 ') {
    return { width: buffer.readUInt16LE(26) & 0x3f_ff, height: buffer.readUInt16LE(28) & 0x3f_ff };
  }
  return null;
}

function rewriteReferences(renames) {
  if (!renames.length) return 0;
  let count = 0;
  for (const file of walk(sourceRoot)) {
    if (!/\.(json|ts|vue)$/.test(file)) continue;
    const original = readFileSync(file, 'utf8');
    let content = original;
    for (const rename of renames) content = content.split(rename.from).join(rename.to);
    if (content !== original) {
      writeFileSync(file, content);
      count += 1;
    }
  }
  return count;
}

/** Every `/folder/name.ext` string in src/ whose file no longer exists on disk. */
function findDanglingReferences() {
  const onDisk = new Set();
  for (const candidate of walk(publicRoot)) onDisk.add(path.basename(candidate));
  // Template paths like `/backgrounds/bg_${n}.png` cannot be rewritten or resolved
  // statically; when their folder was converted they need a manual extension change.
  const dirs = targets.map((target) => target.dir).join('|');
  const dynamic = new RegExp(`\\/(${dirs})\\/[^"'\\n]*\\$\\{[^"'\\n]*\\}?\\.(?:jpe?g|png)`, 'g');
  const dangling = [];
  for (const file of walk(sourceRoot)) {
    if (!/\.(json|ts|vue)$/.test(file)) continue;
    const content = readFileSync(file, 'utf8');
    for (const match of content.matchAll(/\/[\w./$-]*\/([\w-]+\.(?:jpe?g|png|webp))/g)) {
      if (!onDisk.has(match[1])) dangling.push(`${path.relative(demoRoot, file)}: ${match[0]}`);
    }
    for (const match of content.matchAll(dynamic)) {
      dangling.push(`${path.relative(demoRoot, file)}: ${match[0]} (dynamic: verify by hand)`);
    }
  }
  return [...new Set(dangling)];
}

async function runPool(items, worker) {
  let index = 0;
  const pump = async () => {
    while (index < items.length) await worker(items[index++], index);
  };
  await Promise.all(Array.from({ length: concurrency }, pump));
}

function hasCwebp() {
  try {
    execFileSync(cwebp, ['-version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (entry.isFile()) yield full;
  }
}
