// Verifies the WCAG contrast claims theme-tokens.mjs's comments make (e.g.
// "AA compliant", "AAA compliant") against the literal OKLCH values in the
// token data: a regression guard for exactly the kind of drift that's easy
// to introduce by hand-tuning a family's `base`/`content`/`contrast` numbers
// and forgetting to re-check legibility.
//
// This only exercises the token DATA (theme-tokens.mjs), not the rendered
// CSS: jsdom doesn't parse `@layer` and stubs `getComputedStyle`, so it can't
// resolve `light-dark()`/`oklch(from ...)` the way a real browser would (see
// refine/AGENTS.md "Accessibility testing"). Testing the source-of-truth
// numbers directly, in plain Node with `@vielzeug/palette`, sidesteps that
// limitation entirely and needs no browser.
//
// `secondary` is skipped: its `base` is a `color-mix()` blend with
// `--color-primary` (not a plain oklch triple), which can't be resolved to
// concrete numbers without a browser's color-mix implementation.
//
// Both `content` and `contrast` are checked against their family's `base`:
// real consumers use both as ink painted directly on top of that family's
// own filled surface (solid/hover/active button states, badges, chips, and
// accordion fills use `contrast`; frost's translucent fill uses `content`).
// This is the exact check that would have caught info/success/warning's
// `contrast` previously reading as light ink in light mode: a value copied
// from the page canvas's own direction instead of derived from these
// families' own base.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  contrastRatio,
  isDisplayable,
  type Oklch,
  oklchToSrgb,
  parseColor,
  type Rgba,
  srgbToOklch,
} from '@vielzeug/palette';
import { describe, expect, it } from 'vitest';

import { COLOR_FAMILIES, CONTRAST_SCALE } from '../../../scripts/theme-tokens.mjs';

const themeCss = readFileSync(join(import.meta.dirname, '../theme.css'), 'utf-8');

/**
 * The sRGB-displayable OKLCH chroma ceiling shrinks fast near L0%/L100% and
 * varies a lot by hue: a chroma that's safely in-gamut for a mid-lightness
 * violet can be 2-3x over the ceiling for a near-black amber. Going over
 * doesn't error, it silently renders as a hue-shifted, often
 * near-black-and-red-looking color instead of the intended one (exactly
 * what happened to info/success/warning's dark ink, and to warning's base,
 * before this test existed: see theme-tokens.mjs's module comment).
 */
function expectInGamut(spec: string, label: string) {
  // `parseColor` is lossless (extended-range sRGB), so the parsed Rgba still
  // carries the authored out-of-gamut channels and `isDisplayable` sees them.
  expect(isDisplayable(parseColor(`oklch(${spec})`)), `${label}: oklch(${spec}) is outside the sRGB gamut`).toBe(true);
}

function expectResolvedInGamut(color: Oklch, label: string) {
  expect(
    isDisplayable(oklchToSrgb(color)),
    `${label}: oklch(${color.l * 100}% ${color.c} ${color.h}deg) is outside the sRGB gamut`,
  ).toBe(true);
}

/** WCAG contrast between two OKLCH colors, computed on their sRGB representations. */
function wcagContrast(a: Oklch, b: Oklch): number {
  return contrastRatio(oklchToSrgb(a), oklchToSrgb(b));
}

const AA_LARGE_TEXT = 3;
const AA_NORMAL_TEXT = 4.5;
const AAA_NORMAL_TEXT = 7;
const CHROMATIC_ROLE_NAMES = new Set(['primary', 'info', 'success', 'warning', 'error']);
const VISION_LIGHTNESS_PAIRS = [
  ['primary', 'info'],
  ['error', 'success'],
  ['primary', 'success'],
] as const;

type MachadoMatrix = readonly [
  readonly [number, number, number],
  readonly [number, number, number],
  readonly [number, number, number],
];

const MACHADO_SEVERITY_1: readonly { matrix: MachadoMatrix; name: string }[] = [
  {
    matrix: [
      [0.152286, 1.052583, -0.204868],
      [0.114503, 0.786281, 0.099216],
      [-0.003882, -0.048116, 1.051998],
    ],
    name: 'protan',
  },
  {
    matrix: [
      [0.367322, 0.860646, -0.227968],
      [0.280085, 0.672501, 0.047413],
      [-0.01182, 0.04294, 0.968881],
    ],
    name: 'deutan',
  },
];

/** Matches theming.md's WCAG column: "AAA" needs 7:1, "large-text" needs 3:1, plain "AA" needs 4.5:1. */
function expectedRatio(note: string): number {
  if (note.includes('AAA')) return AAA_NORMAL_TEXT;

  if (note.includes('large-text')) return AA_LARGE_TEXT;

  return AA_NORMAL_TEXT;
}

/**
 * Parses a theme-tokens.mjs "L C H" string (e.g. "38% 0.14 300deg") into an
 * Oklch. The triple is kept raw because callers compose Oklch values directly
 * (ink derived from a base's hue/chroma); `parseColor` still runs to validate
 * the syntax and throws on anything malformed.
 */
function parseOklch(spec: string): Oklch {
  parseColor(`oklch(${spec})`);

  const [l, c, h] = spec.trim().split(/\s+/);

  if (!l || !c || !h) throw new Error(`Could not parse oklch(${spec})`);

  return { a: 1, c: Number.parseFloat(c), h: Number.parseFloat(h), l: Number.parseFloat(l) / 100 };
}

/** Resolves a family's authored `base` to concrete oklch values, substituting its hue knob if it has one. */
function resolveBase(family: (typeof COLOR_FAMILIES)[number]): { dark: Oklch; light: Oklch } | null {
  if (!family.base) return null; // secondary: base is a color-mix() blend, not resolvable here

  const substitute = (spec: string) =>
    family.hueKnob ? spec.replace(`var(${family.hueKnob.name})`, family.hueKnob.value) : spec;

  return { dark: parseOklch(substitute(family.base.dark)), light: parseOklch(substitute(family.base.light)) };
}

/** Resolves a `content`/`contrast` ink entry (relative to its family's resolved base) to a concrete oklch color. */
function resolveInk(base: Oklch, ink: { c?: number; cAbs?: number; l: string }): Oklch {
  return { a: 1, c: ink.cAbs ?? ink.c! * base.c, h: base.h, l: Number.parseFloat(ink.l) / 100 };
}

function linearizeChannel(channel: number): number {
  const value = channel / 255;

  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function encodeChannel(channel: number): number {
  const value = Math.max(0, Math.min(1, channel));
  const encoded = value <= 0.0031308 ? value * 12.92 : 1.055 * value ** (1 / 2.4) - 0.055;

  return encoded * 255;
}

function simulateMachado(color: Rgba, matrix: MachadoMatrix): Rgba {
  const r = linearizeChannel(color.r);
  const g = linearizeChannel(color.g);
  const b = linearizeChannel(color.b);

  const transform = (row: MachadoMatrix[number]) => row[0] * r + row[1] * g + row[2] * b;

  return {
    a: color.a,
    b: encodeChannel(transform(matrix[2])),
    g: encodeChannel(transform(matrix[1])),
    r: encodeChannel(transform(matrix[0])),
  };
}

function oklabDeltaE(a: Rgba, b: Rgba): number {
  const first = srgbToOklch(a);
  const second = srgbToOklch(b);
  const firstAngle = (first.h * Math.PI) / 180;
  const secondAngle = (second.h * Math.PI) / 180;

  return Math.hypot(
    first.l - second.l,
    first.c * Math.cos(firstAngle) - second.c * Math.cos(secondAngle),
    first.c * Math.sin(firstAngle) - second.c * Math.sin(secondAngle),
  );
}

describe('contrast scale (--color-contrast-*)', () => {
  const canvas = { dark: parseOklch(CONTRAST_SCALE[0].dark), light: parseOklch(CONTRAST_SCALE[0].light) };

  it.each(CONTRAST_SCALE.filter((step) => step.note.includes('compliant')))(
    'step $step ($note) meets the ratio its own comment claims',
    ({ dark, light, note, step }) => {
      const expected = expectedRatio(note);

      expect(
        wcagContrast(canvas.light, parseOklch(light)),
        `contrast-${step} vs canvas, light mode`,
      ).toBeGreaterThanOrEqual(expected);
      expect(
        wcagContrast(canvas.dark, parseOklch(dark)),
        `contrast-${step} vs canvas, dark mode`,
      ).toBeGreaterThanOrEqual(expected);
    },
  );
});

describe('gamut safety (--color-contrast-*)', () => {
  it.each(CONTRAST_SCALE)('step $step stays inside the sRGB gamut in both color schemes', ({ dark, light, step }) => {
    expectInGamut(light, `contrast-${step} light`);
    expectInGamut(dark, `contrast-${step} dark`);
  });
});

describe('gamut safety (--color-{family}-*)', () => {
  const resolvableBases = COLOR_FAMILIES.filter((family) => resolveBase(family) !== null);

  it.each(resolvableBases)('$name base stays inside the sRGB gamut in both color schemes', (family) => {
    const base = resolveBase(family)!;

    expectResolvedInGamut(base.light, `${family.name} base light`);
    expectResolvedInGamut(base.dark, `${family.name} base dark`);
  });

  it.each(resolvableBases)('$name content/contrast ink stays inside the sRGB gamut in both color schemes', (family) => {
    const base = resolveBase(family)!;

    for (const mode of ['light', 'dark'] as const) {
      for (const slot of ['content', 'contrast'] as const) {
        expectResolvedInGamut(resolveInk(base[mode], family[slot][mode]), `${family.name} ${slot} ${mode}`);
      }
    }
  });
});

describe('color family ink (--color-{family}-content / -contrast)', () => {
  const resolvable = COLOR_FAMILIES.filter((family) => resolveBase(family) !== null);

  it.each(resolvable)('$name content and contrast both read at WCAG AA against its own base', (family) => {
    const base = resolveBase(family)!;

    for (const mode of ['light', 'dark'] as const) {
      for (const slot of ['content', 'contrast'] as const) {
        const ink = resolveInk(base[mode], family[slot][mode]);

        expect(wcagContrast(base[mode], ink), `${family.name} ${slot} vs base, ${mode} mode`).toBeGreaterThanOrEqual(
          AA_NORMAL_TEXT,
        );
      }
    }
  });

  // Ink direction (light vs. dark) isn't a pure function of the base's L :
  // a saturated hue at, say, L56% can still read best with light ink, so
  // there's no universal "base L < 50% ⇒ light ink" rule to assert here.
  // What IS a real invariant: `content` and `contrast` are two intensities
  // of the *same* ink for the *same* base, so they must always agree on
  // which side (light or dark) they're on: this is exactly the check that
  // would have caught info/success/warning's `contrast` disagreeing with
  // `content` before this file's fix.
  it.each(resolvable)('$name content and contrast agree on ink direction, in both color schemes', (family) => {
    const isLightInk = (mode: 'dark' | 'light', slot: 'content' | 'contrast') =>
      Number.parseFloat(family[slot][mode].l) > 50;

    for (const mode of ['light', 'dark'] as const) {
      expect(
        isLightInk(mode, 'contrast'),
        `${family.name} content/contrast disagree on ink direction in ${mode} mode`,
      ).toBe(isLightInk(mode, 'content'));
    }
  });

  it('covers every non-secondary family (fails loudly if a family is added without ink data)', () => {
    expect(resolvable.map((f) => f.name)).toEqual(
      COLOR_FAMILIES.filter((f) => f.name !== 'secondary').map((f) => f.name),
    );
  });
});

// `base` isn't only a fill behind `content`/`contrast`: button.css's
// bordered/outline/ghost/text variants (and badge/chip/etc.) paint `base`
// itself directly as the text/border color on the page canvas. This is the
// pairing that regressed when neutral/error's light-mode base was
// brightened to match info/success/warning's ink direction (base-vs-canvas
// dropped from ~4.5-5.4:1 to ~3.3-3.6:1, failing AA): reverted, but only a
// test on the actual pairing prevents it from silently regressing again.
//
// All 7 families invert with scheme now (see theme-tokens.mjs's module
// comment), so this is asserted for every resolvable family: info/
// success/warning used to be a known, pre-existing exception here (their
// base stayed bright, so this pairing was marginal for them); that's no
// longer true, and the exception was removed rather than left stale.
describe('base as standalone text/border color (--color-{family}, bordered/outline/ghost/text variants)', () => {
  const canvas = { dark: parseOklch(CONTRAST_SCALE[0].dark), light: parseOklch(CONTRAST_SCALE[0].light) };
  const resolvable = COLOR_FAMILIES.filter((family) => resolveBase(family) !== null);

  it.each(resolvable)('$name base reads at WCAG AA directly on the canvas, in both color schemes', (family) => {
    const base = resolveBase(family)!;

    expect(wcagContrast(canvas.light, base.light), `${family.name} base vs canvas, light mode`).toBeGreaterThanOrEqual(
      AA_NORMAL_TEXT,
    );
    expect(wcagContrast(canvas.dark, base.dark), `${family.name} base vs canvas, dark mode`).toBeGreaterThanOrEqual(
      AA_NORMAL_TEXT,
    );
  });
});

describe('chromatic role separation under color-vision simulation', () => {
  const families = COLOR_FAMILIES.filter((family) => CHROMATIC_ROLE_NAMES.has(family.name));

  it('covers every chromatic role', () => {
    expect(families.map((family) => family.name).sort()).toEqual(['error', 'info', 'primary', 'success', 'warning']);
  });

  it.each(['light', 'dark'] as const)('%s mode separates every chromatic role pair', (mode) => {
    const bases = families.map((family) => {
      const base = resolveBase(family);

      if (!base) throw new Error(`${family.name} must have a resolvable base`);

      return { color: oklchToSrgb(base[mode]), lightness: base[mode].l, name: family.name };
    });

    for (const { matrix, name: vision } of MACHADO_SEVERITY_1) {
      const simulated = bases.map(({ color }) => simulateMachado(color, matrix));

      for (let first = 0; first < bases.length; first++) {
        for (let second = first + 1; second < bases.length; second++) {
          const firstBase = bases[first];
          const secondBase = bases[second];
          const firstSimulated = simulated[first];
          const secondSimulated = simulated[second];

          if (!firstBase || !secondBase || !firstSimulated || !secondSimulated) {
            throw new Error('Expected every color-vision role pair to have source and simulated colors');
          }

          expect(
            oklabDeltaE(firstSimulated, secondSimulated),
            `${firstBase.name} vs ${secondBase.name}, ${mode} mode, ${vision}`,
          ).toBeGreaterThanOrEqual(0.08);
        }
      }
    }

    for (const [firstName, secondName] of VISION_LIGHTNESS_PAIRS) {
      const first = bases.find((base) => base.name === firstName);
      const second = bases.find((base) => base.name === secondName);

      if (!first || !second) throw new Error(`Missing color-vision role pair: ${firstName}/${secondName}`);

      expect(
        Math.abs(first.lightness - second.lightness),
        `${firstName} vs ${secondName}, ${mode} mode`,
      ).toBeGreaterThanOrEqual(0.15);
    }
  });
});

// Regression guard for a bug that silently broke every box-shadow-consuming
// hover/focus/halo effect across the whole component library: `light-dark()`
// only accepts <color> arguments (CSS Color 5 spec): `--shadow-2xs` and
// its siblings used to wrap an *entire* shadow (offset + blur + color) in
// it instead of just the color. Custom properties store arbitrary token
// soup, so the declaration itself never errored; the moment a component
// substituted it into a real `box-shadow`, the value failed to parse and
// silently computed to `none` in spec-compliant browsers (reproduced with
// real headless Chrome: jsdom's stubbed getComputedStyle can't catch this
// at all, hence a source-text check here rather than a rendering one).
// `--halo-shadow-*`/`-focus-shadow` (theme-tokens.mjs-generated) already
// get this right: light-dark() wraps only rgb()/oklch() colors there :
// this only guards the hand-authored Box Shadows/Inset Shadows block.
describe('shadow tokens (--shadow-*, --inset-shadow-*)', () => {
  it('light-dark() wraps only a color, never a full shadow (offset/blur/spread)', () => {
    // A digit or the `inset` keyword directly inside light-dark(...) means an
    // offset/blur/spread value leaked into an argument that must be a <color>.
    const wrapsNonColor = /light-dark\(\s*(?:-?[\d.]|inset\b)/g;
    const offenders = [...themeCss.matchAll(wrapsNonColor)].map((m) => m[0]);

    expect(offenders, `light-dark() called with a non-color argument: ${JSON.stringify(offenders)}`).toHaveLength(0);
  });
});

// Every --halo-shadow-* paints its depth with an inset top edge, and in dark mode that
// edge has to be light or absent. Neutral used to paint `rgb(0 0 0 / 15%)` + a
// `rgb(0 0 0 / 20%)` inset there (theme-tokens.mjs's `halo: 'flat'`), which reads as a
// dirty seam rather than depth: neutral is the one family whose `base` inverts with the
// scheme (bordered/outline/ghost/text and badge/chip paint `base` directly as
// text/border on the canvas, so it must stay dark in light mode), which means its dark
// mode fill is a LIGHT gray. A dark inner edge on a light fill is the artifact users
// reported on the neutral solid button's top edge on hover.
describe('halo tokens (--halo-shadow-*)', () => {
  it('never paints a dark inset edge in dark mode', () => {
    const blocks = [...themeCss.matchAll(/--halo-shadow-[\w-]+:\s*([^;]+);/g)];

    expect(blocks.length).toBeGreaterThan(0);

    const offenders: string[] = [];

    for (const [, value] of blocks) {
      for (const layer of value.split(',\n').map((l) => l.trim())) {
        if (!layer.includes('inset')) continue;
        // The dark-mode branch is light-dark()'s second argument.
        const darkBranch = layer.match(/light-dark\([^,]+,\s*([^)]+)\)/)?.[1]?.trim();

        if (darkBranch && /^rgb\(0 0 0/.test(darkBranch)) offenders.push(`${layer} -> ${darkBranch}`);
      }
    }

    expect(offenders, `dark inset edge in dark mode: ${JSON.stringify(offenders)}`).toEqual([]);
  });
});
