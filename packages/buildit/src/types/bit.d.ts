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
  BoxProps,
  ButtonGroupProps,
  ButtonProps,
  CardProps,
  CheckboxProps,
  GridItemProps,
  GridProps,
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
type BitBox = HTMLElement & BoxProps;
type BitButton = HTMLElement & ButtonProps & AddEventListeners<BitButtonEvents>;
type BitButtonGroup = HTMLElement & ButtonGroupProps;
type BitCard = HTMLElement & CardProps & AddEventListeners<BitCardEvents>;
type BitCheckbox = HTMLElement & CheckboxProps & AddEventListeners<BitCheckboxEvents>;
type BitGrid = HTMLElement & GridProps;
type BitGridItem = HTMLElement & GridItemProps;
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
    'bit-box': BitBox;
    'bit-button': BitButton;
    'bit-button-group': BitButtonGroup;
    'bit-card': BitCard;
    'bit-checkbox': BitCheckbox;
    'bit-grid': BitGrid;
    'bit-grid-item': BitGridItem;
    'bit-input': BitInput;
    'bit-radio': BitRadio;
    'bit-slider': BitSlider;
    'bit-switch': BitSwitch;
    'bit-text': BitText;
  }
}
