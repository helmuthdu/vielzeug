import { define, html, prop, bind, getHost, provide, useEmit } from '@vielzeug/ore';
import { computed } from '@vielzeug/ripple';

import type { ValidationTrigger } from '../../headless';
import type { ComponentSize, VisualVariant } from '../../types';

import { FORM_CTX } from '../shared/form-context';
import componentStyles from './form.css?inline';

/** Form component properties */
export type OreFormProps = {
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
export type OreFormEvents = {
  /** Emitted when the form is reset */
  reset: { originalEvent: Event };
  /** Emitted when the form is submitted */
  submit: { formData: FormData; originalEvent: SubmitEvent };
};

/**
 * A wrapper for standard HTML form that provides context to child ore-* form fields.
 * Manages shared state like size, variant, and validation timing.
 *
 * @element ore-form
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
 * <ore-form @submit=${(e) => console.log(e.detail.formData)}>
 *   <ore-input name="username" label="Username" required></ore-input>
 *   <ore-select name="role" label="Role">
 *     <option value="user">User</option>
 *     <option value="admin">Admin</option>
 *   </ore-select>
 *   <ore-button type="submit">Submit</ore-button>
 * </ore-form>
 * ```
 */
export const FORM_TAG = 'ore-form' as const;
define<OreFormProps>(FORM_TAG, {
  props: {
    disabled: prop.bool(false),
    novalidate: prop.bool(false),
    orientation: prop.oneOf(['horizontal', 'vertical'] as const, 'vertical'),
    size: prop.string<ComponentSize>(),
    validateOn: prop.oneOf(['submit', 'change', 'blur', 'input'] as const, 'submit'),
    variant: prop.string<VisualVariant>(),
  },
  setup(props) {
    const el = getHost();
    const emit = useEmit<OreFormEvents>();

    const shadowRoot = el.shadowRoot;

    // Reflect orientation to host so CSS and tests can read it
    bind({ attr: { orientation: props.orientation } });
    // Provide context to all child ore-* form fields
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
