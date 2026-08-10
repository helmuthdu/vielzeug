#!/usr/bin/env node
// Verifies the `--_*` custom-property contract documented in AGENTS.md: these are private
// variables a component's own stylesheet reads and one of the mixins in its `styles: [...]`
// array must emit. There's no browser-level error for a mismatch — an unmatched `var(--_foo)`
// just silently falls back (to its own fallback argument, or to nothing) — so this is the only
// thing that catches a typo'd or dropped-mixin `--_*` reference before it ships.
//
// Deliberately conservative: a component is skipped entirely (never flagged) whenever any part
// of its `styles: [...]` array can't be confidently classified — an unrecognized mixin call, a
// spread, a non-literal argument, etc. False negatives (a real gap goes unflagged) are an
// acceptable cost for a build-blocking check; false positives (flagging a legitimate component)
// are not, given the check runs across every one of this package's ~65 styled components.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC_DIR = resolve(__dirname, '../src');

// ── Known mixin emission sets ────────────────────────────────────────────────
// Hand-derived from `src/styles/mixins/*.css.ts` — kept in sync manually since mixins change
// rarely. Mixins not listed here (including any future addition) fall through to the
// "unrecognized → skip the whole component" path below, so an out-of-date table only ever
// produces false negatives, never false positives.

const STATIC_EMISSIONS = {
  coarsePointerMixin: ['--_touch-target', '--_font-size', '--_gap', '--_height', '--_size', '--_icon-size', '--_padding'],
  colorThemeMixin: [
    '--_theme-base',
    '--_theme-content',
    '--_theme-contrast',
    '--_theme-focus',
    '--_theme-backdrop',
    '--_theme-border',
    '--_theme-shadow',
    '--_theme-halo',
  ],
  disabledLoadingMixin: [],
  disabledStateMixin: [],
  elevationMixin: ['--_shadow'],
  fieldVariantMixin: ['--_bg', '--_border-color'],
  forcedColorsFocusMixin: [],
  forcedColorsFormControlMixin: [],
  forcedColorsMixin: [],
  frostVariantMixin: [],
  loadingStateMixin: [],
  paddingMixin: ['--_padding'],
  rainbowEffectMixin: [],
  reducedMotionMixin: ['--_motion-transition', '--_motion-animation'],
  roundedVariantMixin: ['--_radius'],
  shineEffectMixin: ['--_shine-color'],
  srOnlyMixin: [],
  tableBaseMixin: [
    '--_bg',
    '--_border-color',
    '--_radius',
    '--_header-bg',
    '--_accent',
    '--_row-hover-bg',
    '--_stripe-bg',
    '--_cell-padding-x',
    '--_cell-padding-y',
    '--_font-size',
  ],
};

// `sizeVariantMixin(config?)` always emits these three regardless of config (see
// `configToBlock`'s unconditional defaults), plus whatever extra keys the config supplies.
const SIZE_VARIANT_BASE = ['--_font-size', '--_gap', '--_size'];
const SIZE_VARIANT_PROP_MAP = {
  fontSize: '--_font-size',
  gap: '--_gap',
  height: '--_height',
  iconSize: '--_icon-size',
  lineHeight: '--_line-height',
  padding: '--_padding',
  size: '--_size',
  thumbSize: '--_thumb-size',
  width: '--_width',
};

// ── Filesystem walk ───────────────────────────────────────────────────────────

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);

    if (stat.isDirectory()) {
      if (entry === '__tests__' || entry === 'testing') continue;

      yield* walk(full);
    } else if (entry.endsWith('.ts') && !entry.endsWith('.test.ts') && !entry.endsWith('.e2e.ts')) {
      yield full;
    }
  }
}

/**
 * Finds `export const <NAME> = { ... }` object literals across `src/shared/**` (size/variant
 * presets, e.g. `MENU_SIZE_PRESET`) so a `sizeVariantMixin(SOME_PRESET)` call passing a named
 * constant instead of an inline object literal can still be resolved instead of bailing.
 */
function findNamedPreset(name) {
  for (const file of walk(join(SRC_DIR, 'shared'))) {
    const source = readFileSync(file, 'utf8');
    const marker = `export const ${name}`;
    const idx = source.indexOf(marker);

    if (idx === -1) continue;

    const eq = source.indexOf('=', idx);
    const open = source.indexOf('{', eq);

    if (open === -1) return null;

    let depth = 0;

    for (let i = open; i < source.length; i++) {
      if (source[i] === '{') depth++;
      else if (source[i] === '}') {
        depth--;

        if (depth === 0) return source.slice(open, i + 1);
      }
    }
  }

  return null;
}

// ── Bracket-aware helpers ─────────────────────────────────────────────────────

/**
 * Finds every `styles: [ ... ]` array in a source file, scoped one per `define(...)` call — a
 * single file may register more than one custom element (e.g. `menu.ts` defines `ore-menu`,
 * `ore-menu-item`, and `ore-menu-separator`, each with its own independent `styles: [...]`).
 * Returns the raw inner text of each array, in file order.
 */
function extractStylesArrays(source) {
  const defineStarts = [...source.matchAll(/\bdefine(?:<[^(]*?>)?\s*\(/g)].map((m) => m.index);

  if (defineStarts.length === 0) return [];

  const arrays = [];

  for (let n = 0; n < defineStarts.length; n++) {
    const start = defineStarts[n];
    const end = n + 1 < defineStarts.length ? defineStarts[n + 1] : source.length;
    const scope = source.slice(start, end);
    const marker = scope.indexOf('styles:');

    if (marker === -1) continue;

    const open = scope.indexOf('[', marker);

    if (open === -1) continue;

    let depth = 0;

    for (let i = open; i < scope.length; i++) {
      if (scope[i] === '[') depth++;
      else if (scope[i] === ']') {
        depth--;

        if (depth === 0) {
          arrays.push(scope.slice(open + 1, i));
          break;
        }
      }
    }
  }

  return arrays;
}

/** Splits a `styles: [...]` array's inner text into top-level comma-separated entries. */
function splitTopLevel(text) {
  const entries = [];
  let depth = 0;
  let start = 0;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (ch === '(' || ch === '{' || ch === '[') depth++;
    else if (ch === ')' || ch === '}' || ch === ']') depth--;
    else if (ch === ',' && depth === 0) {
      entries.push(text.slice(start, i));
      start = i + 1;
    }
  }

  const last = text.slice(start);

  if (last.trim()) entries.push(last);

  return entries.map((entry) => entry.trim()).filter(Boolean);
}

/** Extracts top-level `key:` property names from an object-literal source snippet. */
function extractObjectKeys(text) {
  const keys = [];
  let depth = 0;

  const keyPattern = /(?:^|[{,])\s*(?:'([^']+)'|"([^"]+)"|(--[\w-]+)|(\w+))\s*:/g;

  for (let i = 0; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') depth--;
  }

  // Only handles a single-level nesting depth check via regex below; reset for the scan.
  void depth;

  let match;

  while ((match = keyPattern.exec(text))) {
    keys.push(match[1] ?? match[2] ?? match[3] ?? match[4]);
  }

  return keys;
}

/**
 * Resolves `sizeVariantMixin({ sm: {...}, md: {...}, lg: {...} })` to its emitted `--_*` set.
 * Also resolves a named preset constant (`sizeVariantMixin(MENU_SIZE_PRESET)`) by looking it up
 * under `src/shared/**`. Returns `null` (→ skip the component) when the argument is neither.
 */
function resolveSizeVariantEmissions(entry) {
  const openParen = entry.indexOf('(');
  const closeParen = entry.lastIndexOf(')');

  if (openParen === -1) return SIZE_VARIANT_BASE; // `sizeVariantMixin` with no call — not actually callable, but conservative default.

  let arg = entry.slice(openParen + 1, closeParen).trim();

  if (!arg) return SIZE_VARIANT_BASE;

  if (/^[$\w]+$/.test(arg)) {
    const preset = findNamedPreset(arg);

    if (!preset) return null;

    arg = preset;
  }

  if (!arg.startsWith('{') || !arg.endsWith('}')) return null; // spread, call expression, etc. — unknown.

  const keys = extractObjectKeys(arg);
  const emitted = new Set(SIZE_VARIANT_BASE);

  for (const key of keys) {
    if (key === 'sm' || key === 'md' || key === 'lg') continue; // tier names, not property keys.

    if (key.startsWith('--')) emitted.add(key);
    else if (SIZE_VARIANT_PROP_MAP[key]) emitted.add(SIZE_VARIANT_PROP_MAP[key]);
    else return null; // unrecognized key — bail rather than risk an incomplete set.
  }

  return [...emitted];
}

/** Classifies one `styles: [...]` array entry. Returns `null` (skip component) when unrecognized. */
function resolveEntryEmissions(entry, cssImportNames) {
  // Strip a leading `// comment` line (e.g. an ordering-rationale note above a mixin call) before
  // classifying — the comment isn't part of the expression.
  const stripped = entry.replace(/^(?:\/\/[^\n]*\n\s*)+/, '');
  const name = /^[$\w]+/.exec(stripped)?.[0];

  if (!name) return null;

  if (cssImportNames.has(name)) return []; // the component's own inline CSS — not a mixin.

  if (name === 'sizeVariantMixin') return resolveSizeVariantEmissions(entry);

  if (Object.hasOwn(STATIC_EMISSIONS, name)) return STATIC_EMISSIONS[name];

  return null;
}

/**
 * `--_*` names the component's own `.ts` source sets directly (never touching any mixin or its
 * own CSS): `style: { '--_x': () => ... }` template bindings, `styleMap({ '--_x': ... })`, and
 * `el.style.setProperty('--_x', ...)`. All three are legitimate, common patterns (e.g.
 * `progress.ts`'s ring math, `icon.ts`'s computed size) — collected file-wide since a JS-set
 * property and the CSS reading it are always in the same component file in current usage.
 */
function findJsSetProperties(source) {
  const names = new Set();
  // Covers `'--_x': ...` object keys (`style: {...}`/`styleMap({...})`), `setProperty('--_x', ...)`,
  // and raw CSS-text template literals (`` `--_x:${value}` ``, e.g. `rating.ts`'s per-star inline
  // style string).
  const pattern = /(?:['"`;{,\s](--_[\w-]+)['"]?\s*:|setProperty\(\s*['"](--_[\w-]+)['"])/g;
  let match;

  while ((match = pattern.exec(source))) names.add(match[1] ?? match[2]);

  return names;
}

/** Resolves one `styles: [...]` array's raw text to its emitted `--_*` set, or `null` to skip it. */
function resolveArrayEmissions(stylesText, cssImportNames) {
  const emitted = new Set();

  for (const entry of splitTopLevel(stylesText)) {
    const result = resolveEntryEmissions(entry, cssImportNames);

    if (result === null) return null; // unrecognized entry — skip conservatively.

    for (const name of result) emitted.add(name);
  }

  return emitted;
}

// ── Per-file check ────────────────────────────────────────────────────────────

function checkFile(filePath) {
  const source = readFileSync(filePath, 'utf8');
  const stylesArrays = extractStylesArrays(source);

  if (stylesArrays.length === 0) return null;

  const cssImportNames = new Set();
  const importPattern = /import\s+(\w+)\s+from\s+['"]([^'"]+\.css\?inline)['"]/g;
  let importMatch;

  while ((importMatch = importPattern.exec(source))) {
    cssImportNames.add(importMatch[1]);
  }

  if (cssImportNames.size === 0) return null; // no inline CSS to check against.

  const jsSetProperties = findJsSetProperties(source);

  // Emissions are unioned across every `styles: [...]` array *in the file*, not scoped to one
  // custom element — sibling elements defined in the same file legitimately inherit `--_*`
  // values via CSS custom-property cascade from a sibling's mixin (e.g. `ore-menu-item`'s CSS
  // reads `--_gap`/`--_font-size` that only `ore-menu`'s own `sizeVariantMixin(...)` call emits;
  // see `MENU_SIZE_PRESET`'s doc comment in `shared/size-presets.ts`). Any unrecognized entry in
  // *any* array bails the whole file, conservatively.
  const emitted = new Set();

  for (const stylesText of stylesArrays) {
    const result = resolveArrayEmissions(stylesText, cssImportNames);

    if (result === null) return null;

    for (const name of result) emitted.add(name);
  }

  const violations = [];

  for (const cssImportName of cssImportNames) {
    const importLine = new RegExp(`import\\s+${cssImportName}\\s+from\\s+['"]([^'"]+)['"]`).exec(source);

    if (!importLine) continue;

    const cssPath = resolve(dirname(filePath), importLine[1].replace(/\?inline$/, ''));

    let cssSource;

    try {
      // Strip `/* ... */` comments first — a declaration or read can sit right after one (e.g. a
      // rationale comment block inside `:host { ... }`), which would otherwise break the
      // "preceded by `;`/`{`" check below.
      cssSource = readFileSync(cssPath, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    } catch {
      continue; // Can't resolve — skip rather than false-positive.
    }

    // A component's own stylesheet may also declare (and consume) a `--_*` variable entirely
    // locally, with no mixin involved (e.g. `card.css` sets its own `--_bg`/`--_border`). That's
    // a legitimate, self-contained pattern — only flag a read covered by *none* of: a mixin
    // emission, a same-file CSS declaration, or a JS-set inline property.
    //
    // KNOWN GAP: cross-*file*, same-directory inheritance (e.g. `list-item.css` reading
    // `--_gap`/`--_font-size`/`--_padding` that only `list.ts`'s own `sizeVariantMixin(...)`
    // call emits, via CSS custom-property cascade from the parent's shadow host into its
    // light-DOM child — see `MENU_SIZE_PRESET`'s doc comment in `shared/size-presets.ts` for the
    // same pattern in reverse, within one file) is NOT modeled here — emissions are only unioned
    // across multiple `define()` blocks *within one file* (`extractStylesArrays`), never across
    // sibling files. Every current cross-file-inherited read happens to carry a `var(x, fallback)`
    // and is therefore exempted below regardless — this gap is dormant, not fixed. Dropping such
    // a fallback (even for a legitimately-inherited, non-broken property) will produce a false
    // positive; if that happens, extend this check to also union sibling `.ts` files' emissions
    // in the same directory rather than assuming the drop is a real typo.
    const localDeclarations = new Set();
    const declPattern = /(?:^|[;{])\s*(--_[\w-]+)\s*:/g;
    let declMatch;

    while ((declMatch = declPattern.exec(cssSource))) localDeclarations.add(declMatch[1]);

    // Only a fallback-less `var(--_x)` is the documented failure mode (AGENTS.md: "falls back
    // to its own `var(..., fallback)` **or to nothing**") — `var(--_x, someFallback)` is a
    // deliberate, self-degrading customization hook, not a broken reference, even when nothing
    // else in the system ever sets `--_x`.
    const readPattern = /var\(\s*(--_[\w-]+)\s*\)/g;
    let readMatch;

    while ((readMatch = readPattern.exec(cssSource))) {
      const propName = readMatch[1];

      if (!emitted.has(propName) && !localDeclarations.has(propName) && !jsSetProperties.has(propName)) {
        violations.push({ cssPath, propName });
      }
    }
  }

  return violations.length > 0 ? violations : null;
}

// ── Entry point ───────────────────────────────────────────────────────────────

function main() {
  const allViolations = [];

  for (const file of walk(SRC_DIR)) {
    const violations = checkFile(file);

    if (violations) {
      for (const v of violations) {
        allViolations.push({ cssPath: v.cssPath, propName: v.propName, sourceFile: file });
      }
    }
  }

  if (allViolations.length === 0) {
    process.stdout.write('[refine] --_* custom-property contract: OK\n');

    return;
  }

  process.stderr.write(`[refine] --_* custom-property contract violations (${allViolations.length}):\n\n`);

  for (const v of allViolations) {
    process.stderr.write(
      `  ${v.cssPath}\n    reads ${v.propName}, but no mixin in ${v.sourceFile}'s styles: [...] emits it\n\n`,
    );
  }

  process.exitCode = 1;
}

main();
