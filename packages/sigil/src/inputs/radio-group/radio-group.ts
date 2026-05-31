import {
  createContext,
  define,
  defineField,
  effect,
  html,
  inject,
  prop,
  provide,
  type ReadonlySignal,
  when,
} from '@vielzeug/craft';

import type { ComponentSize, ThemeColor } from '../../types';

import {
  type ChoiceChangeDetail,
  createChoiceField,
  createListControl,
  createStableId,
  getChoiceLabel,
  getLightChildrenByTag,
  setBooleanAttribute,
  setMaybeAttribute,
} from '../../headless';
import { disablableBundle, sizableBundle, themableBundle } from '../../shared';
import { colorThemeMixin, disabledStateMixin, sizeVariantMixin } from '../../styles';
import { FORM_CTX, useFormContext } from '../shared/form-context';
import componentStyles from './radio-group.css?inline';

/** Radio group component properties */
export type BitRadioGroupProps = {
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
  color: ReadonlySignal<ThemeColor | undefined>;
  disabled: ReadonlySignal<boolean>;
  name: ReadonlySignal<string | undefined>;
  select: (value: string, originalEvent?: Event) => void;
  size: ReadonlySignal<ComponentSize | undefined>;
  value: ReadonlySignal<string | undefined>;
};

export const RADIO_GROUP_CTX = createContext<RadioGroupContext | undefined>('BitRadioGroup');

/** Events emitted by the radio-group component */
export type BitRadioGroupEvents = {
  /** Emitted when the selection changes */
  change: ChoiceChangeDetail;
};

/**
 * A group of radio buttons that allows users to select a single option from a set.
 * Supports keyboard navigation (arrows) and automatic value management.
 *
 * @element bit-radio-group
 *
 * @attr {string} value - Selected value
 * @attr {string} name - Form field name
 * @attr {string} label - Group label
 * @attr {string} orientation - Layout: 'vertical' | 'horizontal'
 * @attr {boolean} required - Required field
 *
 * @fires change - Emitted when a radio is selected. detail: { values: string[], labels: string[], originalEvent?: Event }
 *
 * @slot - Place `bit-radio` elements here
 *
 * @cssprop --color-contrast-500 - Contrast color token for text and surfaces.
 * @cssprop --color-contrast-600 - Contrast color token for text and surfaces.
 * @cssprop --color-error - Error state color token.
 * @cssprop --font-medium - Font-weight token.
 * @cssprop --leading-tight - Line-height token.
 * @cssprop --radio-group-direction - Radio control styling token.
 * @cssprop --radio-group-gap - Radio control styling token.
 * @cssprop --size-1-5 - Spacing/sizing token.
 * @cssprop --size-2 - Spacing/sizing token.
 * @cssprop --text-sm - Font-size token.
 * @cssprop --text-xs - Font-size token.
 * @part items - Items container.
 * @example
 * ```html
 * <bit-radio-group></bit-radio-group>
 * ```
 */
export const RADIO_GROUP_TAG = 'bit-radio-group' as const;
define<BitRadioGroupProps, BitRadioGroupEvents>(RADIO_GROUP_TAG, {
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
  setup(props, { bind, el, emit, slots }) {
    const formCtx = inject(FORM_CTX);
    const fCtxProps = useFormContext(bind, props, formCtx);

    const choice = createChoiceField({
      disabled: fCtxProps.disabled,
      error: props.error,
      helper: props.helper,
      label: props.label,
      prefix: 'radio-group',
      validateOn: formCtx?.validateOn,
      value: props.value,
    });

    choice.bindFormField(
      defineField<string>({ disabled: choice.disabled, toFormValue: (v) => v, value: choice.formValue }),
    );

    const selectedValue = choice.selectedValue;
    const isDisabled = fCtxProps.disabled;

    bind({
      attr: {
        size: fCtxProps.size,
        value: () => selectedValue.value || null,
      },
    });

    const getSlottedRadios = (): HTMLElement[] => getLightChildrenByTag(el, 'bit-radio');

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
      color: props.color as ReadonlySignal<ThemeColor | undefined>,
      disabled: isDisabled,
      name: props.name,
      select: selectRadio,
      size: props.size as ReadonlySignal<ComponentSize | undefined>,
      value: selectedValue,
    });

    // Sync name/color/size/disabled/checked onto slotted bit-radio children.
    effect(() => {
      void slots.elements().value;
      void selectedValue.value;

      const radios = getSlottedRadios();

      for (const radio of radios) {
        const val = radio.getAttribute('value') ?? '';

        setBooleanAttribute(radio, 'checked', val === selectedValue.value);
        setMaybeAttribute(radio, 'name', props.name.value);
        setMaybeAttribute(radio, 'color', props.color.value);
        setMaybeAttribute(radio, 'size', props.size.value);
        setBooleanAttribute(radio, 'disabled', isDisabled.value);
      }
    });

    // Roving tabindex: only the selected (or first) radio is tabbable.
    effect(() => {
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
      getIndex: () => getEnabledRadios().indexOf(document.activeElement as HTMLElement),
      getItems: getEnabledRadios,
      keys: { next: ['ArrowDown', 'ArrowRight'], prev: ['ArrowUp', 'ArrowLeft'] },
      loop: true,
      onNavigate: (_action, _index, event) => {
        const activeRadio = document.activeElement as HTMLElement | null;

        if (activeRadio?.tagName === 'BIT-RADIO') {
          selectRadio(activeRadio.getAttribute('value') ?? '', event);
        }
      },
      setIndex: (index) => {
        const radio = getEnabledRadios()[index];

        if (!radio) return;

        radio.focus();
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

          listControl.handleKeydown(e);
        },
      },
    });

    const { aria } = choice;
    const legendId = createStableId('radio-group-legend');

    return html`
      <fieldset
        role="radiogroup"
        aria-required="${() => String(Boolean(props.required.value))}"
        :aria-invalid="${aria.invalid}"
        :aria-errormessage="${aria.errorMessage}"
        :aria-describedby="${aria.describedBy}">
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
          :role="${() => (choice.assistive.value.errorText ? 'alert' : null)}"
          aria-live="polite"
          ?hidden="${() => !choice.assistive.value.errorText && !choice.assistive.value.helperText}">
          ${() => choice.assistive.value.errorText || choice.assistive.value.helperText}
        </div>
      </fieldset>
    `;
  },
  styles: [colorThemeMixin, sizeVariantMixin(), disabledStateMixin(), componentStyles],
});
