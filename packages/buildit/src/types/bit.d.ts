/**
 * Type declarations for Buildit components
 * Use these to get full type safety when working with component tags
 */

import type {
  AccordionItemProps,
  AccordionProps,
  AddEventListeners,
  AlertProps,
  BadgeProps,
  BitAccordionEvents,
  BitAccordionItemEvents,
  BitAlertEvents,
  BitButtonEvents,
  BitCardEvents,
  BitCheckboxEvents,
  BitInputEvents,
  BitRadioEvents,
  BitSelectEvents,
  BitSliderEvents,
  BitSwitchEvents,
  BitTextareaEvents,
  BoxProps,
  ButtonGroupProps,
  ButtonProps,
  CardProps,
  CheckboxProps,
  GridItemProps,
  GridProps,
  InputProps,
  RadioProps,
  SelectProps,
  SliderProps,
  SwitchProps,
  TextareaProps,
  TextProps,
  TooltipProps,
} from '../index';

// ============================================
// Component Type Definitions
// ============================================

type BitAccordion = HTMLElement & AccordionProps & AddEventListeners<BitAccordionEvents>;
type BitAccordionItem = HTMLElement & AccordionItemProps & AddEventListeners<BitAccordionItemEvents>;
type BitAlert = HTMLElement & AlertProps & AddEventListeners<BitAlertEvents>;
type BitBadge = HTMLElement & BadgeProps;
type BitBox = HTMLElement & BoxProps;
type BitButton = HTMLElement & ButtonProps & AddEventListeners<BitButtonEvents>;
type BitButtonGroup = HTMLElement & ButtonGroupProps;
type BitCard = HTMLElement & CardProps & AddEventListeners<BitCardEvents>;
type BitCheckbox = HTMLElement & CheckboxProps & AddEventListeners<BitCheckboxEvents>;
type BitGrid = HTMLElement & GridProps;
type BitGridItem = HTMLElement & GridItemProps;
type BitInput = HTMLElement & InputProps & AddEventListeners<BitInputEvents>;
type BitRadio = HTMLElement & RadioProps & AddEventListeners<BitRadioEvents>;
type BitSelect = HTMLElement & SelectProps & AddEventListeners<BitSelectEvents>;
type BitSlider = HTMLElement & SliderProps & AddEventListeners<BitSliderEvents>;
type BitSwitch = HTMLElement & SwitchProps & AddEventListeners<BitSwitchEvents>;
type BitText = HTMLElement & TextProps;
type BitTextarea = HTMLElement & TextareaProps & AddEventListeners<BitTextareaEvents>;
type BitTooltip = HTMLElement & TooltipProps;

// ============================================
// Global HTML Element Tag Name Map
// ============================================

declare global {
  interface HTMLElementTagNameMap {
    'bit-accordion': BitAccordion;
    'bit-accordion-item': BitAccordionItem;
    'bit-alert': BitAlert;
    'bit-badge': BitBadge;
    'bit-box': BitBox;
    'bit-button': BitButton;
    'bit-button-group': BitButtonGroup;
    'bit-card': BitCard;
    'bit-checkbox': BitCheckbox;
    'bit-grid': BitGrid;
    'bit-grid-item': BitGridItem;
    'bit-input': BitInput;
    'bit-radio': BitRadio;
    'bit-select': BitSelect;
    'bit-slider': BitSlider;
    'bit-switch': BitSwitch;
    'bit-text': BitText;
    'bit-textarea': BitTextarea;
    'bit-tooltip': BitTooltip;
  }
}
