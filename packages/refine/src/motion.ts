/**
 * App-level motion mode, mirroring `@vielzeug/necromancer`'s `MotionMode`:
 * the operating-system preference is the default, and an application with its
 * own "reduce motion" setting can force either direction.
 *
 * The mode is one attribute on `<html>` (`data-motion`), which the Reduced
 * Motion block in `theme.css` reads: `'reduced'` zeroes every duration and
 * transition token and switches the `--_motion-*` escape hatches to `none`,
 * `'full'` opts back in despite an OS-level reduction, and `'system'` (the
 * default) removes the attribute. Because the tokens drive every CSS
 * animation and transition in the library, one call restyles all motion.
 *
 * @example
 * ```ts
 * import { setMotionMode } from '@vielzeug/refine';
 *
 * setMotionMode('reduced'); // app setting forces reduction
 * setMotionMode('system'); // back to following the OS preference
 * ```
 */
export const MOTION_MODES = ['full', 'reduced', 'system'] as const;
export type MotionMode = (typeof MOTION_MODES)[number];

/** Reads the current motion mode from `<html>`; `'system'` when unset. */
export function getMotionMode(): MotionMode {
  const attribute = document.documentElement.getAttribute('data-motion');

  return attribute === 'full' || attribute === 'reduced' ? attribute : 'system';
}

/**
 * Sets the app-level motion mode by writing (or removing, for `'system'`)
 * the `data-motion` attribute on `<html>`. Returns the applied mode so
 * callers can round-trip a value they don't control.
 */
export function setMotionMode(mode: MotionMode): MotionMode {
  if (!MOTION_MODES.includes(mode)) {
    throw new RangeError(`Unknown motion mode: ${String(mode)}. Expected one of: ${MOTION_MODES.join(', ')}.`);
  }

  if (mode === 'system') {
    document.documentElement.removeAttribute('data-motion');
  } else {
    document.documentElement.setAttribute('data-motion', mode);
  }

  return mode;
}
