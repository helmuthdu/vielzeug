/** See `theme-tokens.mjs` — this declares the shape of its data exports for TS consumers. */

export declare const SHADE_RAMP: Record<string, string>;

export interface ContrastStep {
  dark: string;
  light: string;
  note: string;
  step: number;
}

export declare const CONTRAST_SCALE: ContrastStep[];

export interface ColorInk {
  c?: number;
  cAbs?: number;
  l: string;
}

export interface ColorFamily {
  base?: { dark: string; light: string };
  baseRaw?: { dark: string; light: string };
  content: { dark: ColorInk; light: ColorInk };
  contrast: { dark: ColorInk; light: ColorInk };
  description: string;
  halo?: string;
  hueKnob?: { name: string; value: string };
  name: string;
}

export declare const COLOR_FAMILIES: ColorFamily[];
