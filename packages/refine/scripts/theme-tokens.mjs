#!/usr/bin/env node
// Source of truth for the generated part of `src/styles/theme.css`: the
// neutral contrast scale, the 7 semantic color families, and their halo
// shadows.
//
// Why generate instead of hand-authoring 7x near-identical CSS blocks: every
// color family (primary/secondary/neutral/info/success/warning/error) needs
// the same 11 derived sub-tokens (backdrop, content, contrast, lighter,
// light, dark, darker, focus, border, focus-shadow, halo-shadow). Hand-typing
// that shape per family means retyping OKLCH lightness/chroma literals up to
// a dozen times per color — they drift, and nothing catches it. Every
// sub-token below is instead derived from ONE authored `base` color via
// OKLCH relative-color syntax (`oklch(from var(--color-x) ...)`), so tuning a
// family (or the shared shade-ramp shape) is a one-line data change instead
// of a multi-line hand edit. `content`/`contrast` stay hand-authored per
// family (light/dark) because whether a family's base sits above or below
// the midpoint lightness flips per family and per color-scheme — that can't
// be derived from a shared delta, it's a genuine per-family design decision.
//
// `content` and `contrast` both mean "ink painted on top of this family's
// own filled surface" (checked real consumers: solid/hover/active button
// states and badge/chip/accordion fills use `contrast`; frost's translucent
// fill and a few default-text cases use `content`) — `contrast` is just the
// more extreme of the two, for fully-opaque fills vs. `content`'s tinted
// ones. Both MUST invert in the same direction: if a family's base is dark
// in a given scheme, both need light ink there; if its base stays bright,
// both need dark ink there. Never author one to track the page canvas
// instead of the family's own base — that's what caused info/success/
// warning's `contrast` to go light-on-light in light mode before this
// comment was written.
//
// All 7 families invert with scheme (dark base in light mode, bright in
// dark mode) and share the same content/contrast shape (light ink, L97%/
// L98%, wherever the base is dark) — requested explicitly: buttons/inputs
// should all read as "light text on a saturated fill" regardless of color,
// not a mix of light-text and dark-text colors depending on which one.
//
// `base` isn't only a fill behind `content`/`contrast` — bordered/outline/
// ghost/text button (and badge/chip/etc.) variants paint `base` ITSELF as
// the text/border color directly on the page canvas. For that pairing to
// clear WCAG AA against a near-white canvas, light-mode base needs to be
// dark enough on its own (roughly L ≤ 56%) — this is a second, independent
// reason every family's light-mode base sits in the low-to-mid 50s, not
// just the light-ink-direction one above.
//
// Info/success/warning previously stayed bright in both schemes (dark ink
// throughout) for two reasons that got overridden by the harmony request
// above: colorblind-friendliness from keeping semantic colors at different
// lightnesses (hue alone still differentiates them, which is how most
// production design systems handle this) and warning's amber identity
// (loses saturation/reads as ochre once dark enough for light ink — see
// warning's own comment). Both are real trade-offs, not non-issues; if the
// harmony call gets revisited, this is what comes back into play.
//
// Every `base`/ink chroma value must also stay inside the sRGB-displayable
// OKLCH gamut for its own L/H — verify with culori's `displayable()` before
// hand-picking a chroma, never eyeball it. The gamut ceiling shrinks fast
// near L0%/L100% and varies a lot by hue (amber/blue/teal are far narrower
// than violet/red there), so "some existing family's chroma ratio/number"
// is not a safe reference point for a different hue or a more extreme L.
// Getting this wrong doesn't error — it silently renders as a hue-shifted,
// often near-black-and-red-looking color instead of the intended one (this
// is exactly what happened to info/success/warning's dark ink at L12-15%,
// and to warning's L74-84% base, before this comment was written).
//
// Run `pnpm run sync:theme` after editing this file to regenerate the block
// inside `src/styles/theme.css` between the GENERATED_BEGIN/END markers.
// `pnpm run check:theme` (wired into `build`) fails if the two have drifted,
// so the generated block is never hand-edited directly — same contract as
// `sync:exports` / `check:manifest` for the export map.

import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// `prettier`/`stylelint` aren't devDependencies of this package — lint/format
// tooling is deliberately root-only in this monorepo (see other packages'
// devDeps). Node's module resolution walks up to the workspace root's
// node_modules and finds them there, same as every other package implicitly
// shares it.
import * as prettier from 'prettier';

const require = createRequire(import.meta.url);
const processRef = globalThis.process;

const __dirname = dirname(fileURLToPath(import.meta.url));
const THEME_CSS_PATH = join(__dirname, '../src/styles/theme.css');

const GENERATED_BEGIN = '  /* ── theme-tokens:generated:begin — run `pnpm run sync:theme`, do not hand-edit ── */';
const GENERATED_END = '  /* ── theme-tokens:generated:end ── */';

// Shared shape every family's shade ramp derives from its `base` color.
// Real CSS custom properties (not just generator constants) so consumers can
// retune the whole ramp at runtime without a rebuild — see `--shade-*` in
// the generated output.
export const SHADE_RAMP = {
  '--shade-lighter-l': '0.3',
  '--shade-lighter-c': '0.35',
  '--shade-light-l': '0.14',
  '--shade-light-c': '0.8',
  '--shade-dark-l': '-0.14',
  '--shade-darker-l': '-0.26',
  '--shade-darker-c': '0.85',
  '--shade-darker-h': '-12',
  '--shade-focus-l': '0.06',
  '--shade-border-alpha': '60%',
  '--shade-focus-ring-strength': '40%',
  '--shade-backdrop-l-light': '93%',
  '--shade-backdrop-l-dark': '24%',
  '--shade-backdrop-c-light': '0.3',
  '--shade-backdrop-c-dark': '0.5',
  '--shade-backdrop-alpha-light': '83%',
  '--shade-backdrop-alpha-dark': '50%',
  '--shade-halo-glow': '15%',
  '--shade-halo-glow-soft': '8%',
};

// 11-step adaptive neutral scale — surfaces (50-400) and text (500-900).
export const CONTRAST_SCALE = [
  { dark: '17% 0.001 250deg', light: '99% 0.001 264deg', note: 'Canvas, page background', step: 50 },
  { dark: '21% 0.001 250deg', light: '97% 0.001 264deg', note: 'Cards, elevated surfaces', step: 100 },
  { dark: '23.5% 0.001 250deg', light: '95.5% 0.001 264deg', note: 'Midpoint — chip base, subtle fills', step: 150 },
  { dark: '26% 0.001 250deg', light: '94% 0.001 264deg', note: 'Nested cards, hover states', step: 200 },
  { dark: '32% 0.001 250deg', light: '89% 0.002 264deg', note: 'Borders, dividers', step: 300 },
  { dark: '40% 0.001 250deg', light: '81% 0.002 264deg', note: 'Disabled backgrounds, subtle UI', step: 400 },
  { dark: '58% 0.001 250deg', light: '49% 0.002 264deg', note: 'Tertiary text - AA large-text compliant', step: 500 },
  { dark: '68% 0.001 250deg', light: '40% 0.002 264deg', note: 'Secondary text - AA compliant', step: 600 },
  { dark: '78% 0.001 250deg', light: '32% 0.002 264deg', note: 'Body text - AAA compliant', step: 700 },
  { dark: '88% 0.001 250deg', light: '22% 0.002 264deg', note: 'Headings - AAA compliant', step: 800 },
  { dark: '95% 0.001 250deg', light: '12% 0.002 264deg', note: 'High contrast text - AAA compliant', step: 900 },
];

// One authored `base` (or `baseRaw` for secondary, whose base is a color-mix
// blend rather than a plain oklch triple) plus two authored ink pairs
// (`content`, `contrast`) per family. Everything else is derived — see the
// module doc comment above.
export const COLOR_FAMILIES = [
  {
    // Reverted a brightened light-mode base (was 64%, briefly): `base`
    // isn't only a fill behind `content`/`contrast` — bordered/outline/
    // ghost/text button (and badge/chip/etc.) variants paint `base` itself
    // directly as the text/border color on the page canvas. At 64% that
    // pairing was 3.27:1 against canvas (fails AA); tightened to 52% for a
    // safer 5.35:1 margin than even the original 56% (4.52:1, thin). See
    // the module comment above for why this makes neutral invert with
    // scheme again instead of matching info/success/warning's direction.
    content: { dark: { c: 0, l: '22%' }, light: { c: 0, l: '99%' } },
    contrast: { dark: { c: 0, l: '13%' }, light: { c: 0, l: '99%' } },
    description: 'True gray — neutral UI surfaces',
    halo: 'flat', // no glassy highlight in dark mode, unlike the branded colors below
    name: 'neutral',
    base: { dark: '72% 0 250deg', light: '52% 0 264deg' },
  },
  {
    // content = ink on the translucent frost fill, contrast = ink on the
    // fully opaque solid fill — contrast stays closer to the true extreme.
    content: { dark: { c: 0.3, l: '22%' }, light: { c: 0.05, l: '97%' } },
    contrast: { dark: { c: 0.3, l: '14%' }, light: { c: 0.045, l: '98%' } },
    description: 'Periwinkle violet — primary brand color',
    hueKnob: { name: '--color-primary-hue', value: '293deg' },
    name: 'primary',
    // Dark-mode chroma capped at 0.148 (was 0.2): oklch's displayable sRGB
    // chroma ceiling at L72% H293deg is ~0.161, so 0.2 was already clipping.
    base: { dark: '72% 0.148 var(--color-primary-hue)', light: '56% 0.22 var(--color-primary-hue)' },
  },
  {
    // Same content-vs-contrast softening as every other family. Secondary's
    // base is even more extreme than primary's (near-black/near-white), so
    // there's at least as much AA headroom to soften `content` into.
    content: { dark: { cAbs: 0.002, l: '22%' }, light: { cAbs: 0.0015, l: '97%' } },
    contrast: { dark: { cAbs: 0.003, l: '13%' }, light: { cAbs: 0.002, l: '98%' } },
    description: 'Ink/charcoal (light) · silver (dark) — auto-derived from --color-primary-hue',
    name: 'secondary',
    // Near-black (light) / near-white (dark) tinted with 14% of the
    // primary color (was 7% — barely perceptible). Analogous-color theory:
    // mixing a trace of the brand hue into an otherwise-neutral ink reads
    // as "related to" primary rather than clashing with it, without
    // secondary stopping being achromatic-reading ink/charcoal. Not a
    // plain oklch(L C H) triple, so it's a raw expression instead of the
    // {light,dark} "L C H" shorthand every other family uses.
    baseRaw: {
      dark: 'color-mix(in oklch, oklch(83% 0 none) 86%, var(--color-primary))',
      light: 'color-mix(in oklch, oklch(20% 0 none) 86%, var(--color-primary))',
    },
  },
  {
    // Light-mode base darkened 60%→54% to match neutral/primary/secondary/
    // error's weight and ink direction (light ink) — requested explicitly
    // twice: buttons/inputs across colors should all read as "light text on
    // a saturated fill" for visual harmony, not a mix of light and dark
    // text depending on color. This drops the lightness-spread-for-
    // colorblind-differentiation idea tried earlier in favor of that
    // consistency; hue alone still differentiates info/success/warning/
    // error from each other, which is how most production design systems
    // (Material, Tailwind, Bootstrap) do it anyway.
    // Light-mode hue shifted 230deg→255deg (cyan-blue → blue): at L~54%,
    // the sRGB chroma ceiling isn't flat across hue — cyan(230) sits in a
    // trough (~0.11), blue(255) is on a rising slope (~0.17), ~55% more
    // headroom for the same AA constraints. This is the same "wrong hue
    // for this lightness reads as muted no matter how you tune it" fix
    // applied to warning, generalized to the whole bright→dark set at
    // once, per request. Dark mode (L74%) keeps 230deg — its own ceiling
    // there doesn't have the same trough, no reason to change it.
    content: { dark: { cAbs: 0.024, l: '15%' }, light: { cAbs: 0.0122, l: '97%' } },
    contrast: { dark: { cAbs: 0.019, l: '12%' }, light: { cAbs: 0.0081, l: '98%' } },
    description: 'Blue (light mode) · cyan-blue (dark mode) — informational messages',
    name: 'info',
    base: { dark: '74% 0.133 230deg', light: '54% 0.169 255deg' },
  },
  {
    // Same reasoning as info. Light-mode hue shifted 160deg (teal) →
    // 137deg (green) — teal is in this lightness's chroma trough (~0.10),
    // green is near its local peak (~0.14). L nudged 54%→53% too: at
    // 137deg specifically, 54% left content.light's margin thinner
    // (4.46:1, just under AA) than the other 3 — 53% restores the same
    // ~4.5-4.9 margin band as info/error/warning. Dark mode (L78%, 160deg)
    // unchanged.
    content: { dark: { cAbs: 0.027, l: '15%' }, light: { cAbs: 0.0494, l: '97%' } },
    contrast: { dark: { cAbs: 0.022, l: '12%' }, light: { cAbs: 0.0323, l: '98%' } },
    description: 'Green (light mode) · teal (dark mode) — positive outcomes & confirmations',
    name: 'success',
    base: { dark: '78% 0.14 160deg', light: '53% 0.145 137deg' },
  },
  {
    // Same reasoning as info/success, with one honest caveat: warning's
    // hue family (yellow, ~65-100deg) sits in this lightness's chroma
    // TROUGH no matter which yellow-ish hue you pick (checked the whole
    // range) — yellow's own chroma peaks at high L (dark mode's 84% base
    // benefits from staying at 70deg amber), not at the ~54% light mode
    // needs for AA. 70deg (amber, matching dark mode's own hue) turns out
    // to be at the better edge of that trough anyway (C=0.111 vs. gold's
    // 95deg at C=0.105) — every other family here got a real "wrong hue
    // for this L" fix; this one is "least-wrong hue", warning is
    // structurally the least saturated of the 4 at this lightness and
    // that isn't fixable by hue alone.
    content: { dark: { cAbs: 0.026, l: '15%' }, light: { cAbs: 0.0184, l: '97%' } },
    contrast: { dark: { cAbs: 0.021, l: '12%' }, light: { cAbs: 0.0122, l: '98%' } },
    description: 'Amber — cautionary states & alerts',
    name: 'warning',
    base: { dark: '84% 0.113 70deg', light: '54% 0.111 70deg' },
  },
  {
    // Reverted a brightened light-mode base (was 64%): same bug as
    // neutral's — `base` is painted directly as bordered/outline/ghost/
    // text button text/border color on the page canvas, not just as a fill
    // behind content/contrast. At 64% that pairing was 3.63:1 against
    // canvas (fails AA); back to the original 54% (5.44:1). Same L22/L14
    // (dark)/L97/L98 (light) shape as primary — error inverts with scheme
    // again, like primary/secondary/neutral.
    content: { dark: { cAbs: 0.077, l: '22%' }, light: { cAbs: 0.0125, l: '97%' } },
    contrast: { dark: { cAbs: 0.052, l: '14%' }, light: { cAbs: 0.0088, l: '98%' } },
    description: 'Vermilion — destructive actions & errors',
    name: 'error',
    base: { dark: '66% 0.18 29deg', light: '54% 0.2 29deg' },
  },
];

const ink = (colorVar, { l, c, cAbs }) =>
  `oklch(from ${colorVar} ${l} ${cAbs === undefined ? `calc(c * ${c})` : cAbs} h)`;

function familyBlock({ name, base, baseRaw, hueKnob, content, contrast, description }) {
  const colorVar = `var(--color-${name})`;
  const title = `${name[0].toUpperCase()}${name.slice(1)}`;
  const lines = [`    /* ── ${title} — ${description} ── */`];

  if (hueKnob) lines.push(`    ${hueKnob.name}: ${hueKnob.value};`, '');

  const [baseLight, baseDark] = baseRaw
    ? [baseRaw.light, baseRaw.dark]
    : [`oklch(${base.light})`, `oklch(${base.dark})`];

  lines.push(`    --color-${name}: light-dark(${baseLight}, ${baseDark});`);
  lines.push(
    `    --color-${name}-backdrop: light-dark(`,
    `      oklch(from ${colorVar} var(--shade-backdrop-l-light) calc(c * var(--shade-backdrop-c-light)) h / var(--shade-backdrop-alpha-light)),`,
    `      oklch(from ${colorVar} var(--shade-backdrop-l-dark) calc(c * var(--shade-backdrop-c-dark)) h / var(--shade-backdrop-alpha-dark))`,
    `    );`,
  );
  lines.push(
    `    --color-${name}-content: light-dark(${ink(colorVar, content.light)}, ${ink(colorVar, content.dark)});`,
    `    --color-${name}-contrast: light-dark(${ink(colorVar, contrast.light)}, ${ink(colorVar, contrast.dark)});`,
  );
  lines.push(
    `    --color-${name}-lighter: oklch(from ${colorVar} clamp(0, calc(l + var(--shade-lighter-l)), 1) calc(c * var(--shade-lighter-c)) h);`,
    `    --color-${name}-light: oklch(from ${colorVar} clamp(0, calc(l + var(--shade-light-l)), 1) calc(c * var(--shade-light-c)) h);`,
    `    --color-${name}-dark: oklch(from ${colorVar} clamp(0, calc(l + var(--shade-dark-l)), 1) c h);`,
    `    --color-${name}-darker: oklch(from ${colorVar} clamp(0, calc(l + var(--shade-darker-l)), 1) calc(c * var(--shade-darker-c)) calc(h + var(--shade-darker-h)));`,
    `    --color-${name}-focus: oklch(from ${colorVar} clamp(0, calc(l + var(--shade-focus-l)), 1) c h);`,
    `    --color-${name}-border: oklch(from ${colorVar} l c h / var(--shade-border-alpha));`,
    `    --color-${name}-focus-shadow:`,
    `      0 0 0 4px color-mix(in oklch, ${colorVar} var(--shade-focus-ring-strength), transparent), var(--shadow-sm);`,
  );

  return lines.join('\n');
}

function haloShadowLine(name, halo) {
  const colorVar = `var(--color-${name})`;
  const insetHighlight =
    halo === 'flat'
      ? 'inset 0 1px 1px light-dark(rgb(0 0 0 / 5%), rgb(0 0 0 / 15%)),\n      0 0 var(--size-1) light-dark(rgb(255 255 255 / 10%), rgb(0 0 0 / 20%)) inset,'
      : 'inset 0 1px 1px light-dark(rgb(0 0 0 / 5%), rgb(255 255 255 / 3%)),\n      0 0 var(--size-1) light-dark(rgb(255 255 255 / 10%), rgb(255 255 255 / 12%)) inset,';

  return [
    `    --halo-shadow-${name}:`,
    `      ${insetHighlight}`,
    `      0 var(--size-2) var(--size-6) color-mix(in oklch, ${colorVar} var(--shade-halo-glow), transparent),`,
    `      0 var(--size-1) var(--size-3) color-mix(in oklch, ${colorVar} var(--shade-halo-glow-soft), transparent);`,
  ].join('\n');
}

function generate() {
  const contrastLines = CONTRAST_SCALE.map(
    ({ step, light, dark, note }) =>
      `    --color-contrast-${step}: light-dark(oklch(${light}), oklch(${dark})); /* ${note} */`,
  );

  const shadeRampLines = Object.entries(SHADE_RAMP).map(([name, value]) => `    ${name}: ${value};`);

  const haloLines = COLOR_FAMILIES.map((f) => haloShadowLine(f.name, f.halo ?? 'glow'));

  const familyLines = COLOR_FAMILIES.map(familyBlock);

  return [
    '    /* ── Contrast scale — Neutral OKLCH with a lifted, non-pure-black Dark Mode baseline ── */',
    ...contrastLines,
    '',
    '    --color-canvas: color-mix(in oklch, var(--color-contrast-50) 85%, transparent);',
    '    --color-divider: color-mix(in oklch, var(--color-contrast-300) 85%, transparent);',
    '    --color-contrast: color-mix(in oklch, var(--color-contrast-900) 85%, transparent);',
    '',
    '    /* ── Shade ramp — shared derivation recipe for every color family below ──── */',
    '    /* Every family only authors a `base` (+ content/contrast ink pair); every  */',
    '    /* other sub-token is `oklch(from var(--color-x) ...)`, derived from that   */',
    '    /* single base using the deltas below. Tune a family by editing its base;   */',
    '    /* tune the ramp shape itself (e.g. how much lighter "-lighter" is) here,    */',
    '    /* once, for all 7 families at once. */',
    ...shadeRampLines,
    '',
    '    /* ── Halo shadows — branded glow per color family ───────────────────────── */',
    ...haloLines,
    '',
    ...familyLines.flatMap((block, i) => (i === 0 ? [block] : ['', block])),
  ].join('\n');
}

function withGeneratedBlock(source, block) {
  const begin = source.indexOf(GENERATED_BEGIN);
  const end = source.indexOf(GENERATED_END);

  if (begin === -1 || end === -1) {
    throw new Error(`theme.css is missing the generated-block markers:\n${GENERATED_BEGIN}\n${GENERATED_END}`);
  }

  return `${source.slice(0, begin + GENERATED_BEGIN.length)}\n${block}\n${source.slice(end)}`;
}

function stylelintFix(source) {
  // Written next to the real file (not os.tmpdir()) so stylelint's config
  // lookup resolves the same `stylelint.config.ts` a normal `pnpm lint:css`
  // run would use for this file.
  const tmpPath = `${THEME_CSS_PATH}.sync-tmp.${processRef.pid}`;
  const stylelintBin = join(
    dirname(require.resolve('stylelint/package.json')),
    require('stylelint/package.json').bin.stylelint,
  );

  writeFileSync(tmpPath, source);

  try {
    execFileSync(processRef.execPath, [stylelintBin, tmpPath, '--fix'], { stdio: 'ignore' });
  } catch {
    // Non-zero exit means unfixable violations remain — surface whatever
    // stylelint managed to fix so `check` reports a concrete diff instead of
    // crashing; any leftover violation still fails the repo's normal lint step.
  }

  const fixed = readFileSync(tmpPath, 'utf8');

  rmSync(tmpPath);

  return fixed;
}

async function formatCss(source) {
  const options = (await prettier.resolveConfig(THEME_CSS_PATH)) ?? {};
  const pretty = await prettier.format(source, { ...options, filepath: THEME_CSS_PATH });

  return stylelintFix(pretty);
}

async function main(command) {
  const source = readFileSync(THEME_CSS_PATH, 'utf8');
  const nextSource = await formatCss(withGeneratedBlock(source, generate()));

  if (command === 'check') {
    if (source !== nextSource) {
      console.error('theme.css is out of sync with theme-tokens.mjs — run `pnpm run sync:theme`.');
      processRef.exit(1);
    }

    console.log('theme.css matches theme-tokens.mjs.');
  } else if (command === 'sync' || command === undefined) {
    writeFileSync(THEME_CSS_PATH, nextSource);
    console.log('Wrote generated color tokens to src/styles/theme.css.');
  } else {
    console.error(`Unknown command "${command}". Use "sync" or "check".`);
    processRef.exit(1);
  }
}

// Guard the CLI entry point so importing this module for its exported data
// (e.g. from the contrast-ratio test) never triggers the sync/check side effects.
if (processRef.argv[1] === fileURLToPath(import.meta.url)) {
  await main(processRef.argv[2]);
}
