import {
  define,
  computed,
  createContext,
  createId,
  effect,
  html,
  inject,
  provide,
  type ReadonlySignal,
  signal,
  watch,
} from '@vielzeug/craftit';
import { createListControl, createListKeyControl } from '@vielzeug/craftit/controls';

import type { ComponentSize, ThemeColor } from '../../types';

import { colorThemeMixin, disabledStateMixin, sizeVariantMixin } from '../../styles';
import { disablableBundle, sizableBundle, themableBundle, type PropBundle } from '../shared/bundles';
import { mountFormContextSync } from '../shared/dom-sync';
import { FORM_CTX } from '../shared/form-context';
import { createChoiceChangeDetail, type ChoiceChangeDetail } from '../shared/utils';
import componentStyles from './radio-group.css?inline';

// ─── Context ──────────────────────────────────────────────────────────────────

export type RadioGroupContext = {
  color: ReadonlySignal<ThemeColor | undefined>;
  disabled: ReadonlySignal<boolean>;
  name: ReadonlySignal<string | undefined>;
  select: (value: string, originalEvent?: Event) => void;
  size: ReadonlySignal<ComponentSize | undefined>;
  value: ReadonlySignal<string>;
};

export const RADIO_GROUP_CTX = createContext<RadioGroupContext>('RadioGroupContext');

// ─── Types ────────────────────────────────────────────────────────────────────

export type BitRadioGroupProps = {
  /** Theme color — propagated to all child bit-radio elements */
  color?: ThemeColor;
  /** Disable all radios in the group */
  disabled?: boolean;
  /** Error message shown below the group */
  error?: string;
  /** Helper text shown below the group */
  helper?: string;
  /** Legend / label for the fieldset. Required for accessibility. */
  label?: string;
  /** Form field name — propagated to all child bit-radio elements */
  name?: string;
  /** Layout direction of the radio options */
  orientation?: 'vertical' | 'horizontal';
  /** Mark the group as required */
  required?: boolean;
  /** Size — propagated to all child bit-radio elements */
  size?: ComponentSize;
  /** Currently selected value */
  value?: string;
};

export type BitRadioGroupEvents = {
  change: ChoiceChangeDetail;
};

const radioGroupProps = {
  ...themableBundle,
  ...sizableBundle,
  ...disablableBundle,
  error: '',
  helper: '',
  label: '',
  name: undefined,
  orientation: 'vertical',
  required: false,
  value: '',
} satisfies PropBundle<BitRadioGroupProps>;

/**
 * A fieldset wrapper that groups `bit-radio` elements, provides shared
 * `name`, `color`, and `size` via context, and manages roving tabindex
 * keyboard navigation.
 *
 * @element bit-radio-group
 *
 * @attr {string} label - Legend text (required for a11y)
 * @attr {string} value - Currently selected value
 * @attr {string} name - Form field name (propagated to all bit-radio children)
 * @attr {boolean} disabled - Disable all radios in the group
 * @attr {string} error - Error message
 * @attr {string} helper - Helper text
 * @attr {string} color - Theme color
 * @attr {string} size - Component size: 'sm' | 'md' | 'lg'
 * @attr {string} orientation - Layout: 'vertical' | 'horizontal'
 * @attr {boolean} required - Required field
 *
 * @fires change - Emitted when a radio is selected. detail: { value: string, values: string[], labels: string[], originalEvent?: Event }
 *
 * @slot - Place `bit-radio` elements here
 */
export const RADIO_GROUP_TAG = define<BitRadioGroupProps, BitRadioGroupEvents>('bit-radio-group', {
  props: radioGroupProps,
  setup({ emit, host, props, slots }) {
    const selectedValue = signal((props.value.value as string | undefined) ?? '');
    const isDisabled = computed(() => Boolean(props.disabled.value));

    host.bind('attr', {
      value: () => selectedValue.value || null,
    });

    watch(
      props.value,
      (v) => {
        selectedValue.value = (v as string | undefined) ?? '';
      },
      { immediate: true },
    );

    const getSlottedRadios = (): HTMLElement[] =>
      Array.from(host.el.getElementsByTagName('bit-radio')) as HTMLElement[];

    const getEnabledRadios = (): HTMLElement[] =>
      isDisabled.value ? [] : getSlottedRadios().filter((radio) => !radio.hasAttribute('disabled'));

    const getLabelForValue = (value: string): string => {
      const radio = getSlottedRadios().find((el) => (el.getAttribute('value') ?? '') === value);

      return radio?.textContent?.replace(/\s+/g, ' ').trim() || value;
    };

    const selectRadio = (val: string, originalEvent?: Event) => {
      selectedValue.value = val;

      const labels = val ? [getLabelForValue(val)] : [];
      const values = val ? [val] : [];

      emit('change', createChoiceChangeDetail(values, labels, originalEvent));
    };

    const formCtx = inject(FORM_CTX, undefined);

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
      const setMaybe = (el: HTMLElement, name: string, value: string | undefined) => {
        if (value) el.setAttribute(name, value);
        else el.removeAttribute(name);
      };
      const setBool = (el: HTMLElement, name: string, enabled: boolean) => {
        el.toggleAttribute(name, enabled);
      };

      for (const radio of getSlottedRadios()) {
        const val = radio.getAttribute('value') ?? '';

        setBool(radio, 'checked', val === selectedValue.value);
        setMaybe(radio, 'name', props.name.value);
        setMaybe(radio, 'color', props.color.value);
        setMaybe(radio, 'size', props.size.value);
        setBool(radio, 'disabled', isDisabled.value);
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

    host.bind('on', {
      change: (e) => {
        if (e.target === host.el) return;

        e.stopPropagation();
        selectRadio((e.target as HTMLElement).getAttribute('value') ?? '', e);
      },
      keydown: (e) => {
        const radios = getEnabledRadios();

        if (!radios.length) return;

        const focused = radios.indexOf(document.activeElement as HTMLElement);

        if (focused === -1) return;

        radioGroupListKeys.handleKeydown(e);
      },
    });

    const legendId = createId('radio-group-legend');
    const errorId = `${legendId}-error`;
    const helperId = `${legendId}-helper`;
    const hasError = computed(() => Boolean(props.error.value));
    const hasHelper = computed(() => Boolean(props.helper.value) && !hasError.value);

    return html`
      <fieldset
        role="radiogroup"
        aria-required="${() => String(Boolean(props.required.value))}"
        aria-invalid="${() => String(hasError.value)}"
        aria-errormessage="${() => (hasError.value ? errorId : null)}"
        aria-describedby="${() => (hasError.value ? errorId : hasHelper.value ? helperId : null)}">
        <legend id="${legendId}" ?hidden=${() => !props.label.value}>
          ${() => props.label.value}${() => (props.required.value ? html`<span aria-hidden="true"> *</span>` : '')}
        </legend>
        <div class="radio-group-items" part="items">
          <slot></slot>
        </div>
        <div class="error-text" id="${errorId}" role="alert" ?hidden=${() => !hasError.value}>
          ${() => props.error.value}
        </div>
        <div class="helper-text" id="${helperId}" ?hidden=${() => !hasHelper.value}>${() => props.helper.value}</div>
      </fieldset>
    `;
  },
  styles: [colorThemeMixin, sizeVariantMixin(), disabledStateMixin(), componentStyles],
});
