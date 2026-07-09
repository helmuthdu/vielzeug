// Type declarations for theme-tokens.mjs's exported data (the generator
// script itself stays plain JS — see the file's own doc comment for why).
// Consumed by the contrast-ratio test; kept minimal on purpose, this isn't a
// public package export.

export interface ContrastStep {
  dark: string;
  light: string;
  note: string;
  step: number;
}

export interface InkChannel {
  /** Chroma as a ratio of the family's resolved base chroma. Mutually exclusive with `cAbs`. */
  c?: number;
  /** Absolute chroma, used when a family's base chroma isn't a meaningful ratio base (e.g. secondary). */
  cAbs?: number;
  /** Target OKLCH lightness, e.g. `'98%'`. */
  l: string;
}

export interface ColorFamily {
  base?: { dark: string; light: string };
  baseRaw?: { dark: string; light: string };
  content: { dark: InkChannel; light: InkChannel };
  contrast: { dark: InkChannel; light: InkChannel };
  description: string;
  halo?: 'flat' | 'glow';
  hueKnob?: { name: string; value: string };
  name: string;
}

export const SHADE_RAMP: Record<string, string>;
export const CONTRAST_SCALE: ContrastStep[];
export const COLOR_FAMILIES: ColorFamily[];
