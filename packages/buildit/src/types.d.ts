/**
 * Type declarations for Buildit components
 * Use these to get full type safety when working with component tags
 */

import type { WebComponent } from '@vielzeug/craftit';
import type {
  AccordionItemProps,
  AccordionProps,
  ButtonGroupProps,
  ButtonProps,
  CardProps,
  CheckboxProps,
  InputProps,
  RadioProps,
  TextProps
} from './';

// ============================================
// Component Type Definitions
// ============================================

type BitAccordion = WebComponent<HTMLDivElement, AccordionProps>;
type BitAccordionItem = WebComponent<HTMLDivElement, AccordionItemProps>;
type BitButton = WebComponent<HTMLButtonElement, ButtonProps>;
type BitButtonGroup = WebComponent<HTMLDivElement, ButtonGroupProps>;
type BitCard = WebComponent<HTMLDivElement, CardProps>;
type BitCheckbox = WebComponent<HTMLDivElement, CheckboxProps>;
type BitInput = WebComponent<HTMLInputElement, InputProps>;
type BitRadio = WebComponent<HTMLDivElement, RadioProps>;
type BitText = WebComponent<HTMLDivElement, TextProps>;

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
    'bit-text': BitText;
  }
}
