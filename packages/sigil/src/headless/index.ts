// ── Lifecycle bridge ────────────────────────────────────────────────────────────
export { toAbortSignal } from './scope';

// ── Field base ───────────────────────────────────────────────────────────────
export {
  createAssistiveState,
  createErrorHelperState,
  createField,
  createFieldCore,
  type AssistiveOptions,
  type AssistiveState,
  type ControlValidationMode,
  type CounterState,
  type ErrorHelperOptions,
  type ErrorHelperState,
  type FieldAriaState,
  type FieldBaseOptions,
  type FieldCore,
  type FieldCoreOptions,
  type FieldHandle,
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

// ── Navigation ────────────────────────────────────────────────────────────────
export {
  createListControl,
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
export { devAssert, HeadlessError, HeadlessException, type HeadlessErrorCode } from './dev';

// ── ID generation ────────────────────────────────────────────────────────────
export { createStableId } from './id';

// ── Composite control ─────────────────────────────────────────────────────────
export { createComposite, type CompositeControlHandle, type CompositeOptions } from './composite';

// ── DOM utilities ─────────────────────────────────────────────────────────────
export { setBooleanAttribute, setMaybeAttribute } from './attrs';
export { getChoiceLabel, getLightChildrenByTag } from './light-dom';
