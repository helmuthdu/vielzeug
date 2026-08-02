/**
 * Internal barrel — primitives used by refine components but not intended as
 * public API. Not exported from `core/index.ts`.
 *
 * Import via the full path, e.g.:
 *   import { createInteraction } from '../../core/_internal';
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
  createListboxDropdown,
  type ListboxDropdown,
  type ListboxDropdownOptions,
  type ListboxDropdownPlacementOptions,
} from './option-list';
export { createTypeahead, type Typeahead, type TypeaheadOptions } from './typeahead';
export { parseStringTriggers } from './parse';
export { syncedSignal } from './signals';
