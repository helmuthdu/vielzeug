/**
 * Type declarations for Buildit components
 * Use these to get full type safety when working with component tags
 */

import type {
  AccordionItemProps,
  AccordionProps,
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

type BitAccordion = HTMLElement & AccordionProps;
type BitAccordionItem = HTMLElement & AccordionItemProps;
type BitButton = HTMLElement & ButtonProps;
type BitButtonGroup = HTMLElement & ButtonGroupProps;
type BitCard = HTMLElement & CardProps;
type BitCheckbox = HTMLElement & CheckboxProps;
type BitInput = HTMLElement & InputProps;
type BitRadio = HTMLElement & RadioProps;
type BitSlider = HTMLElement & SliderProps;
type BitSwitch = HTMLElement & SwitchProps;
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
