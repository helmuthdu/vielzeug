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

/**
 * Slider change event
 * @fires bit-slider#change
 */
export interface BitSliderChangeEvent extends CustomEvent<ValueChangeDetail<number>> {
  readonly type: 'change';
}

/**
 * Slider input event (fired during dragging)
 * @fires bit-slider#input
 */
export interface BitSliderInputEvent extends CustomEvent<ValueChangeDetail<number>> {
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

// ============================================
// Button Component Events
// ============================================

/**
 * Button click event
 * @fires bit-button#click
 */
export interface BitButtonClickEvent extends CustomEvent<BaseEventDetail> {
  readonly type: 'click';
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

/**
 * Card click event (when clickable)
 * @fires bit-card#click
 */
export interface BitCardClickEvent extends CustomEvent<BaseEventDetail> {
  readonly type: 'click';
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

export interface BitButtonEvents {
  click: BitButtonClickEvent;
}

export interface BitAccordionItemEvents {
  toggle: BitAccordionItemToggleEvent;
}

export interface BitAccordionEvents {
  change: BitAccordionChangeEvent;
}

export interface BitCardEvents {
  click: BitCardClickEvent;
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
export type AddEventListeners<T extends Record<string, Event>> = {
  addEventListener<K extends keyof T>(
    type: K,
    listener: (this: HTMLElement, ev: T[K]) => any,
    options?: boolean | AddEventListenerOptions,
  ): void;
  removeEventListener<K extends keyof T>(
    type: K,
    listener: (this: HTMLElement, ev: T[K]) => any,
    options?: boolean | EventListenerOptions,
  ): void;
};
