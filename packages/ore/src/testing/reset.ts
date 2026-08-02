/**
 * One honest entry point for cross-test isolation. Replaces the collection of
 * `_`-private reset functions the test harness used to import from individual
 * modules — those stay private to their modules; this is the supported seam.
 */

import { _clearStylesheetCache } from '../utils/css';
import { _resetIdCounter } from '../utils/id';

/**
 * Reset every piece of global ore state a test can touch: the stylesheet cache
 * and both ID counters. Called by `cleanup()` — call it directly only if you
 * manage mounted elements yourself.
 */
export const resetOreForTests = (): void => {
  _clearStylesheetCache();
  _resetIdCounter();
};
