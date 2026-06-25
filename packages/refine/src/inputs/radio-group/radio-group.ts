import { createContext, createStableId, define, useField, html, inject, prop } from '@vielzeug/ore';
import { when } from '@vielzeug/ore/directives';
import { type Readable } from '@vielzeug/ripple';

import type { ComponentSize, ThemeColor } from '../../types';

import {
  type ChoiceChangeDetail,
  lifecycleSignal,
  createChoiceField,
  createListControl,
  getChoiceLabel,
  getLightChildrenByTag,
} from '../../headless';
import { disablableBundle, sizableBundle, themableBundle } from '../../shared';
import { colorThemeMixin, disabledStateMixin, sizeVariantMixin } from '../../styles';
import { FORM_CTX, useFormContext } from '../shared/form-context';
import componentStyles from './radio-group.css?inline';

/** Radio group component properties */
export type OreRadioGroupProps = {
  /** Theme color tint */
  color?: ThemeColor;
  /** Disabled state */
  disabled?: boolean;
  /** Error message text */
  error?: string;
  /** Helper text displayed below the items */
  helper?: string;
  /** Group label text */
  label?: string;
  /** Form field name */
  name?: string;
  /** Layout orientation */
  orientation?: 'horizontal' | 'vertical';
  /** Required field */
  required?: boolean;
  /** Items size preset */
  size?: ComponentSize;
  /** Initial selected value */
  value?: string;
};

export type RadioGroupContext = {
  color: Readable<ThemeColor | undefined>;
  disabled: Readable<boolean>;
  name: Readable<string | undefined>;
  select: (value: string, originalEvent?: Event) => void;
  size: Readable<ComponentSize | undefined>;
  value: Readable<string | undefined>;
};

export const RADIO_GROUP_CTX = createContext<RadioGroupContext | undefined>('OreRadioGroup');

/** Events emitted by the radio-group component */
export type OreRadioGroupEvents = {
  /** Emitted when the selection changes */
  change: ChoiceChangeDetail;
};

/**
 * A group of radio buttons that allows users to select a single option from a set.
 * Supports keyboard navigation (arrows) and automatic value management.
 *
 * @element ore-radio-group
 *
 * @attr {string} value - Selected value
 * @attr {string} name - Form field name
 * @attr {string} label - Group label
 * @attr {string} orientation - Layout: 'vertical' | 'horizontal'
 * @attr {boolean} required - Required field
 *
 * @fires change - Emitted when a radio is selected. detail: { values: string[], labels: string[], originalEvent?: Event }
 *
 * @slot - Place `ore-radio` elements here
 *
 * @cssprop --radio-group-direction - Flex direction of the items list ('row' | 'column')
 * @cssprop --radio-group-gap - Gap between radio items
 * @part items - Items container.
 * @example
 * ```html
 * <ore-radio-group name="plan" label="Choose a plan" value="free" required>
 *   <ore-radio value="free">Free</ore-radio>
 *   <ore-radio value="pro">Pro</ore-radio>
 *   <ore-radio value="enterprise">Enterprise</ore-radio>
 * </ore-radio-group>
 * <ore-radio-group name="direction" orientation="horizontal" color="primary">
 *   <ore-radio value="left">Left</ore-radio>
 *   <ore-radio value="right">Right</ore-radio>
 * </ore-radio-group>
 * ```
 */
export const RADIO_GROUP_TAG = 'ore-radio-group' as const;
define<OreRadioGroupProps, OreRadioGroupEvents>(RADIO_GROUP_TAG, {
  formAssociated: true,
  props: {
    ...themableBundle,
    ...sizableBundle,
    ...disablableBundle,
    error: prop.string(),
    helper: prop.string(),
    label: prop.string(),
    name: prop.string(),
    orientation: prop.oneOf(['horizontal', 'vertical'] as const, 'vertical'),
    required: prop.bool(false),
    value: prop.string(),
  },
  setup(props, { bind, el, emit, onCleanup, provide, slots, watch }) {
    const formCtx = inject(FORM_CTX);
    const fCtxProps = useFormContext(bind, props, formCtx);

    let _formField: { reportValidity(): void } | null = null;
    const choice = createChoiceField({
      disabled: fCtxProps.disabled,
      error: props.error,
      getFormField: () => _formField,
      helper: props.helper,
      label: props.label,
      prefix: 'radio-group',
      signal: lifecycleSignal(onCleanup),
      validateOn: formCtx?.validateOn,
      value: props.value,
    });

    _formField = useField<string>({ disabled: choice.disabled, toFormValue: (v) => v, value: choice.formValue });

    const selectedValue = choice.selectedValue;
    const isDisabled = fCtxProps.disabled;

    bind({
      attr: {
        size: fCtxProps.size,
        value: () => selectedValue.value || null,
      },
    });

    const getSlottedRadios = (): HTMLElement[] => getLightChildrenByTag(el, 'ore-radio');

    const getEnabledRadios = (): HTMLElement[] =>
      isDisabled.value ? [] : getSlottedRadios().filter((radio) => !radio.hasAttribute('disabled'));

    const getLabelForValue = (value: string): string => getChoiceLabel(getSlottedRadios(), value);

    const selectRadio = (val: string, originalEvent?: Event): void => {
      choice.setValues(val ? [val] : []);

      const labels = val ? [getLabelForValue(val)] : [];
      const values = val ? [val] : [];

      emit('change', { labels, originalEvent, values });
      choice.triggerValidation('blur');
    };

    provide(RADIO_GROUP_CTX, {
      color: props.color as Readable<ThemeColor | undefined>,
      disabled: isDisabled,
      name: props.name,
      select: selectRadio,
      size: props.size as Readable<ComponentSize | undefined>,
      value: selectedValue,
    });

    // Sync name/color/size/disabled/checked onto slotted ore-radio children.
    watch(() => {
      void slots.elements().value;
      void selectedValue.value;

      const radios = getSlottedRadios();

      for (const radio of radios) {
        const val = radio.getAttribute('value') ?? '';

        radio.toggleAttribute('checked', val === selectedValue.value);

        if (props.name.value) radio.setAttribute('name', props.name.value);
        else radio.removeAttribute('name');

        if (props.color.value) radio.setAttribute('color', props.color.value);
        else radio.removeAttribute('color');

        if (props.size.value) radio.setAttribute('size', props.size.value);
        else radio.removeAttribute('size');

        radio.toggleAttribute('disabled', isDisabled.value);
      }
    });

    // Roving tabindex: only the selected (or first) radio is tabbable.
    watch(() => {
      void slots.elements().value;

      const radios = getSlottedRadios();
      let hasFocusable = false;

      for (const radio of radios) {
        const isSelected = radio.getAttribute('value') === selectedValue.value;

        radio.setAttribute('tabindex', isSelected && !isDisabled.value ? '0' : '-1');

        if (isSelected && !isDisabled.value) hasFocusable = true;
      }

      if (!hasFocusable && radios.length > 0) {
        const first = radios.find((r) => !r.hasAttribute('disabled'));

        if (first) first.setAttribute('tabindex', '0');
      }
    });

    const listControl = createListControl<HTMLElement>({
      getItems: getEnabledRadios,
      keys: { next: ['ArrowDown', 'ArrowRight'], prev: ['ArrowUp', 'ArrowLeft'] },
      loop: true,
      onNavigate: (_action, index, event) => {
        const radio = getEnabledRadios()[index];

        if (!radio) return;

        radio.focus();

        if (radio.tagName === 'ORE-RADIO') {
          selectRadio(radio.getAttribute('value') ?? '', event);
        }
      },
    });

    bind({
      on: {
        change: (e: Event) => {
          if (e.target === el) return;

          e.stopPropagation();
          selectRadio((e.target as HTMLElement).getAttribute('value') ?? '', e);
        },
        keydown: (e: KeyboardEvent) => {
          const radios = getEnabledRadios();

          if (!radios.length) return;

          const focused = radios.indexOf(document.activeElement as HTMLElement);

          if (focused === -1) return;

          listControl.set(focused);
          listControl.handleKeydown(e);
        },
      },
    });

    const legendId = createStableId('radio-group-legend');

    return html`
      <fieldset
        role="radiogroup"
        aria-required="${() => String(Boolean(props.required.value))}"
        :aria-invalid="${choice.ariaInvalid}"
        :aria-errormessage="${choice.ariaErrorMessage}"
        :aria-describedby="${choice.ariaDescribedBy}">
        <legend id="${legendId}" ?hidden=${() => !props.label.value}>
          ${props.label}${when(
            () => Boolean(props.required.value),
            () => html`<span aria-hidden="true"> *</span>`,
          )}
        </legend>
        <div class="radio-group-items" part="items">
          <slot></slot>
        </div>
        <div
          class="helper-text"
          part="helper"
          id="${choice.assistiveId}"
          :role="${() => (choice.errorText.value ? 'alert' : null)}"
          aria-live="polite"
          ?hidden="${() => !choice.errorText.value && !choice.helperText.value}">
          ${() => choice.errorText.value || choice.helperText.value}
        </div>
      </fieldset>
    `;
  },
  styles: [colorThemeMixin, sizeVariantMixin(), disabledStateMixin, componentStyles],
});
