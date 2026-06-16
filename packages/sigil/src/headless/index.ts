// ── Craft adapter ─────────────────────────────────────────────────────────────
export { lifecycleSignal } from './craft';

// ── Field base ───────────────────────────────────────────────────────────────
export {
  type AriaProps,
  type ControlValidationMode,
  type CounterOptions,
  type CounterState,
  type ErrorHelperOptions,
  type ErrorHelperState,
  type FieldHandle,
  type FieldOptions,
  type LabelPlacement,
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

// ── Overlay types (public — consumed by component authors) ───────────────────
export {
  type DialogCloseReason,
  type DropdownCloseReason,
  type OverlayCloseDetail,
  type OverlayControl,
  type OverlayOpenDetail,
  type OverlayOpenReason,
} from './overlay';

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

// ── Navigation types (public — consumed by component authors) ────────────────
export { type ListKeyAction, type ListNavigationAction } from './nav';

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

// ── Live-region announcer ─────────────────────────────────────────────────────
export { announce, type AnnouncePoliteness, type AnnounceOptions } from './announcer';

// ── Date picker ──────────────────────────────────────────────────────────────
export {
  createDatePickerControl,
  formatDisplayDate,
  parseIso,
  toIsoString,
  type DateCell,
  type DatePickerControl,
  type DatePickerControlOptions,
  type DatePickerView,
  type MonthCell,
  type YearCell,
} from './date-picker';

// ── Dialog focus ─────────────────────────────────────────────────────────────
export { createDialogFocusControl, type DialogFocusControl, type DialogFocusControlOptions } from './dialog-focus';

// ── DOM utilities ─────────────────────────────────────────────────────────────
export { getChoiceLabel, getLightChildrenByTag } from './light-dom';

// ── Number utilities ──────────────────────────────────────────────────────────
export { toFiniteNumber, toFiniteNumberOr, toPositiveStep } from './numbers';

// ── Data grid ─────────────────────────────────────────────────────────────────
export {
  createDataGridControl,
  type DataGridColumn,
  type DataGridControl,
  type DataGridControlOptions,
  type SelectionMode,
  type SortDirection,
  type SortState,
} from './datagrid';

// ── Internal primitives (used by sigil components; not part of the public API contract) ──

export { createDropdownPositioner, type DropdownPositionerOptions, type OverlayPositioner } from './positioner';
export {
  createInteraction,
  dispatchKeyboardAction,
  type Interaction,
  type InteractionOptions,
  type KeyboardDispatchOptions,
  type PressTrigger,
} from './keyboard';
export { createListControl, type ListControl, type ListNavigationOptions } from './nav';
export { createOverlayControl, type OverlayControlOptions } from './overlay';
export { createSelectionControl, type SelectionControl, type SelectionControlOptions } from './selection-control';
export { createSortControl, type SortControl, type SortControlOptions } from './sort-control';
export { createTypeahead, type Typeahead, type TypeaheadOptions } from './typeahead';
export { parseStringTriggers } from './parse';
export { syncedSignal } from './signals';
