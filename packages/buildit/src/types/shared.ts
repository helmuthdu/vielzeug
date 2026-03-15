/**
 * Shared TypeScript Types for BuildIt Components
 *
 * This file provides reusable type utilities and common type definitions
 * used across all BuildIt components for better type safety and DRX.
 */

// ============================================
// Common Attribute Types
// ============================================

/**
 * Form validity methods exposed on form-associated custom elements.
 * Mirrors the constraint validation API so form libraries (React Hook Form,
 * etc.) and native `<form>` can interact with bit-* form controls directly.
 */
export type FormValidityMethods = {
  /** Returns true if the element's value satisfies all constraints. */
  checkValidity(): boolean;
  /** Same as checkValidity() but also fires an invalid event and shows the
   *  browser's validation UI when the element is invalid. */
  reportValidity(): boolean;
  /** Sets a custom validation message. Pass an empty string to clear. */
  setCustomValidity(message: string): void;
};

/**
 * Component size variants
 * Consistent across all sized components
 */
export type ComponentSize = 'sm' | 'md' | 'lg';

/**
 * Theme color options
 * Semantic colors used across the design system
 */
export type ThemeColor = 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error';

/**
 * Visual variant types
 * Common across interactive components
 */
export type VisualVariant =
  | 'solid' // Filled with solid background
  | 'flat' // Subtle background
  | 'bordered' // Emphasized border
  | 'outline' // Transparent with border
  | 'ghost' // Transparent until hover
  | 'text' // Minimal text-only
  | 'frost' // Frosted glass effect
  | 'glass'; // Full glassmorphism

/**
 * Rounded corner sizes
 * Border radius variants
 */
export type RoundedSize = 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full';

/**
 * Elevation levels
 * Shadow depth from 0 (flat) to 5 (highest)
 */
export type ElevationLevel = 0 | 1 | 2 | 3 | 4 | 5;

/**
 * Padding sizes
 * Internal spacing variants
 */
export type PaddingSize = 'none' | 'sm' | 'md' | 'lg' | 'xl';

/**
 * Button types for form submission
 */
export type ButtonType = 'button' | 'submit' | 'reset';

/**
 * Input types
 * HTML5 input type attribute values
 */
export type InputType =
  | 'text'
  | 'email'
  | 'password'
  | 'number'
  | 'tel'
  | 'url'
  | 'search'
  | 'date'
  | 'time'
  | 'datetime-local'
  | 'month'
  | 'week';

/**
 * Props for components that support theming
 */
export type ThemableProps = {
  /** Theme color */
  color?: ThemeColor;
};

/**
 * Props for components with size variants
 */
export type SizableProps = {
  /** Component size */
  size?: ComponentSize;
};

/**
 * Props for interactive components that can be disabled
 */
export type DisablableProps = {
  /** Disable interaction */
  disabled?: boolean;
};

/**
 * Props for components with loading state
 */
export type LoadableProps = {
  /** Loading state */
  loading?: boolean;
};

/**
 * Props for form elements
 */
export type FormElementProps = {
  /** Form field name */
  name?: string;
  /** Field value */
  value?: string;
};

/**
 * Props for checkable elements (checkbox, radio)
 */
export type CheckableProps = FormElementProps & {
  /** Checked state */
  checked?: boolean;
};

// ============================================
// Event Helper
// ============================================

/**
 * Adds type-safe `addEventListener` / `removeEventListener` overloads to a custom element type.
 *
 * The event map `T` uses plain detail shapes (the same type passed to `defineEmits`):
 * ```ts
 * export interface BitInputEvents {
 *   change: { value: string; originalEvent: Event };
 *   input:  { value: string; originalEvent: Event };
 * }
 * ```
 * Each entry is automatically wrapped in `CustomEvent<Detail>` for the listener signature.
 */
export type AddEventListeners<T> = {
  addEventListener<K extends keyof T & string>(
    type: K,
    listener: (this: HTMLElement, ev: CustomEvent<T[K]>) => void,
    options?: boolean | AddEventListenerOptions,
  ): void;
  removeEventListener<K extends keyof T & string>(
    type: K,
    listener: (this: HTMLElement, ev: CustomEvent<T[K]>) => void,
    options?: boolean | EventListenerOptions,
  ): void;
};
