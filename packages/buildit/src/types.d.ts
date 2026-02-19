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
  CheckboxProps,
  RadioProps,
} from './';

// ============================================
// Component Type Definitions
// ============================================

type BitButton = WebComponent<HTMLButtonElement, ButtonProps>;
type BitButtonGroup = WebComponent<HTMLDivElement, ButtonGroupProps>;
type BitAccordion = WebComponent<HTMLDivElement, AccordionProps>;
type BitAccordionItem = WebComponent<HTMLDivElement, AccordionItemProps>;
type BitCheckbox = WebComponent<HTMLDivElement, CheckboxProps>;
type BitRadio = WebComponent<HTMLDivElement, RadioProps>;

// ============================================
// Global HTML Element Tag Name Map
// ============================================

declare global {
  interface HTMLElementTagNameMap {
    'bit-button': BitButton;
    'bit-button-group': BitButtonGroup;
    'bit-accordion': BitAccordion;
    'bit-accordion-item': BitAccordionItem;
    'bit-checkbox': BitCheckbox;
    'bit-radio': BitRadio;
  }
}

