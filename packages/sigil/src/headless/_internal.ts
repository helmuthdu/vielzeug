/**
 * Internal barrel — primitives used by sigil components but not intended as
 * public API. Not exported from `headless/index.ts`.
 *
 * Import via the full path, e.g.:
 *   import { createInteraction } from '../../headless/_internal';
 */

export { createDropdownPositioner, type DropdownPositionerOptions } from './positioner';
export {
  createInteraction,
  dispatchKeyboardAction,
  type Interaction,
  type InteractionOptions,
  type KeyboardDispatchOptions,
  type PressTrigger,
} from './keyboard';
export {
  createListControl,
  type ListControl,
  type ListKeyAction,
  type ListNavigationAction,
  type ListNavigationOptions,
} from './nav';
export {
  createOverlayControl,
  type OverlayControl,
  type OverlayControlOptions,
  type OverlayPositioner,
} from './overlay';
export { createTypeahead, type Typeahead, type TypeaheadOptions } from './typeahead';
export { parseStringTriggers } from './parse';
export { syncedSignal } from './signals';
export { createSelectionControl, type SelectionControl, type SelectionControlOptions } from './selection-control';
export { createSortControl, type SortControl, type SortControlOptions } from './sort-control';
