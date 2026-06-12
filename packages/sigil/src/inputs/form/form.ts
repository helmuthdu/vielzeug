import { computed, define, html, prop, provide } from '@vielzeug/craft';

import type { ValidationTrigger } from '../../headless';
import type { ComponentSize, VisualVariant } from '../../types';

import { FORM_CTX } from '../shared/form-context';
import componentStyles from './form.css?inline';

/** Form component properties */
export type SgFormProps = {
  /** Disabled state */
  disabled?: boolean;
  /** No validate */
  novalidate?: boolean;
  /** Layout orientation for child fields */
  orientation?: 'horizontal' | 'vertical';
  /** Form size preset */
  size?: ComponentSize;
  /** Validate on: 'submit' | 'change' | 'blur' | 'input' */
  validateOn?: ValidationTrigger;
  /** Form visual variant — propagated to all child form fields via FormContext */
  variant?: VisualVariant;
};

/** Events emitted by the form component */
export type SgFormEvents = {
  /** Emitted when the form is reset */
  reset: { originalEvent: Event };
  /** Emitted when the form is submitted */
  submit: { formData: FormData; originalEvent: SubmitEvent };
};

/**
 * A wrapper for standard HTML form that provides context to child sg-* form fields.
 * Manages shared state like size, variant, and validation timing.
 *
 * @element sg-form
 *
 * @attr {boolean} disabled - Disable all child fields
 * @attr {boolean} novalidate - Disable native browser validation
 * @attr {string} validate-on - When to trigger validation: 'submit' | 'change' | 'blur' | 'input' (default: 'submit')
 *
 * @fires submit - detail: { formData, originalEvent }
 * @fires reset - detail: { originalEvent }
 *
 * @slot - Form controls and content rendered inside the form element.
 * @cssprop --form-gap - Gap between form control rows
 * @part form - Form root element.
 * @example
 * ```html
 * <sg-form @submit=${(e) => console.log(e.detail.formData)}>
 *   <sg-input name="username" label="Username" required></sg-input>
 *   <sg-select name="role" label="Role">
 *     <option value="user">User</option>
 *     <option value="admin">Admin</option>
 *   </sg-select>
 *   <sg-button type="submit">Submit</sg-button>
 * </sg-form>
 * ```
 */
export const FORM_TAG = 'sg-form' as const;
define<SgFormProps, SgFormEvents>(FORM_TAG, {
  props: {
    disabled: prop.bool(false),
    novalidate: prop.bool(false),
    orientation: prop.oneOf(['horizontal', 'vertical'] as const, 'vertical'),
    size: prop.string<ComponentSize>(),
    validateOn: prop.oneOf(['submit', 'change', 'blur', 'input'] as const, 'submit'),
    variant: prop.string<VisualVariant>(),
  },
  setup(props, { bind, el, emit }) {
    const shadowRoot = el.shadowRoot;

    // Reflect orientation to host so CSS and tests can read it
    bind({ attr: { orientation: props.orientation } });
    // Provide context to all child sg-* form fields
    provide(FORM_CTX, {
      disabled: computed(() => Boolean(props.disabled.value)),
      size: props.size,
      validateOn: computed(() => props.validateOn.value ?? 'submit'),
      variant: props.variant,
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

    return html`
      <form
        part="form"
        :novalidate="${props.novalidate}"
        :aria-disabled="${() => (props.disabled.value ? 'true' : null)}"
        @submit="${handleSubmit}"
        @reset="${handleReset}">
        <slot></slot>
      </form>
    `;
  },
  shadow: { delegatesFocus: false },
  styles: [componentStyles],
});
