import {
  computed,
  createContext,
  createId,
  define,
  effect,
  html,
  inject,
  prop,
  provide,
  signal,
} from '@vielzeug/craftit';
import { createListControl, createListKeyControl } from '@vielzeug/craftit/controls';

import { colorThemeMixin, disabledStateMixin, sizeVariantMixin } from '../../styles';
import { mountFormContextSync } from '../shared/dom-sync';
import { FORM_CTX } from '../shared/form-context';
import {
  createChoiceChangeDetail,
  getChoiceLabel,
  getSlottedByTag,
  setBooleanAttribute,
  setMaybeAttribute,
  syncSignalFromProp,
} from '../shared/utils';
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
  color: { value: string | undefined };
  disabled: { value: boolean };
  name: { value: string | undefined };
  select: (value: string, originalEvent?: Event) => void;
  size: { value: string | undefined };
  value: { value: string };
};

export const RADIO_GROUP_CTX = createContext<RadioGroupContext | undefined>('BitRadioGroup');

/** Events emitted by the radio-group component */
export type BitRadioGroupEvents = {
  /** Emitted when the selection changes */
  change: {
    labels: string[];
    originalEvent?: Event;
    value: string;
    values: string[];
  };
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
 */
export const RADIO_GROUP_TAG = define<BitRadioGroupProps, BitRadioGroupEvents>('bit-radio-group', {
  props: {
    color: undefined,
    disabled: false,
    error: undefined,
    helper: undefined,
    label: undefined,
    name: undefined,
    orientation: prop.oneOf(['horizontal', 'vertical'] as const, 'vertical'),
    required: false,
    size: undefined,
    value: { default: '', reflect: false }, // managed by host.bind (selectedValue derived state)
  },
  setup(props, { emit, host, slots }) {
    const selectedValue = signal((props.value.value as string | undefined) ?? '');
    const isDisabled = computed(() => Boolean(props.disabled.value));

    host.bind({
      attr: {
        value: () => selectedValue.value || null,
      },
    });

    syncSignalFromProp(props.value, {
      get value() {
        return selectedValue.value;
      },
      set value(v) {
        selectedValue.value = (v as string | undefined) ?? '';
      },
    });

    const getSlottedRadios = (): HTMLElement[] => getSlottedByTag(host.el, 'bit-radio');

    const getEnabledRadios = (): HTMLElement[] =>
      isDisabled.value ? [] : getSlottedRadios().filter((radio) => !radio.hasAttribute('disabled'));

    const getLabelForValue = (value: string): string => getChoiceLabel(getSlottedRadios(), value);

    const selectRadio = (val: string, originalEvent?: Event) => {
      selectedValue.value = val;

      const labels = val ? [getLabelForValue(val)] : [];
      const values = val ? [val] : [];

      emit('change', createChoiceChangeDetail(values, labels, originalEvent));
    };

    const formCtx = inject(FORM_CTX);

    mountFormContextSync(host.el, formCtx, props);

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
      loop: true,
      setIndex: (index) => {
        const radio = getEnabledRadios()[index];

        if (!radio) return;

        radio.focus();
      },
    });

    const radioGroupListKeys = createListKeyControl({
      control: listControl,
      keys: { next: ['ArrowDown', 'ArrowRight'], prev: ['ArrowUp', 'ArrowLeft'] },
      onInvoke: (_action, _result, event) => {
        const activeRadio = document.activeElement as HTMLElement | null;

        if (activeRadio?.tagName === 'BIT-RADIO') {
          selectRadio(activeRadio.getAttribute('value') ?? '', event);
        }
      },
    });

    host.bind({
      on: {
        change: (e: Event) => {
          if (e.target === host.el) return;

          e.stopPropagation();
          selectRadio((e.target as HTMLElement).getAttribute('value') ?? '', e);
        },
        keydown: (e: KeyboardEvent) => {
          const radios = getEnabledRadios();

          if (!radios.length) return;

          const focused = radios.indexOf(document.activeElement as HTMLElement);

          if (focused === -1) return;

          radioGroupListKeys.handleKeydown(e);
        },
      },
    });

    const legendId = createId('radio-group-legend');
    const errorId = `${legendId}-error`;
    const helperId = `${legendId}-helper`;
    const hasError = () => Boolean(props.error.value);
    const hasHelper = () => Boolean(props.helper.value) && !hasError();

    return {
      render: () => html`
        <fieldset
          role="radiogroup"
          aria-required="${() => String(Boolean(props.required.value))}"
          aria-invalid="${() => String(hasError())}"
          aria-errormessage="${() => (hasError() ? errorId : null)}"
          aria-describedby="${() => (hasError() ? errorId : hasHelper() ? helperId : null)}">
          <legend id="${legendId}" ?hidden=${() => !props.label.value}>
            ${props.label}${() => (props.required.value ? html`<span aria-hidden="true"> *</span>` : '')}
          </legend>
          <div class="radio-group-items" part="items">
            <slot></slot>
          </div>
          <div class="error-text" id="${errorId}" role="alert" ?hidden=${() => !hasError()}>${props.error}</div>
          <div class="helper-text" id="${helperId}" ?hidden=${() => !hasHelper()}>${props.helper}</div>
        </fieldset>
      `,
    };
  },
  styles: [colorThemeMixin, sizeVariantMixin(), disabledStateMixin(), componentStyles],
});
