/**
 * Private implementation barrel for Refine components.
 *
 * This module is deliberately omitted from the package export map: its helpers
 * encode component-specific Ore and Ripple behavior, not a stable public API.
 */

// ── Live-region announcer ─────────────────────────────────────────────────────
export { type AnnounceOptions, type AnnouncePoliteness, announce } from './announcer';
// ── Cross-shadow-root ARIA relationships ──────────────────────────────────────
export { type AriaReflectionProperty, setAriaReflection } from './aria-reflection';
// ── Auto-resize ───────────────────────────────────────────────────────────────
export { type AutoResizeControl, type AutoResizeOptions, createAutoResize } from './auto-resize';
// ── Checkable ─────────────────────────────────────────────────────────────────
export { type CheckableChangePayload, type CheckableHandle, type CheckableOptions, createCheckable } from './checkable';
// ── Choice field ──────────────────────────────────────────────────────────────
export {
  type ChoiceChangeDetail,
  type ChoiceFieldHandle,
  type ChoiceFieldOptions,
  createChoiceField,
} from './choice-field';
// ── Composer ──────────────────────────────────────────────────────────────────
export {
  type ComposerControl,
  type ComposerControlOptions,
  createComposerControl,
  type SendShortcut,
} from './composer';
// ── Date picker ──────────────────────────────────────────────────────────────
export {
  createDatePickerControl,
  type DateCell,
  type DatePickerControl,
  type DatePickerControlOptions,
  type DatePickerView,
  formatDisplayDate,
  type MonthCell,
  parseIso,
  toIsoString,
  type YearCell,
} from './date-picker';
// ── Field base ───────────────────────────────────────────────────────────────
export {
  type AssistiveStateHandle,
  type AssistiveStateOptions,
  type ControlValidationMode,
  type CounterOptions,
  type CounterState,
  counterClassName,
  createAssistiveState,
  createDirtyTracker,
  createErrorHelperState,
  createField,
  createLabelState,
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
// ── Focus management ────────────────────────────────────────────────────────
export { createFocusManager, type FocusManager, type FocusManagerOptions } from './focus';
// ── DOM utilities ─────────────────────────────────────────────────────────────
export { getChoiceLabel, getLightChildrenByTag } from './light-dom';
// ── Navigation types ─────────────────────────────────────────────────────────
export type { ListKeyAction, ListNavigationAction } from './nav';
// ── Number utilities ──────────────────────────────────────────────────────────
export { toFiniteNumber, toFiniteNumberOr, toPositiveStep } from './numbers';
// ── Ore adapter ───────────────────────────────────────────────────────────────
export { lifecycleSignal } from './ore';
// ── Overlay ──────────────────────────────────────────────────────────────────
export {
  createOutsidePointerDismissal,
  type DialogCloseReason,
  type DropdownCloseReason,
  type OutsidePointerDismissalOptions,
  type OverlayCloseDetail,
  type OverlayOpenChangeDetail,
  type OverlayOpenDetail,
  type OverlayOpenReason,
  restoreTriggerFocus,
} from './overlay';
// ── Ref callback ──────────────────────────────────────────────────────────────
export { bindRefCallback, type RefCallback } from './ref-callback';
// ── Slider ────────────────────────────────────────────────────────────────────
export { createSliderControl, type SliderControl, type SliderControlOptions } from './slider';
// ── Spinner ───────────────────────────────────────────────────────────────────
export { createSpinnerControl, type SpinnerControl, type SpinnerControlOptions } from './spinner';
// ── Swipe ─────────────────────────────────────────────────────────────────────
export {
  createSwipeControl,
  type SwipeAxis,
  type SwipeControl,
  type SwipeControlDetail,
  type SwipeControlOptions,
} from './swipe';
// ── Text field ────────────────────────────────────────────────────────────────
export { createTextField, type TextFieldDetach, type TextFieldHandle, type TextFieldOptions } from './text-field';

// ── Shared component primitives ──────────────────────────────────────────────

export { elementDirection } from './direction';
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
export { parseStringTriggers } from './parse';
export { createDropdownPositioner, type DropdownPositionerOptions, type OverlayPositioner } from './positioner';
export { syncedSignal } from './signals';
