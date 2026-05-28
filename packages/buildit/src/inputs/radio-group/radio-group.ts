import {
  createContext,
  define,
  effect,
  html,
  inject,
  prop,
  provide,
  type ReadonlySignal,
  signal,
  watch,
  when,
} from '@vielzeug/craftit';

import {
  createListControl,
  createStableId,
  type ChoiceChangeDetail,
  getChoiceLabel,
  getLightChildrenByTag,
  setBooleanAttribute,
  setMaybeAttribute,
} from '../../headless';
import { colorThemeMixin, disabledStateMixin, sizeVariantMixin } from '../../styles';
import { FORM_CTX, useFormContext } from '../shared/form-context';
import componentStyles from './radio-group.css?inline';

/** Radio group component properties */
export type BitRadioGroupProps = {
  /** Theme color tint */
  color?: string;
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
  size?: string;
  /** Initial selected value */
  value?: string;
};

/** Shared context for radio groups */
export type RadioGroupContext = {
  color: ReadonlySignal<string | undefined>;
  disabled: ReadonlySignal<boolean>;
  name: ReadonlySignal<string | undefined>;
  select: (value: string, originalEvent?: Event) => void;
  size: ReadonlySignal<string | undefined>;
  value: ReadonlySignal<string>;
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
 * @fires change - Emitted when a radio is selected. detail: { value: string, values: string[], labels: string[], originalEvent?: Event }
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
export const RADIO_GROUP_TAG = define<BitRadioGroupProps, BitRadioGroupEvents>('bit-radio-group', {
  props: {
    color: prop.string(),
    disabled: prop.bool(false),
    error: prop.string(),
    helper: prop.string(),
    label: prop.string(),
    name: prop.string(),
    orientation: prop.oneOf(['horizontal', 'vertical'] as const, 'vertical'),
    required: prop.bool(false),
    size: prop.string(),
    value: prop.string(),
  },
  setup(props, { bind, el, emit, slots }) {
    const selectedValue = signal((props.value.value as string | undefined) ?? '');
    const formCtx = inject(FORM_CTX);
    const fCtxProps = useFormContext(bind, props, formCtx);
    const isDisabled = fCtxProps.disabled;

    bind({
      attr: {
        size: fCtxProps.size,
        value: () => selectedValue.value || null,
      },
    });

    watch(
      props.value,
      (v) => {
        selectedValue.value = (v as string | undefined) ?? '';
      },
      { immediate: true },
    );

    const getSlottedRadios = (): HTMLElement[] => getLightChildrenByTag(el, 'bit-radio');

    const getEnabledRadios = (): HTMLElement[] =>
      isDisabled.value ? [] : getSlottedRadios().filter((radio) => !radio.hasAttribute('disabled'));

    const getLabelForValue = (value: string): string => getChoiceLabel(getSlottedRadios(), value);

    const selectRadio = (val: string, originalEvent?: Event) => {
      selectedValue.value = val;

      const labels = val ? [getLabelForValue(val)] : [];
      const values = val ? [val] : [];

      emit('change', { labels, originalEvent, values });
    };

    provide(RADIO_GROUP_CTX, {
      color: props.color,
      disabled: isDisabled,
      name: props.name,
      select: selectRadio,
      size: props.size,
      value: selectedValue,
    });

    // Sync name/color/size/disabled onto slotted bit-radio children.
    // Checked state is handled reactively inside bit-radio via group context.
    const syncChildren = () => {
      for (const radio of getSlottedRadios()) {
        const val = radio.getAttribute('value') ?? '';

        setBooleanAttribute(radio, 'checked', val === selectedValue.value);
        setMaybeAttribute(radio, 'name', props.name.value);
        setMaybeAttribute(radio, 'color', props.color.value);
        setMaybeAttribute(radio, 'size', props.size.value);
        setBooleanAttribute(radio, 'disabled', isDisabled.value);
      }
    };

    effect(() => {
      void slots.elements().value;
      syncChildren();
    });

    // Roving tabindex: only the selected (or first) radio is tabbable
    effect(() => {
      void slots.elements().value;

      const radios = getSlottedRadios();
      const setTabIndex = (radio: HTMLElement, selected: boolean) => {
        radio.setAttribute('tabindex', selected && !isDisabled.value ? '0' : '-1');
      };
      let hasFocusable = false;

      for (const radio of radios) {
        const isSelected = radio.getAttribute('value') === selectedValue.value;

        setTabIndex(radio, isSelected);

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

    const legendId = createStableId('radio-group-legend');
    const errorId = `${legendId}-error`;
    const helperId = `${legendId}-helper`;
    const hasError = () => Boolean(props.error.value);
    const hasHelper = () => Boolean(props.helper.value) && !hasError();

    return html`
      <fieldset
        role="radiogroup"
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
        <div class="radio-group-items" part="items">
          <slot></slot>
        </div>
        <div class="error-text" id="${errorId}" role="alert" ?hidden=${() => !hasError()}>${props.error}</div>
        <div class="helper-text" id="${helperId}" ?hidden=${() => !hasHelper()}>${props.helper}</div>
      </fieldset>
    `;
  },
  styles: [colorThemeMixin, sizeVariantMixin(), disabledStateMixin(), componentStyles],
});
