// Verifies the WCAG contrast claims theme-tokens.mjs's comments make (e.g.
// "AA compliant", "AAA compliant") against the literal OKLCH values in the
// token data — a regression guard for exactly the kind of drift that's easy
// to introduce by hand-tuning a family's `base`/`content`/`contrast` numbers
// and forgetting to re-check legibility.
//
// This only exercises the token DATA (theme-tokens.mjs), not the rendered
// CSS: jsdom doesn't parse `@layer` and stubs `getComputedStyle`, so it can't
// resolve `light-dark()`/`oklch(from ...)` the way a real browser would (see
// refine/AGENTS.md "Accessibility testing"). Testing the source-of-truth
// numbers directly, in plain Node with `culori`, sidesteps that limitation
// entirely and needs no browser.
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
// `contrast` previously reading as light ink in light mode — a value copied
// from the page canvas's own direction instead of derived from these
// families' own base.

import { displayable, parse, wcagContrast } from 'culori';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { COLOR_FAMILIES, CONTRAST_SCALE } from '../../../scripts/theme-tokens.mjs';

const themeCss = readFileSync(join(import.meta.dirname, '../theme.css'), 'utf-8');

/**
 * The sRGB-displayable OKLCH chroma ceiling shrinks fast near L0%/L100% and
 * varies a lot by hue — a chroma that's safely in-gamut for a mid-lightness
 * violet can be 2-3x over the ceiling for a near-black amber. Going over
 * doesn't error, it silently renders as a hue-shifted, often
 * near-black-and-red-looking color instead of the intended one (exactly
 * what happened to info/success/warning's dark ink, and to warning's base,
 * before this test existed — see theme-tokens.mjs's module comment).
 */
function expectInGamut(spec: string, label: string) {
  const color = parse(`oklch(${spec})`);

  expect(color, `${label}: could not parse oklch(${spec})`).toBeDefined();
  expect(displayable(color!), `${label}: oklch(${spec}) is outside the sRGB gamut`).toBe(true);
}

function expectResolvedInGamut(color: culoriOklch, label: string) {
  expect(
    displayable(color),
    `${label}: oklch(${color.l * 100}% ${color.c} ${color.h}deg) is outside the sRGB gamut`,
  ).toBe(true);
}

const AA_LARGE_TEXT = 3;
const AA_NORMAL_TEXT = 4.5;
const AAA_NORMAL_TEXT = 7;

/** Matches theming.md's WCAG column: "AAA" needs 7:1, "large-text" needs 3:1, plain "AA" needs 4.5:1. */
function expectedRatio(note: string): number {
  if (note.includes('AAA')) return AAA_NORMAL_TEXT;

  if (note.includes('large-text')) return AA_LARGE_TEXT;

  return AA_NORMAL_TEXT;
}

/** Parses a theme-tokens.mjs "L C H" string (e.g. "56% 0.22 293deg") into an oklch color culori can use. */
function parseOklch(spec: string): culoriOklch {
  const parsed = parse(`oklch(${spec})`);

  if (!parsed) throw new Error(`Could not parse oklch(${spec})`);

  return parsed as culoriOklch;
}

type culoriOklch = { c: number; h?: number; l: number; mode: 'oklch' };

/** Resolves a family's authored `base` to concrete oklch values, substituting its hue knob if it has one. */
function resolveBase(family: (typeof COLOR_FAMILIES)[number]): { dark: culoriOklch; light: culoriOklch } | null {
  if (!family.base) return null; // secondary: base is a color-mix() blend, not resolvable here

  const substitute = (spec: string) =>
    family.hueKnob ? spec.replace(`var(${family.hueKnob.name})`, family.hueKnob.value) : spec;

  return { dark: parseOklch(substitute(family.base.dark)), light: parseOklch(substitute(family.base.light)) };
}

/** Resolves a `content`/`contrast` ink entry (relative to its family's resolved base) to a concrete oklch color. */
function resolveInk(base: culoriOklch, ink: { c?: number; cAbs?: number; l: string }): culoriOklch {
  return { c: ink.cAbs ?? ink.c! * base.c, h: base.h, l: Number.parseFloat(ink.l) / 100, mode: 'oklch' };
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

  // Ink direction (light vs. dark) isn't a pure function of the base's L —
  // a saturated hue at, say, L56% can still read best with light ink, so
  // there's no universal "base L < 50% ⇒ light ink" rule to assert here.
  // What IS a real invariant: `content` and `contrast` are two intensities
  // of the *same* ink for the *same* base, so they must always agree on
  // which side (light or dark) they're on — this is exactly the check that
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

// `base` isn't only a fill behind `content`/`contrast` — button.css's
// bordered/outline/ghost/text variants (and badge/chip/etc.) paint `base`
// itself directly as the text/border color on the page canvas. This is the
// pairing that regressed when neutral/error's light-mode base was
// brightened to match info/success/warning's ink direction (base-vs-canvas
// dropped from ~4.5-5.4:1 to ~3.3-3.6:1, failing AA) — reverted, but only a
// test on the actual pairing prevents it from silently regressing again.
//
// All 7 families invert with scheme now (see theme-tokens.mjs's module
// comment), so this is asserted for every resolvable family — info/
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

// Regression guard for a bug that silently broke every box-shadow-consuming
// hover/focus/halo effect across the whole component library: `light-dark()`
// only accepts <color> arguments (CSS Color 5 spec) — `--shadow-2xs` and
// its siblings used to wrap an *entire* shadow (offset + blur + color) in
// it instead of just the color. Custom properties store arbitrary token
// soup, so the declaration itself never errored; the moment a component
// substituted it into a real `box-shadow`, the value failed to parse and
// silently computed to `none` in spec-compliant browsers (reproduced with
// real headless Chrome — jsdom's stubbed getComputedStyle can't catch this
// at all, hence a source-text check here rather than a rendering one).
// `--halo-shadow-*`/`-focus-shadow` (theme-tokens.mjs-generated) already
// get this right — light-dark() wraps only rgb()/oklch() colors there —
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
