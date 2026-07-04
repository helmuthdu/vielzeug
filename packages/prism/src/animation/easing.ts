export type EasingFn = (t: number) => number;

export const easings: Record<string, EasingFn> = {
  'ease-in': (t) => t * t,
  'ease-in-out': (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  'ease-out': (t) => 1 - (1 - t) * (1 - t),
  linear: (t) => t,
};

export function resolveEasing(easing: string | ((t: number) => number) | undefined): EasingFn {
  if (typeof easing === 'function') return easing;

  // `Object.hasOwn` guards against `easing` being a prototype-chain key (e.g. `'__proto__'`,
  // `'constructor'`) — a plain bracket lookup on those would silently resolve to an
  // `Object.prototype` value instead of `undefined`, which is either not callable (throws)
  // or callable but not an easing function (produces garbage interpolation).
  if (easing !== undefined && Object.hasOwn(easings, easing)) return easings[easing];

  return easings['ease-out'];
}
