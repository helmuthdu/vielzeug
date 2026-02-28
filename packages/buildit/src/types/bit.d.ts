/**
 * Type declarations for Buildit components
 * Use these to get full type safety when working with component tags
 */

import type {
  AccordionItemProps,
  AccordionProps,
  AddEventListeners,
  BitAccordionEvents,
  BitAccordionItemEvents,
  BitButtonEvents,
  BitCardEvents,
  BitCheckboxEvents,
  BitInputEvents,
  BitRadioEvents,
  BitSliderEvents,
  BitSwitchEvents,
  ButtonGroupProps,
  ButtonProps,
  CardProps,
  CheckboxProps,
  InputProps,
  RadioProps,
  SliderProps,
  SwitchProps,
  TextProps,
} from '../index';

// ============================================
// Component Type Definitions
// ============================================

type BitAccordion = HTMLElement & AccordionProps & AddEventListeners<BitAccordionEvents>;
type BitAccordionItem = HTMLElement & AccordionItemProps & AddEventListeners<BitAccordionItemEvents>;
type BitButton = HTMLElement & ButtonProps & AddEventListeners<BitButtonEvents>;
type BitButtonGroup = HTMLElement & ButtonGroupProps;
type BitCard = HTMLElement & CardProps & AddEventListeners<BitCardEvents>;
type BitCheckbox = HTMLElement & CheckboxProps & AddEventListeners<BitCheckboxEvents>;
type BitInput = HTMLElement & InputProps & AddEventListeners<BitInputEvents>;
type BitRadio = HTMLElement & RadioProps & AddEventListeners<BitRadioEvents>;
type BitSlider = HTMLElement & SliderProps & AddEventListeners<BitSliderEvents>;
type BitSwitch = HTMLElement & SwitchProps & AddEventListeners<BitSwitchEvents>;
type BitText = HTMLElement & TextProps;

// ============================================
// Global HTML Element Tag Name Map
// ============================================

declare global {
  interface HTMLElementTagNameMap {
    'bit-accordion': BitAccordion;
    'bit-accordion-item': BitAccordionItem;
    'bit-button': BitButton;
    'bit-button-group': BitButtonGroup;
    'bit-card': BitCard;
    'bit-checkbox': BitCheckbox;
    'bit-input': BitInput;
    'bit-radio': BitRadio;
    'bit-slider': BitSlider;
    'bit-switch': BitSwitch;
    'bit-text': BitText;
  }
}
