export type EasingFn = (t: number) => number;

/** Overshoot coefficient behind CSS `cubic-bezier(.34, 1.56, .64, 1)`. */
const BACK_OVERSHOOT = 1.70158;

/**
 * The named curves a {@link TransitionConfig} can select. The `ease-*` curves are cubic,
 * matching the feel of the CSS easing keywords; `expo-out` decelerates hard for data
 * reveals and `back-out` overshoots slightly for bar entrances.
 */
export const easings = {
  'back-out': (t: number) => 1 + (BACK_OVERSHOOT + 1) * (t - 1) ** 3 + BACK_OVERSHOOT * (t - 1) ** 2,
  'ease-in': (t: number) => t * t * t,
  'ease-in-out': (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
  'ease-out': (t: number) => 1 - (1 - t) ** 3,
  'expo-out': (t: number) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t)),
  linear: (t: number) => t,
} satisfies Record<string, EasingFn>;

/** The literal names {@link resolveEasing} accepts, derived from {@link easings}. */
export type EasingName = keyof typeof easings;

export function resolveEasing(easing: string | ((t: number) => number) | undefined): EasingFn {
  if (typeof easing === 'function') return easing;

  // `Object.hasOwn` guards against `easing` being a prototype-chain key (e.g. `'__proto__'`,
  // `'constructor'`): a plain bracket lookup on those would silently resolve to an
  // `Object.prototype` value instead of `undefined`, which is either not callable (throws)
  // or callable but not an easing function (produces garbage interpolation).
  if (easing !== undefined && Object.hasOwn(easings, easing)) {
    return (easings as Record<string, EasingFn>)[easing];
  }

  return easings['ease-out'];
}
