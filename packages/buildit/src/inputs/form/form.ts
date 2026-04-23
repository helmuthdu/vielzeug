import { computed, define, html, prop, provide } from '@vielzeug/craftit';

import { FORM_CTX } from '../shared/form-context';
import componentStyles from './form.css?inline';

/** Form component properties */
export type BitFormProps = {
  /** Disabled state */
  disabled?: boolean;
  /** No validate */
  novalidate?: boolean;
  /** Layout orientation for child fields */
  orientation?: 'horizontal' | 'vertical';
  /** Form size preset */
  size?: string;
  /** Validate on: 'submit' | 'change' | 'blur' | 'input' */
  validateOn?: 'submit' | 'change' | 'blur' | 'input';
  /** Form visual variant */
  variant?: string;
};

/** Events emitted by the form component */
export type BitFormEvents = {
  /** Emitted when the form is reset */
  reset: { originalEvent: Event };
  /** Emitted when the form is submitted */
  submit: { formData: FormData; originalEvent: SubmitEvent };
};

/**
 * A wrapper for standard HTML form that provides context to child bit-* form fields.
 * Manages shared state like size, variant, and validation timing.
 *
 * @element bit-form
 *
 * @attr {boolean} disabled - Disable all child fields
 * @attr {boolean} novalidate - Disable native browser validation
 * @attr {string} validate-on - When to trigger validation: 'submit' | 'change' | 'blur' | 'input' (default: 'submit')
 *
 * @fires submit - detail: { formData, originalEvent }
 * @fires reset - detail: { originalEvent }
 *
 * @example
 * ```html
 * <bit-form @submit=${(e) => console.log(e.detail.formData)}>
 *   <bit-input name="username" label="Username" required></bit-input>
 *   <bit-select name="role" label="Role">
 *     <option value="user">User</option>
 *     <option value="admin">Admin</option>
 *   </bit-select>
 *   <bit-button type="submit">Submit</bit-button>
 * </bit-form>
 * ```
 */
export const FORM_TAG = define<BitFormProps, BitFormEvents>('bit-form', {
  props: {
    disabled: false,
    novalidate: false,
    orientation: prop.oneOf(['horizontal', 'vertical'] as const, 'vertical'),
    size: undefined,
    validateOn: prop.oneOf(['submit', 'change', 'blur', 'input'] as const, 'submit'),
    variant: undefined,
  },
  setup(props, { emit, host }) {
    const shadowRoot = host.el.shadowRoot;

    // Reflect orientation to host so CSS and tests can read it
    host.bind({ attr: { orientation: props.orientation } });
    // Provide context to all child bit-* form fields
    provide(FORM_CTX, {
      disabled: computed(() => Boolean(props.disabled.value)),
      size: props.size as any,
      validateOn: computed(() => props.validateOn.value ?? 'submit') as any,
      variant: props.variant as any,
    });

    function handleSubmit(e: Event) {
      const submitEvent = e as SubmitEvent;
      const formEl = shadowRoot?.querySelector('form');

      if (!formEl) return;

      e.preventDefault();

      const formData = new FormData(formEl);

      emit('submit', { formData, originalEvent: submitEvent });
    }

    function handleReset(e: Event) {
      emit('reset', { originalEvent: e });
    }

    return {
      render: () => html`
        <form
          part="form"
          :novalidate="${props.novalidate}"
          :aria-disabled="${() => (props.disabled.value ? 'true' : null)}"
          @submit="${handleSubmit}"
          @reset="${handleReset}">
          <slot></slot>
        </form>
      `,
    };
  },
  shadow: { delegatesFocus: false },
  styles: [componentStyles],
});
