/**
 * TypeScript Event Type Definitions for BuildIt Components
 *
 * Provides type-safe event interfaces for all custom events emitted by BuildIt components.
 * Use these types for better autocomplete and type checking in event handlers.
 *
 * @example
 * ```typescript
 * import type { BitCheckboxChangeEvent } from '@vielzeug/buildit/types';
 *
 * checkbox.addEventListener('change', (e: BitCheckboxChangeEvent) => {
 *   console.log(e.detail.checked, e.detail.value);
 * });
 * ```
 */

// ============================================
// Base Event Detail Interfaces
// ============================================

/**
 * Base detail for all component events
 */
export interface BaseEventDetail {
  /** The original DOM event that triggered this custom event */
  originalEvent?: Event;
}

/**
 * Detail for value change events
 */
export interface ValueChangeDetail<T = string> extends BaseEventDetail {
  /** The new value */
  value: T;
}

/**
 * Detail for checked state change events
 */
export interface CheckedChangeDetail extends BaseEventDetail {
  /** Whether the component is checked */
  checked: boolean;
  /** The component's value attribute */
  value: string;
}

/**
 * Detail for toggle events
 */
export interface ToggleDetail extends BaseEventDetail {
  /** Whether the component is open/expanded */
  open: boolean;
}

/**
 * Detail for selection events
 */
export interface SelectionDetail extends BaseEventDetail {
  /** The selected value */
  value: string;
  /** The index of the selected item */
  index?: number;
}

// ============================================
// Form Component Events
// ============================================

/**
 * Checkbox change event
 * @fires bit-checkbox#change
 */
export interface BitCheckboxChangeEvent extends CustomEvent<CheckedChangeDetail> {
  readonly type: 'change';
}

/**
 * Radio change event
 * @fires bit-radio#change
 */
export interface BitRadioChangeEvent extends CustomEvent<CheckedChangeDetail> {
  readonly type: 'change';
}

/**
 * Switch change event
 * @fires bit-switch#change
 */
export interface BitSwitchChangeEvent extends CustomEvent<CheckedChangeDetail> {
  readonly type: 'change';
}

/** Detail emitted by `bit-slider` change events. */
export interface SliderChangeDetail extends BaseEventDetail {
  /** Single-value mode: the new value. */
  value?: number;
  /** Range mode: the lower-bound value. */
  from?: number;
  /** Range mode: the upper-bound value. */
  to?: number;
}

/**
 * Slider change event
 * @fires bit-slider#change
 */
export interface BitSliderChangeEvent extends CustomEvent<SliderChangeDetail> {
  readonly type: 'change';
}

/**
 * Slider input event (fired during dragging)
 * @fires bit-slider#input
 */
export interface BitSliderInputEvent extends CustomEvent<SliderChangeDetail> {
  readonly type: 'input';
}

/**
 * Input change event
 * @fires bit-input#change
 */
export interface BitInputChangeEvent extends CustomEvent<ValueChangeDetail<string>> {
  readonly type: 'change';
}

/**
 * Input input event (fired on every keystroke)
 * @fires bit-input#input
 */
export interface BitInputInputEvent extends CustomEvent<ValueChangeDetail<string>> {
  readonly type: 'input';
}

/**
 * Textarea change event
 * @fires bit-textarea#change
 */
export interface BitTextareaChangeEvent extends CustomEvent<ValueChangeDetail<string>> {
  readonly type: 'change';
}

/**
 * Textarea input event (fired on every keystroke)
 * @fires bit-textarea#input
 */
export interface BitTextareaInputEvent extends CustomEvent<ValueChangeDetail<string>> {
  readonly type: 'input';
}

/**
 * Alert dismiss event
 * @fires bit-alert#dismiss
 */
export interface BitAlertDismissEvent extends CustomEvent<BaseEventDetail> {
  readonly type: 'dismiss';
}

// ============================================
// Accordion Component Events
// ============================================

/**
 * Accordion item toggle event
 * @fires bit-accordion-item#toggle
 */
export interface BitAccordionItemToggleEvent extends CustomEvent<ToggleDetail> {
  readonly type: 'toggle';
}

/**
 * Accordion change event (when active item changes)
 * @fires bit-accordion#change
 */
export interface BitAccordionChangeEvent extends CustomEvent<SelectionDetail> {
  readonly type: 'change';
}

// ============================================
// Card Component Events
// ============================================

/** Detail emitted by `bit-card` activate events. */
export interface CardActivateDetail extends BaseEventDetail {
  /** Input modality that triggered card activation. */
  trigger: 'pointer' | 'keyboard';
  /** Original user interaction event. */
  originalEvent: MouseEvent | KeyboardEvent;
}

/**
 * Card activate event (interactive card activation)
 * @fires bit-card#activate
 */
export interface BitCardActivateEvent extends CustomEvent<CardActivateDetail> {
  readonly type: 'activate';
}

// ============================================
// Event Map for Type-Safe addEventListener
// ============================================

/**
 * Event map for type-safe event listeners
 *
 * @example
 * ```typescript
 * const checkbox = document.querySelector('bit-checkbox');
 * checkbox?.addEventListener('change', (e: BitCheckboxEvents['change']) => {
 *   console.log(e.detail.checked);
 * });
 * ```
 */
export interface BitCheckboxEvents {
  change: BitCheckboxChangeEvent;
}

export interface BitRadioEvents {
  change: BitRadioChangeEvent;
}

export interface BitSwitchEvents {
  change: BitSwitchChangeEvent;
}

export interface BitSliderEvents {
  change: BitSliderChangeEvent;
  input: BitSliderInputEvent;
}

export interface BitInputEvents {
  change: BitInputChangeEvent;
  input: BitInputInputEvent;
}

export interface BitTextareaEvents {
  change: BitTextareaChangeEvent;
  input: BitTextareaInputEvent;
}

export interface BitAlertEvents {
  dismiss: BitAlertDismissEvent;
}

/**
 * Select change event
 * @fires bit-select#change
 */
export interface BitSelectChangeEvent extends CustomEvent<{ originalEvent?: Event; value: string; values: string[] }> {
  readonly type: 'change';
}

export interface BitSelectEvents {
  change: BitSelectChangeEvent;
}

/** Detail emitted by `bit-combobox` change events. */
export interface ComboboxChangeDetail extends BaseEventDetail {
  value: string;
  values: string[];
  label: string;
  originalEvent?: Event;
}

/**
 * Combobox change event (fired when a selection is made)
 * @fires bit-combobox#change
 */
export interface BitComboboxChangeEvent extends CustomEvent<ComboboxChangeDetail> {
  readonly type: 'change';
}

/**
 * Combobox search event (fired while the user types)
 * @fires bit-combobox#search
 */
export interface BitComboboxSearchEvent extends CustomEvent<{ query: string }> {
  readonly type: 'search';
}

export interface BitComboboxEvents {
  change: BitComboboxChangeEvent;
  search: BitComboboxSearchEvent;
}

export interface BitAccordionItemEvents {
  toggle: BitAccordionItemToggleEvent;
}

export interface BitAccordionEvents {
  change: BitAccordionChangeEvent;
}

export interface BitCardEvents {
  activate: BitCardActivateEvent;
}

/** Detail emitted by `bit-chip` remove events. */
export interface ChipRemoveDetail extends BaseEventDetail {
  value: string | undefined;
}

/** Detail emitted by `bit-chip` change events. */
export interface ChipChangeDetail extends BaseEventDetail {
  value: string | undefined;
  checked: boolean;
}

/**
 * Chip remove event
 * @fires bit-chip#remove
 */
export interface BitChipRemoveEvent extends CustomEvent<ChipRemoveDetail> {
  readonly type: 'remove';
}

/**
 * Chip change event
 * @fires bit-chip#change
 */
export interface BitChipChangeEvent extends CustomEvent<ChipChangeDetail> {
  readonly type: 'change';
}

export interface BitChipEvents {
  remove: BitChipRemoveEvent;
  change: BitChipChangeEvent;
}

// ============================================
// Helper Type for Adding Event Listeners
// ============================================

/**
 * Helper type to add type-safe event listeners to custom elements
 *
 * @example
 * ```typescript
 * type BitCheckboxElement = HTMLElement &
 *   AddEventListeners<BitCheckboxEvents>;
 * ```
 */
export type AddEventListeners<T> = {
  addEventListener<K extends keyof T & string>(
    type: K,
    listener: (this: HTMLElement, ev: T[K]) => void,
    options?: boolean | AddEventListenerOptions,
  ): void;
  removeEventListener<K extends keyof T & string>(
    type: K,
    listener: (this: HTMLElement, ev: T[K]) => void,
    options?: boolean | EventListenerOptions,
  ): void;
};

// Dialog events
export interface BitDialogOpenEvent extends CustomEvent<never> {
  readonly type: 'open';
}
export interface BitDialogCloseEvent extends CustomEvent<never> {
  readonly type: 'close';
}
export interface BitDialogEvents {
  open: BitDialogOpenEvent;
  close: BitDialogCloseEvent;
}

// Tabs events
export interface BitTabsChangeEvent extends CustomEvent<{ value: string }> {
  readonly type: 'change';
}
export interface BitTabsEvents {
  change: BitTabsChangeEvent;
}

// FileInput events
export interface BitFileInputChangeEvent extends CustomEvent<{ files: File[]; originalEvent?: Event }> {
  readonly type: 'change';
}
export interface BitFileInputRemoveEvent extends CustomEvent<{ file: File; files: File[] }> {
  readonly type: 'remove';
}
export interface BitFileInputEvents {
  change: BitFileInputChangeEvent;
  remove: BitFileInputRemoveEvent;
}
