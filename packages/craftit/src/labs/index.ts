/** Experimental/labs API for @vielzeug/craftit. */

// Composable UI controllers for building custom interactive widgets.
export {
  createListNavigation,
  type ListNavigationController,
  type ListNavigationOptions,
  type ListNavigationResult,
  type ListNavigationResultReason,
} from './list';
export {
  createOverlayControl,
  type OverlayChangeContext,
  type OverlayCloseReason,
  type OverlayControl,
  type OverlayControlOptions,
  type OverlayOpenReason,
  type OverlayPositioner,
} from './overlay';
export {
  createSelectionControl,
  type SelectionController,
  type SelectionControllerOptions,
  type SelectionKeyExtractor,
  type SelectionMode,
} from './selection';

// Composables that can evolve more aggressively pre-release.
export { useA11yControl, type A11yControlConfig, type A11yControlHandle, type A11yTone } from './a11y';
export {
  createCheckableControl,
  type CheckableChangePayload,
  type CheckableControlConfig,
  type CheckableControlHandle,
} from './selectable';

// Platform observers and higher-level experiments.
export { observeIntersection, observeMedia, observeResize } from './observers';
