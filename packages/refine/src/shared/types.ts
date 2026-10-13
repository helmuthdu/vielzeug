export type { PropsDef } from '@vielzeug/ore';

// ── Primitive type aliases ────────────────────────────────────────────────────

/** Form validity methods exposed on form-associated custom elements. */
export type FormValidityMethods = {
  checkValidity(): boolean;
  reportValidity(): boolean;
  setCustomValidity(message: string): void;
};

/** Component size variants */
export const COMPONENT_SIZES = ['sm', 'md', 'lg'] as const;
export type ComponentSize = (typeof COMPONENT_SIZES)[number];

/** Semantic theme colors */
export const THEME_COLORS = ['primary', 'secondary', 'info', 'success', 'warning', 'error'] as const;
export type ThemeColor = (typeof THEME_COLORS)[number];

/** Visual variant styles */
export const VISUAL_VARIANTS = ['solid', 'flat', 'bordered', 'outline', 'ghost', 'text', 'frost'] as const;
export type VisualVariant = (typeof VISUAL_VARIANTS)[number];

/** Variant set accepted by text-field-style inputs (everything except `text` and `frost`). */
export const FIELD_VARIANTS = ['flat', 'solid', 'bordered', 'outline', 'ghost'] as const;
export type FieldVariant = (typeof FIELD_VARIANTS)[number];

/** Variant set accepted by input/select-style fields (everything except `frost`). */
export const INPUT_VARIANTS = ['solid', 'flat', 'bordered', 'outline', 'ghost', 'text'] as const;
export type InputVariant = (typeof INPUT_VARIANTS)[number];

/** Table/grid density levels */
export const DENSITY_LEVELS = ['compact', 'cozy', 'comfortable'] as const;
export type DensityLevel = (typeof DENSITY_LEVELS)[number];

/** Border radius variants */
export const ROUNDED_SIZES = ['none', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', 'full'] as const;
export type RoundedSize = (typeof ROUNDED_SIZES)[number];

/** Elevation/shadow depth levels */
export const ELEVATION_LEVELS = [0, 1, 2, 3, 4, 5] as const;
export type ElevationLevel = (typeof ELEVATION_LEVELS)[number];

/** Internal spacing variants */
export const PADDING_SIZES = ['none', 'sm', 'md', 'lg', 'xl'] as const;
export type PaddingSize = (typeof PADDING_SIZES)[number];

/** Button form-submission types */
export const BUTTON_TYPES = ['button', 'submit', 'reset'] as const;
export type ButtonType = (typeof BUTTON_TYPES)[number];

/** Anchor browsing-context values */
export const LINK_TARGETS = ['_blank', '_self', '_parent', '_top'] as const;
export type LinkTarget = (typeof LINK_TARGETS)[number];

/** Allowed HTML5 input type values for `<ore-input>` */
export const INPUT_TYPES = [
  'text',
  'email',
  'password',
  'number',
  'tel',
  'url',
  'search',
  'date',
  'time',
  'datetime-local',
  'month',
  'week',
] as const;
export type InputType = (typeof INPUT_TYPES)[number];

// ── Form element props ────────────────────────────────────────────────────────

/** Props for form-associated elements */
export type FormElementProps = {
  name?: string;
  value?: string;
};

/** Props for checkable form-associated elements (checkbox, radio) */
export type CheckableProps = FormElementProps & {
  checked?: boolean;
};

/**
 * Adds type-safe `addEventListener` / `removeEventListener` overloads to a custom element type.
 *
 * ```ts
 * export interface OreInputEvents {
 *   change: { value: string; originalEvent: Event };
 * }
 * type OreInputElement = HTMLElement & OreInputProps & AddEventListeners<OreInputEvents>;
 * ```
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

// ── Derived form field prop types ─────────────────────────────────────────────

export type BaseFormProps = {
  color?: ThemeColor;
  disabled?: boolean;
  error?: string;
  fullwidth?: boolean;
  helper?: string;
  label?: string;
  'label-placement'?: 'inset' | 'outside';
  name?: string;
  size?: ComponentSize;
  /**
   * Shows an inline green check icon inside the field to confirm the value has passed
   * validation. Ignored while `error` is set: an error always wins.
   */
  success?: boolean;
};

type FieldVisualProps<TVariant extends VisualVariant> = {
  rounded?: RoundedSize | '';
  variant?: TVariant;
};

export type TextFieldProps<TVariant extends VisualVariant> = BaseFormProps &
  FieldVisualProps<TVariant> & {
    placeholder?: string;
    readonly?: boolean;
    required?: boolean;
    value?: string;
  };

export type SelectableFieldProps<TVariant extends VisualVariant> = BaseFormProps &
  FieldVisualProps<TVariant> & {
    placeholder?: string;
    value?: string;
  };
