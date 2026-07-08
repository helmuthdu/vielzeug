import {
  createContext,
  createStableId,
  define,
  html,
  inject,
  prop,
  bind,
  getHost,
  onCleanup,
  provide,
  useEmit,
  useSlots,
  watchEffect,
} from '@vielzeug/ore';
import { when } from '@vielzeug/ore/directives';
import { useField } from '@vielzeug/ore/forms';
import { computed, type Readable, signal } from '@vielzeug/ripple';

import type { ComponentSize, ThemeColor } from '../../types';

import {
  type ChoiceChangeDetail,
  lifecycleSignal,
  createChoiceField,
  getChoiceLabel,
  getLightChildrenByTag,
} from '../../headless';
import { disablableBundle, sizableBundle, themableBundle } from '../../shared';
import { colorThemeMixin, disabledStateMixin, sizeVariantMixin } from '../../styles';
import { FORM_CTX, useFormContext } from '../shared/form-context';
import componentStyles from './checkbox-group.css?inline';

// ─── Context ──────────────────────────────────────────────────────────────────

export type CheckboxGroupContext = {
  color: Readable<ThemeColor | undefined>;
  disabled: Readable<boolean>;
  size: Readable<ComponentSize | undefined>;
  toggle: (value: string, originalEvent?: Event) => void;
  values: Readable<string[]>;
};

export const CHECKBOX_GROUP_CTX = createContext<CheckboxGroupContext>('CheckboxGroupContext');

// ─── Types ────────────────────────────────────────────────────────────────────

export type OreCheckboxGroupProps = {
  /** Theme color — propagated to all child ore-checkbox elements */
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
  /** Size — propagated to all child ore-checkbox elements */
  size?: ComponentSize;
  /** Comma-separated list of currently checked values */
  values?: string;
};

export type OreCheckboxGroupEvents = {
  change: ChoiceChangeDetail;
};

/**
 * A fieldset wrapper that groups `ore-checkbox` elements, provides shared
 * `color` and `size` via context, and manages multi-value selection state.
 *
 * @element ore-checkbox-group
 *
 * @attr {string} label - Legend text (required for a11y)
 * @attr {string} values - Comma-separated list of checked values
 * @attr {boolean} disabled - Disable all checkboxes in the group
 * @attr {string} error - Error message
 * @attr {string} helper - Helper text
 * @attr {string} name - Form field name
 * @attr {string} color - Theme color: 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error'
 * @attr {string} size - Component size: 'sm' | 'md' | 'lg'
 * @attr {string} orientation - Layout: 'vertical' | 'horizontal'
 * @attr {boolean} required - Required field
 *
 * @fires change - Emitted when selection changes. detail: { value: string, values: string[], labels: string[], originalEvent?: Event }
 *
 * @slot - Place `ore-checkbox` elements here
 *
 * @cssprop --checkbox-group-direction - Flex direction of the items list ('row' | 'column')
 * @cssprop --checkbox-group-gap - Gap between checkbox items
 * @part items - Items container.
 * @example
 * ```html
 * <ore-checkbox-group name="fruits" label="Favourite fruits" required>
 *   <ore-checkbox value="apple">Apple</ore-checkbox>
 *   <ore-checkbox value="banana">Banana</ore-checkbox>
 *   <ore-checkbox value="cherry">Cherry</ore-checkbox>
 * </ore-checkbox-group>
 * <ore-checkbox-group name="options" orientation="horizontal" color="primary">
 *   <ore-checkbox value="a">Option A</ore-checkbox>
 *   <ore-checkbox value="b">Option B</ore-checkbox>
 * </ore-checkbox-group>
 * ```
 */
export const CHECKBOX_GROUP_TAG = 'ore-checkbox-group' as const;
define<OreCheckboxGroupProps>(CHECKBOX_GROUP_TAG, {
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
  setup(props) {
    const el = getHost();
    const emit = useEmit<OreCheckboxGroupEvents>();
    const slots = useSlots();
    const watch = watchEffect;

    const formCtx = inject(FORM_CTX);
    const fCtxProps = useFormContext(props, formCtx);

    let _formField: { reportValidity(): void } | null = null;
    const choice = createChoiceField({
      disabled: fCtxProps.disabled,
      error: props.error,
      getFormField: () => _formField,
      helper: props.helper,
      multiple: signal(true),
      prefix: 'checkbox-group',
      signal: lifecycleSignal(onCleanup),
      validateOn: formCtx?.validateOn,
      value: props.values,
    });

    _formField = useField<string>({ disabled: choice.disabled, toFormValue: (v) => v, value: choice.formValue });

    const checkedValues = choice.selectedValues;

    const getCheckboxes = (): HTMLElement[] => getLightChildrenByTag(el, 'ore-checkbox');
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

    // Sync checked state + color/size/disabled onto slotted ore-checkbox children
    const syncChildren = () => {
      const values = checkedValues.value;
      const color = props.color.value;
      const size = props.size.value;
      const disabled = props.disabled.value;
      const checkboxes = getCheckboxes();

      for (const checkbox of checkboxes) {
        const val = checkbox.getAttribute('value') ?? '';

        checkbox.toggleAttribute('checked', values.includes(val));

        if (color) checkbox.setAttribute('color', color);
        else checkbox.removeAttribute('color');

        if (size) checkbox.setAttribute('size', size);
        else checkbox.removeAttribute('size');

        checkbox.toggleAttribute('disabled', Boolean(disabled));
      }
    };

    watch(() => {
      void slots.elements().value;
      syncChildren();
    });

    watch(() => {
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
  styles: [colorThemeMixin, sizeVariantMixin(), disabledStateMixin, componentStyles],
});
