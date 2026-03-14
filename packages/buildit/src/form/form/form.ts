import { createContext, css, define, defineEmits, defineProps, effect, html, provide, signal } from '@vielzeug/craftit';

import type { AddEventListeners, ComponentSize, VisualVariant } from '../../types';

// ============================================
// Context
// ============================================

export interface FormContext {
  /** Whether all child fields are disabled */
  disabled: { readonly value: boolean };
  /** Default size propagated to all child form fields */
  size: { readonly value: ComponentSize | undefined };
  /** Default variant propagated to all child form fields */
  variant: { readonly value: Exclude<VisualVariant, 'glass' | 'frost' | 'text'> | undefined };
  /**
   * When to validate child form controls:
   * - `'submit'` (default): only on form submit
   * - `'blur'`: validate each field when it loses focus
   * - `'change'`: validate on every value change
   */
  validateOn: { readonly value: 'submit' | 'blur' | 'change' };
}

export const FORM_CTX = createContext<FormContext>();

// ============================================
// Styles
// ============================================

const componentStyles = /* css */ css`
  @layer buildit.base {
    :host {
      display: block;
    }

    form {
      display: grid;
      gap: var(--form-gap, var(--size-4, 1rem));
      align-items: start;
    }
  }

  @layer buildit.orientation {
    :host([orientation='horizontal']) form {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
    }
  }
`;

// ============================================
// Types
// ============================================

export interface FormProps {
  /** Disable all child form fields */
  disabled?: boolean;
  /** Default size for all child fields */
  size?: ComponentSize;
  /** Default variant for all child fields */
  variant?: Exclude<VisualVariant, 'glass' | 'frost' | 'text'>;
  /** Form layout orientation */
  orientation?: 'vertical' | 'horizontal';
  /** Native form novalidate */
  novalidate?: boolean;
  /**
   * When to validate child form controls.
   * - `'submit'` (default): validate only when the form is submitted
   * - `'blur'`: validate each field as it loses focus
   * - `'change'`: validate on every value change (most immediate feedback)
   */
  validateOn?: 'submit' | 'blur' | 'change';
}

export interface BitFormEvents {
  submit: CustomEvent<{ formData: FormData; originalEvent: SubmitEvent }>;
  reset: CustomEvent<{ originalEvent: Event }>;
}

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
export const TAG = define(
  'bit-form',
  ({ host }) => {
    const props = defineProps<FormProps>({
      disabled: { default: false },
      novalidate: { default: false },
      orientation: { default: 'vertical' },
      size: { default: undefined },
      validateOn: { default: 'submit' },
      variant: { default: undefined },
    });

    const emit = defineEmits<{
      reset: { originalEvent: Event };
      submit: { formData: FormData; originalEvent: SubmitEvent };
    }>();

    // Provide context to all child bit-* form fields
    provide(FORM_CTX, {
      disabled: {
        get value() {
          return Boolean(props.disabled.value);
        },
      },
      size: {
        get value() {
          return props.size.value;
        },
      },
      validateOn: {
        get value() {
          return props.validateOn.value ?? 'submit';
        },
      },
      variant: {
        get value() {
          return props.variant.value;
        },
      },
    });

    // Internal signals so the template can subscribe reactively
    const isDisabled = signal(false);
    const novalidate = signal(false);

    effect(() => {
      isDisabled.value = Boolean(props.disabled.value);
    });
    effect(() => {
      novalidate.value = Boolean(props.novalidate.value);
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
          :novalidate="${() => novalidate.value}"
          :aria-disabled="${() => (isDisabled.value ? 'true' : null)}"
          @submit="${handleSubmit}"
          @reset="${handleReset}">
          <slot></slot>
        </form>
      `,
    };
  },
  { shadow: { delegatesFocus: false } },
);

declare global {
  interface HTMLElementTagNameMap {
    'bit-form': HTMLElement & FormProps & AddEventListeners<BitFormEvents>;
  }
}
