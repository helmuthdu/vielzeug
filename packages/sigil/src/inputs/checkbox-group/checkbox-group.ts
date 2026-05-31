import {
  computed,
  createContext,
  define,
  defineField,
  effect,
  html,
  inject,
  prop,
  provide,
  type ReadonlySignal,
  signal,
  when,
} from '@vielzeug/craft';

import type { ComponentSize, ThemeColor } from '../../types';

import {
  type ChoiceChangeDetail,
  createChoiceField,
  createStableId,
  getChoiceLabel,
  getLightChildrenByTag,
  setBooleanAttribute,
  setMaybeAttribute,
} from '../../headless';
import { disablableBundle, sizableBundle, themableBundle } from '../../shared';
import { colorThemeMixin, disabledStateMixin, sizeVariantMixin } from '../../styles';
import { FORM_CTX, useFormContext } from '../shared/form-context';
import componentStyles from './checkbox-group.css?inline';

// ─── Context ──────────────────────────────────────────────────────────────────

export type CheckboxGroupContext = {
  color: ReadonlySignal<ThemeColor | undefined>;
  disabled: ReadonlySignal<boolean>;
  size: ReadonlySignal<ComponentSize | undefined>;
  toggle: (value: string, originalEvent?: Event) => void;
  values: ReadonlySignal<string[]>;
};

export const CHECKBOX_GROUP_CTX = createContext<CheckboxGroupContext>('CheckboxGroupContext');

// ─── Types ────────────────────────────────────────────────────────────────────

export type BitCheckboxGroupProps = {
  /** Theme color — propagated to all child bit-checkbox elements */
  color?: ThemeColor;
  /** Disable all checkboxes in the group */
  disabled?: boolean;
  /** Error message shown below the group */
  error?: string;
  /** Helper text shown below the group */
  helper?: string;
  /** Legend / label for the fieldset. Required for accessibility. */
  label?: string;
  /** Form field name used during submission */
  name?: string;
  /** Layout direction of the checkbox options */
  orientation?: 'vertical' | 'horizontal';
  /** Mark the group as required */
  required?: boolean;
  /** Size — propagated to all child bit-checkbox elements */
  size?: ComponentSize;
  /** Comma-separated list of currently checked values */
  values?: string;
};

export type BitCheckboxGroupEvents = {
  change: ChoiceChangeDetail;
};

/**
 * A fieldset wrapper that groups `bit-checkbox` elements, provides shared
 * `color` and `size` via context, and manages multi-value selection state.
 *
 * @element bit-checkbox-group
 *
 * @attr {string} label - Legend text (required for a11y)
 * @attr {string} values - Comma-separated list of checked values
 * @attr {boolean} disabled - Disable all checkboxes in the group
 * @attr {string} error - Error message
 * @attr {string} helper - Helper text
 * @attr {string} name - Form field name
 * @attr {string} color - Theme color
 * @attr {string} size - Component size: 'sm' | 'md' | 'lg'
 * @attr {string} orientation - Layout: 'vertical' | 'horizontal'
 * @attr {boolean} required - Required field
 *
 * @fires change - Emitted when selection changes. detail: { value: string, values: string[], labels: string[], originalEvent?: Event }
 *
 * @slot - Place `bit-checkbox` elements here
 *
 * @cssprop --checkbox-group-direction - Checkbox control styling token.
 * @cssprop --checkbox-group-gap - Checkbox control styling token.
 * @cssprop --color-contrast-500 - Contrast color token for text and surfaces.
 * @cssprop --color-contrast-600 - Contrast color token for text and surfaces.
 * @cssprop --color-error - Error state color token.
 * @cssprop --font-medium - Font-weight token.
 * @cssprop --leading-tight - Line-height token.
 * @cssprop --size-1-5 - Spacing/sizing token.
 * @cssprop --size-2 - Spacing/sizing token.
 * @cssprop --text-sm - Font-size token.
 * @cssprop --text-xs - Font-size token.
 * @part items - Items container.
 * @example
 * ```html
 * <bit-checkbox-group></bit-checkbox-group>
 * ```
 */
export const CHECKBOX_GROUP_TAG = 'bit-checkbox-group' as const;
define<BitCheckboxGroupProps, BitCheckboxGroupEvents>(CHECKBOX_GROUP_TAG, {
  formAssociated: true,
  props: {
    ...themableBundle,
    ...sizableBundle,
    ...disablableBundle,
    error: prop.string(),
    helper: prop.string(),
    label: prop.string(),
    name: prop.string(),
    orientation: prop.string('vertical'),
    required: prop.bool(false),
    values: prop.string(),
  },
  setup(props, { bind, el, emit, slots }) {
    const formCtx = inject(FORM_CTX);
    const fCtxProps = useFormContext(bind, props, formCtx);

    const choice = createChoiceField({
      disabled: fCtxProps.disabled,
      error: props.error,
      helper: props.helper,
      multiple: signal(true),
      prefix: 'checkbox-group',
      validateOn: formCtx?.validateOn,
      value: props.values,
    });
    const checkedValues = choice.selectedValues;

    choice.bindFormField(
      defineField<string>({ disabled: choice.disabled, toFormValue: (v) => v, value: choice.formValue }),
    );

    const getCheckboxes = (): HTMLElement[] => getLightChildrenByTag(el, 'bit-checkbox');
    const getLabelForValue = (value: string): string => getChoiceLabel(getCheckboxes(), value);
    const emitChange = (originalEvent?: Event) => {
      const values = checkedValues.value;

      const labels = values.map(getLabelForValue);

      emit('change', { labels, originalEvent, values });
    };

    const toggleCheckbox = (val: string, originalEvent?: Event) => {
      choice.toggleValue(val);
      el.setAttribute('values', choice.formValue.value);
      choice.triggerValidation('change');
      emitChange(originalEvent);
    };

    provide(CHECKBOX_GROUP_CTX, {
      color: props.color,
      disabled: computed(() => Boolean(props.disabled.value)),
      size: props.size,
      toggle: toggleCheckbox,
      values: checkedValues,
    });

    // Sync checked state + color/size/disabled onto slotted bit-checkbox children
    const syncChildren = () => {
      const values = checkedValues.value;
      const color = props.color.value;
      const size = props.size.value;
      const disabled = props.disabled.value;
      const checkboxes = getCheckboxes();

      for (const checkbox of checkboxes) {
        const val = checkbox.getAttribute('value') ?? '';

        setBooleanAttribute(checkbox, 'checked', values.includes(val));
        setMaybeAttribute(checkbox, 'color', color);
        setMaybeAttribute(checkbox, 'size', size);
        setBooleanAttribute(checkbox, 'disabled', Boolean(disabled));
      }
    };

    effect(() => {
      void slots.elements().value;
      syncChildren();
    });

    effect(() => {
      void slots.elements().value;

      const listeners = getCheckboxes().map((checkbox) => {
        const handler = (event: Event) => {
          event.stopPropagation();

          const val = (checkbox.getAttribute('value') ?? '').trim();

          if (!val) return;

          toggleCheckbox(val, event);
        };

        checkbox.addEventListener('change', handler);

        return () => {
          checkbox.removeEventListener('change', handler);
        };
      });

      return () => {
        for (const dispose of listeners) dispose();
      };
    });

    const legendId = createStableId('checkbox-group-legend');
    const errorId = `${legendId}-error`;
    const helperId = `${legendId}-helper`;
    const hasError = () => Boolean(props.error.value);
    const hasHelper = () => Boolean(props.helper.value) && !hasError();

    bind({ attr: { size: fCtxProps.size } });

    return html`
      <fieldset
        role="group"
        aria-required="${() => String(Boolean(props.required.value))}"
        aria-invalid="${() => String(hasError())}"
        aria-errormessage="${() => (hasError() ? errorId : null)}"
        aria-describedby="${() => (hasError() ? errorId : hasHelper() ? helperId : null)}">
        <legend id="${legendId}" ?hidden=${() => !props.label.value}>
          ${props.label}${when(
            () => Boolean(props.required.value),
            () => html`<span aria-hidden="true"> *</span>`,
          )}
        </legend>
        <div class="checkbox-group-items" part="items">
          <slot></slot>
        </div>
        <div class="error-text" id="${errorId}" role="alert" ?hidden=${() => !hasError()}>${props.error}</div>
        <div class="helper-text" id="${helperId}" ?hidden=${() => !hasHelper()}>${props.helper}</div>
      </fieldset>
    `;
  },
  styles: [colorThemeMixin, sizeVariantMixin(), disabledStateMixin(), componentStyles],
});
