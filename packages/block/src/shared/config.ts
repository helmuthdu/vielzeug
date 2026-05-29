/**
 * Shared TypeScript types, prop bundles, and design-size presets for BuildIt components.
 *
 * Types like `ComponentSize`, `ThemeColor`, `VisualVariant` live here — the single
 * authoritative source. `src/types/` re-exports from this file for backward compatibility.
 *
 * Bundles are plain objects of prop defaults merged with object spread in
 * `define<Props>('tag-name', { props: { ...bundle, ... } })`.
 *
 * Presets are passed to `sizeVariantMixin({...})` in each component's styles.
 */

export type { PropsDef } from '@vielzeug/craft';

import { prop } from '@vielzeug/craft';

import type { SizeConfig } from '../styles/mixins/shape.css';

// ── Shared types ──────────────────────────────────────────────────────────────

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

/** Allowed HTML5 input type values for `<bit-input>` */
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
 * export interface BitInputEvents {
 *   change: { value: string; originalEvent: Event };
 * }
 * type BitInputElement = HTMLElement & BitInputProps & AddEventListeners<BitInputEvents>;
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

// ── Prop bundles ──────────────────────────────────────────────────────────────

/** Prop bundle for components that support a theme colour. */
export const themableBundle = {
  color: prop.string<ThemeColor>(),
};

/** Prop bundle for components with discrete size variants. */
export const sizableBundle = {
  size: prop.string<ComponentSize>(),
};

/** Prop bundle for interactive components that can be disabled. */
export const disablableBundle = {
  disabled: prop.bool(false),
};

/** Prop bundle for components with a loading / busy state. */
export const loadableBundle = {
  loading: prop.bool(false),
};

/** Prop bundle for components with configurable border-radius. */
export const roundableBundle = {
  rounded: prop.string<RoundedSize>(),
};

/** Prop bundle for components with an elevation / box-shadow. */
export const elevatableBundle = {
  elevation: prop.number<ElevationLevel>(),
};

// ── Derived prop types ────────────────────────────────────────────────────────

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

// ── Size presets ──────────────────────────────────────────────────────────────

/** A preset with an entry for every ComponentSize key. */
type FullSizePreset = Record<ComponentSize, SizeConfig>;

/** A preset that may omit some ComponentSize keys (sizeVariantMixin fills the gaps with its defaults). */
type PartialSizePreset = Partial<Record<ComponentSize, SizeConfig>>;

export const FIELD_SIZE_PRESET = {
  lg: {
    '--_field-height': 'var(--size-12)',
    '--_padding': 'var(--size-2-5) var(--size-3-5)',
    fontSize: 'var(--text-base)',
    gap: 'var(--size-2-5)',
  },
  md: {
    '--_field-height': 'var(--size-10)',
    '--_padding': 'var(--size-1-5) var(--size-3)',
    fontSize: 'var(--text-sm)',
    gap: 'var(--size-2)',
  },
  sm: {
    '--_field-height': 'var(--size-8)',
    '--_padding': 'var(--size-1) var(--size-2)',
    fontSize: 'var(--text-xs)',
    gap: 'var(--size-1-5)',
  },
} satisfies FullSizePreset;

export const TEXTAREA_SIZE_PRESET = {
  lg: {
    '--_padding': 'var(--size-2-5) var(--size-3-5)',
    fontSize: 'var(--text-base)',
    gap: 'var(--size-2-5)',
  },
  md: {
    '--_padding': 'var(--size-1-5) var(--size-3)',
    fontSize: 'var(--text-sm)',
    gap: 'var(--size-2)',
  },
  sm: {
    '--_padding': 'var(--size-1) var(--size-2)',
    fontSize: 'var(--text-xs)',
    gap: 'var(--size-1-5)',
  },
} satisfies FullSizePreset;

/** Shared size preset for checkbox and radio (icon + label layout). */
export const CONTROL_SIZE_PRESET = {
  lg: {
    fontSize: 'var(--text-base)',
    gap: 'var(--size-2-5)',
    size: 'var(--size-6)',
  },
  sm: {
    fontSize: 'var(--text-xs)',
    gap: 'var(--size-1-5)',
    size: 'var(--size-4)',
  },
} satisfies PartialSizePreset;

/** Shared size preset for the switch toggle control. */
export const SWITCH_SIZE_PRESET = {
  lg: {
    fontSize: 'var(--text-base)',
    gap: 'var(--size-3)',
    height: 'var(--size-7)',
    thumbSize: 'var(--size-6)',
    width: 'var(--size-14)',
  },
  sm: {
    fontSize: 'var(--text-xs)',
    gap: 'var(--size-2)',
    height: 'var(--size-5)',
    thumbSize: 'var(--size-4)',
    width: 'var(--size-9)',
  },
} satisfies PartialSizePreset;

/** Shared size preset for the slider track/thumb. */
export const SLIDER_SIZE_PRESET = {
  lg: {
    fontSize: 'var(--text-base)',
    height: 'calc(var(--size-5) - var(--size-1))',
    size: 'var(--size-5)',
  },
  md: {
    fontSize: 'var(--text-base)',
    height: 'var(--size-3)',
    size: 'var(--size-5)',
  },
  sm: {
    fontSize: 'var(--text-xs)',
    height: 'var(--size-2)',
    size: 'var(--size-4)',
  },
} satisfies FullSizePreset;

/** Shared size preset for the file-input dropzone. */
export const FILE_INPUT_SIZE_PRESET = {
  lg: {
    '--_min-height': 'var(--size-40)',
    fontSize: 'var(--text-base)',
  },
  md: {
    '--_min-height': 'var(--size-32)',
    fontSize: 'var(--text-sm)',
  },
  sm: {
    '--_min-height': 'var(--size-28)',
    fontSize: 'var(--text-xs)',
  },
} satisfies FullSizePreset;
