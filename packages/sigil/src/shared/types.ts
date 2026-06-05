export type { PropsDef } from '@vielzeug/craft';

// ── Primitive type aliases ────────────────────────────────────────────────────

/** Form validity methods exposed on form-associated custom elements. */
export type FormValidityMethods = {
  checkValidity(): boolean;
  reportValidity(): boolean;
  setCustomValidity(message: string): void;
};

/** Component size variants */
export type ComponentSize = 'sm' | 'md' | 'lg';

/** Semantic theme colors */
export type ThemeColor = 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error';

/** Visual variant styles */
export type VisualVariant = 'solid' | 'flat' | 'bordered' | 'outline' | 'ghost' | 'text' | 'frost' | 'glass';

/** Border radius variants */
export type RoundedSize = 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full';

/** Elevation/shadow depth levels */
export type ElevationLevel = 0 | 1 | 2 | 3 | 4 | 5;

/** Internal spacing variants */
export type PaddingSize = 'none' | 'sm' | 'md' | 'lg' | 'xl';

/** Button form-submission types */
export type ButtonType = 'button' | 'submit' | 'reset';

/** Allowed HTML5 input type values for `<sg-input>` */
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
 * export interface SgInputEvents {
 *   change: { value: string; originalEvent: Event };
 * }
 * type SgInputElement = HTMLElement & SgInputProps & AddEventListeners<SgInputEvents>;
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
