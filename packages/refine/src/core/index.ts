/**
 * Private implementation barrel for Refine components.
 *
 * This module is deliberately omitted from the package export map: its helpers
 * encode component-specific Ore and Ripple behavior, not a stable public API.
 */

// ── Ore adapter ───────────────────────────────────────────────────────────────
export { lifecycleSignal } from './ore';

// ── Auto-resize ───────────────────────────────────────────────────────────────
export { createAutoResize, type AutoResizeControl, type AutoResizeOptions } from './auto-resize';

// ── Ref callback ──────────────────────────────────────────────────────────────
export { bindRefCallback, type RefCallback } from './ref-callback';

// ── Cross-shadow-root ARIA relationships ──────────────────────────────────────
export { setAriaReflection, type AriaReflectionProperty } from './aria-reflection';

// ── Focus management ────────────────────────────────────────────────────────
export { createFocusManager, type FocusManager, type FocusManagerOptions } from './focus';

// ── Field base ───────────────────────────────────────────────────────────────
export {
  counterClassName,
  createAssistiveState,
  createDirtyTracker,
  createErrorHelperState,
  createField,
  createLabelState,
  type AssistiveStateHandle,
  type AssistiveStateOptions,
  type ControlValidationMode,
  type CounterOptions,
  type CounterState,
  type DirtyTracker,
  type ErrorHelperOptions,
  type ErrorHelperState,
  type FieldHandle,
  type FieldOptions,
  type LabelPlacement,
  type LabelStateHandle,
  type LabelStateOptions,
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

// ── Composer ──────────────────────────────────────────────────────────────────
export {
  createComposerControl,
  type ComposerControl,
  type ComposerControlOptions,
  type SendShortcut,
} from './composer';

// ── Overlay ──────────────────────────────────────────────────────────────────
export {
  createOutsidePointerDismissal,
  restoreTriggerFocus,
  type DialogCloseReason,
  type DropdownCloseReason,
  type OutsidePointerDismissalOptions,
  type OverlayCloseDetail,
  type OverlayOpenChangeDetail,
  type OverlayOpenDetail,
  type OverlayOpenReason,
} from './overlay';

// ── Navigation types ─────────────────────────────────────────────────────────
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

// ── DOM utilities ─────────────────────────────────────────────────────────────
export { getChoiceLabel, getLightChildrenByTag } from './light-dom';

// ── Number utilities ──────────────────────────────────────────────────────────
export { toFiniteNumber, toFiniteNumberOr, toPositiveStep } from './numbers';

// ── Shared component primitives ──────────────────────────────────────────────

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
export {
  createListboxDropdown,
  type ListboxDropdown,
  type ListboxDropdownOptions,
  type ListboxDropdownPlacementOptions,
} from './option-list';
export { elementDirection } from './direction';
export { parseStringTriggers } from './parse';
export { syncedSignal } from './signals';
