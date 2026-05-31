// ── Lifecycle bridge ────────────────────────────────────────────────────────────
export { componentSignal } from './scope';

// ── Field base ───────────────────────────────────────────────────────────────
export {
  createCounterState,
  createErrorHelperState,
  createField,
  type ControlValidationMode,
  type CounterOptions,
  type CounterState,
  type ErrorHelperOptions,
  type ErrorHelperState,
  type FieldAriaState,
  type FieldHandle,
  type FieldOptions,
  type LabelPlacement,
  type LabelState,
  type ValidationTrigger,
} from './field-base';

// ── Text field ────────────────────────────────────────────────────────────────
export { createTextField, type TextFieldDetach, type TextFieldHandle, type TextFieldOptions } from './text-field';

// ── Choice field ──────────────────────────────────────────────────────────────
export {
  createChoiceField,
  type ChoiceChangeDetail,
  type ChoiceFieldHandle,
  type ChoiceFieldOptions,
} from './choice-field';

// ── Checkable ─────────────────────────────────────────────────────────────────
export { createCheckable, type CheckableChangePayload, type CheckableHandle, type CheckableOptions } from './checkable';

// ── Overlay ───────────────────────────────────────────────────────────────────
export {
  createOverlayControl,
  type DialogCloseReason,
  type DropdownCloseReason,
  type OverlayCloseDetail,
  type OverlayControl,
  type OverlayControlOptions,
  type OverlayOpenDetail,
  type OverlayOpenReason,
  type OverlayPositioner,
} from './overlay';

// ── Dropdown positioner ───────────────────────────────────────────────────────
export { createDropdownPositioner, type DropdownPositionerOptions } from './positioner';

// ── Option list ───────────────────────────────────────────────────────────────
export {
  createOptionList,
  type BaseOptionItem,
  type OptionListHandle,
  type OptionListOptions,
  type PlacementOptions,
} from './option-list';

// ── Paginated list ────────────────────────────────────────────────────────────
export { createPaginatedList, type PaginatedListHandle, type PaginatedListOptions } from './paginated-list';

// ── Navigation ────────────────────────────────────────────────────────────────
export {
  createListControl,
  keymap,
  keymapPresets,
  type Keymap,
  type ListControl,
  type ListKeyAction,
  type ListNavigationAction,
  type ListNavigationOptions,
} from './nav';

// ── Spinner ───────────────────────────────────────────────────────────────────
export { createSpinnerControl, type SpinnerControl, type SpinnerControlOptions } from './spinner';

// ── Slider ────────────────────────────────────────────────────────────────────
export { createSliderControl, type SliderControl, type SliderControlOptions } from './slider';

// ── Swipe ─────────────────────────────────────────────────────────────────────
export {
  createSwipeControl,
  type SwipeAxis,
  type SwipeControl,
  type SwipeControlDetail,
  type SwipeControlOptions,
} from './swipe';

// ── Keyboard / interaction ────────────────────────────────────────────────────
export {
  createInteraction,
  dispatchKeyboardAction,
  type Interaction,
  type InteractionOptions,
  type KeyboardDispatchOptions,
  type PressTrigger,
} from './keyboard';

// ── Trigger parser ────────────────────────────────────────────────────────────
export { parseStringTriggers } from './parse';

// ── Focus trap ────────────────────────────────────────────────────────────────
export { createFocusTrap, type FocusTrap, type FocusTrapOptions } from './focus-trap';

// ── Live-region announcer ─────────────────────────────────────────────────────
export { announce, type AnnouncePoliteness, type AnnounceOptions } from './announcer';

// ── Focus management ─────────────────────────────────────────────────────────
export { createFocusManager, type FocusManager, type FocusManagerOptions } from './focus';

// ── Dialog focus ─────────────────────────────────────────────────────────────
export { createDialogFocusControl, type DialogFocusControl, type DialogFocusControlOptions } from './dialog-focus';

// ── Dev utilities ─────────────────────────────────────────────────────────────
export { assert as devAssert } from '@vielzeug/arsenal';

// ── ID generation ────────────────────────────────────────────────────────────
export { createStableId } from '@vielzeug/craft';

// ── DOM utilities ─────────────────────────────────────────────────────────────
export { setBooleanAttribute, setMaybeAttribute } from './attrs';
export { getChoiceLabel, getLightChildrenByTag } from './light-dom';
