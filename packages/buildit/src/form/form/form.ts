import {
  computed,
  createContext,
  define,
  defineEmits,
  defineProps,
  html,
  provide,
  type ReadonlySignal,
} from '@vielzeug/craftit';

import type { ComponentSize, VisualVariant } from '../../types';

// ============================================
// Context
// ============================================

export type FormContext = {
  /** Whether all child fields are disabled */
  disabled: ReadonlySignal<boolean>;
  /** Default size propagated to all child form fields */
  size: ReadonlySignal<ComponentSize | undefined>;
  /**
   * When to validate child form controls:
   * - `'submit'` (default): only on form submit
   * - `'blur'`: validate each field when it loses focus
   * - `'change'`: validate on every value change
   */
  validateOn: ReadonlySignal<'submit' | 'blur' | 'change'>;
  /** Default variant propagated to all child form fields */
  variant: ReadonlySignal<Exclude<VisualVariant, 'glass' | 'frost' | 'text'> | undefined>;
};

export const FORM_CTX = createContext<FormContext>();

// ============================================
// Styles
// ============================================

import componentStyles from './form.css?inline';

// ============================================
// Types
// ============================================

export type BitFormEvents = {
  reset: { originalEvent: Event };
  submit: { formData: FormData; originalEvent: SubmitEvent };
};

export type BitFormProps = {
  /** Disable all child form fields */
  disabled?: boolean;
  /** Native form novalidate */
  novalidate?: boolean;
  /** Form layout orientation */
  orientation?: 'vertical' | 'horizontal';
  /** Default size for all child fields */
  size?: ComponentSize;
  /**
   * When to validate child form controls.
   * - `'submit'` (default): validate only when the form is submitted
   * - `'blur'`: validate each field as it loses focus
   * - `'change'`: validate on every value change (most immediate feedback)
   */
  validateOn?: 'submit' | 'blur' | 'change';
  /** Default variant for all child fields */
  variant?: Exclude<VisualVariant, 'glass' | 'frost' | 'text'>;
};

/**
 * `bit-form` — Native `<form>` wrapper that propagates `disabled`, `size`, and `variant`
 * context to all child `bit-*` form fields. Intercepts submit/reset events.
 *
 * @element bit-form
 *
 * @attr {boolean} disabled - Disable all child form fields
 * @attr {string} size - Default size: 'sm' | 'md' | 'lg'
 * @attr {string} variant - Default visual variant for child fields
 * @attr {string} orientation - Layout direction: 'vertical' | 'horizontal'
 * @attr {boolean} novalidate - Skip native browser validation
 *
 * @fires submit - Fired on form submit; detail contains `formData` and `originalEvent`
 * @fires reset  - Fired on form reset; detail contains `originalEvent`
 *
 * @slot - Form content (bit-input, bit-select, etc.)
 *
 * @cssprop --form-gap - Spacing between child form controls
 *
 * @example
 * ```html
 * <bit-form id="my-form" size="sm" variant="flat">
 *   <bit-input name="email" label="Email" type="email"></bit-input>
 *   <bit-select name="role" label="Role">
 *     <option value="admin">Admin</option>
 *   </bit-select>
 *   <bit-button type="submit">Submit</bit-button>
 * </bit-form>
 * ```
 */
export const FORM_TAG = define(
  'bit-form',
  ({ host }) => {
    const props = defineProps<BitFormProps>({
      disabled: { default: false },
      novalidate: { default: false },
      orientation: { default: 'vertical' },
      size: { default: undefined },
      validateOn: { default: 'submit' },
      variant: { default: undefined },
    });

    const emit = defineEmits<BitFormEvents>();

    // Provide context to all child bit-* form fields
    provide(FORM_CTX, {
      disabled: computed(() => Boolean(props.disabled.value)),
      size: props.size,
      validateOn: computed(() => props.validateOn.value ?? 'submit'),
      variant: props.variant,
    });

    // ── Event handlers ────────────────────────────────────────────────────────

    function handleSubmit(e: Event) {
      const submitEvent = e as SubmitEvent;
      const formEl = host.shadowRoot?.querySelector('form');

      if (!formEl) return;

      e.preventDefault();

      const formData = new FormData(formEl);

      emit('submit', { formData, originalEvent: submitEvent });
    }

    function handleReset(e: Event) {
      emit('reset', { originalEvent: e });
    }

    return {
      styles: [componentStyles],
      template: html`
        <form
          part="form"
          :novalidate="${() => props.novalidate.value || null}"
          :aria-disabled="${() => (props.disabled.value ? 'true' : null)}"
          @submit="${handleSubmit}"
          @reset="${handleReset}">
          <slot></slot>
        </form>
      `,
    };
  },
  { shadow: { delegatesFocus: false } },
);
