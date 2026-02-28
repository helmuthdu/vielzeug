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
 * All available colors (including neutral)
 */
export type AllColors = ThemeColor | 'neutral';

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

// ============================================
// Base Component Prop Interfaces
// ============================================

/**
 * Base props for all components
 */
export interface BaseComponentProps {
  /** Custom CSS class name */
  class?: string;
  /** Inline styles */
  style?: string;
}

/**
 * Props for components that support theming
 */
export interface ThemableProps {
  /** Theme color */
  color?: ThemeColor;
}

/**
 * Props for components with variants
 */
export interface VariantProps {
  /** Visual variant */
  variant?: VisualVariant;
}

/**
 * Props for components with size variants
 */
export interface SizableProps {
  /** Component size */
  size?: ComponentSize;
}

/**
 * Props for interactive components that can be disabled
 */
export interface DisablableProps {
  /** Disable interaction */
  disabled?: boolean;
}

/**
 * Props for components with loading state
 */
export interface LoadableProps {
  /** Loading state */
  loading?: boolean;
}

/**
 * Props for components with rounded corners
 */
export interface RoundableProps {
  /** Border radius */
  rounded?: RoundedSize;
}

/**
 * Props for components with elevation
 */
export interface ElevatableProps {
  /** Shadow elevation level */
  elevation?: ElevationLevel;
}

/**
 * Props for components with padding
 */
export interface PaddableProps {
  /** Internal padding */
  padding?: PaddingSize;
}

/**
 * Props for form elements
 */
export interface FormElementProps {
  /** Form field name */
  name?: string;
  /** Field value */
  value?: string;
}

/**
 * Props for checkable elements (checkbox, radio)
 */
export interface CheckableProps extends FormElementProps {
  /** Checked state */
  checked?: boolean;
}

// ============================================
// Utility Types
// ============================================

/**
 * Make specific properties required
 */
export type RequireProps<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Make all properties optional
 */
export type PartialProps<T> = Partial<T>;

/**
 * Extract keys that match a specific type
 */
export type KeysOfType<T, V> = {
  [K in keyof T]: T[K] extends V ? K : never;
}[keyof T];

/**
 * Boolean attributes (presence = true)
 */
export type BooleanAttribute = boolean | '';

/**
 * Nullable type
 */
export type Nullable<T> = T | null;

/**
 * Optional type
 */
export type Optional<T> = T | undefined;

// ============================================
// Component-Specific Composed Props
// ============================================

/**
 * Standard interactive component props
 * Combines common traits for buttons, inputs, etc.
 */
export interface InteractiveComponentProps
  extends BaseComponentProps,
    ThemableProps,
    VariantProps,
    SizableProps,
    DisablableProps {}

/**
 * Standard form control props
 * For checkbox, radio, switch, slider
 */
export interface FormControlProps extends InteractiveComponentProps, FormElementProps {}

/**
 * Standard container props
 * For box, card, etc.
 */
export interface ContainerProps
  extends BaseComponentProps,
    ThemableProps,
    VariantProps,
    RoundableProps,
    ElevatableProps,
    PaddableProps {}

// ============================================
// Type Guards
// ============================================

/**
 * Check if a value is a valid theme color
 */
export function isThemeColor(value: unknown): value is ThemeColor {
  return typeof value === 'string' && ['primary', 'secondary', 'info', 'success', 'warning', 'error'].includes(value);
}

/**
 * Check if a value is a valid component size
 */
export function isComponentSize(value: unknown): value is ComponentSize {
  return typeof value === 'string' && ['sm', 'md', 'lg'].includes(value);
}

/**
 * Check if a value is a valid visual variant
 */
export function isVisualVariant(value: unknown): value is VisualVariant {
  return (
    typeof value === 'string' &&
    ['solid', 'flat', 'bordered', 'outline', 'ghost', 'text', 'frost', 'glass'].includes(value)
  );
}
