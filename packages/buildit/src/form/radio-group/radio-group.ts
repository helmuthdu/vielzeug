import {
  computed,
  createContext,
  createId,
  define,
  effect,
  fire,
  handle,
  html,
  useInject,
  onMount,
  onSlotChange,
  useProvide,
  type ReadonlySignal,
  signal,
  watch,
  defineProps,
} from '@vielzeug/craftit';

import type { ComponentSize, ThemeColor } from '../../types';

import { colorThemeMixin, disabledStateMixin, sizeVariantMixin } from '../../styles';
import { mountFormContextSync } from '../../utils/use-text-field';
import { FORM_CTX } from '../form/form';

// ─── Context ──────────────────────────────────────────────────────────────────

export type RadioGroupContext = {
  color: ReadonlySignal<ThemeColor | undefined>;
  disabled: ReadonlySignal<boolean>;
  name: ReadonlySignal<string | undefined>;
  select: (value: string) => void;
  size: ReadonlySignal<ComponentSize | undefined>;
  value: ReadonlySignal<string>;
};

export const RADIO_GROUP_CTX = createContext<RadioGroupContext>('RadioGroupContext');

// ─── Styles ───────────────────────────────────────────────────────────────────

import componentStyles from './radio-group.css?inline';

// ─── Props ────────────────────────────────────────────────────────────────────

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
 * @fires change - Emitted when a radio is selected. detail: { value: string }
 *
 * @slot - Place `bit-radio` elements here
 *
 * @example
 * ```html
 * <bit-radio-group name="size" label="T-shirt size" value="medium">
 *   <bit-radio value="small">Small</bit-radio>
 *   <bit-radio value="medium">Medium</bit-radio>
 *   <bit-radio value="large">Large</bit-radio>
 * </bit-radio-group>
 * ```
 */
export const RADIO_GROUP_TAG = define(
  'bit-radio-group',
  ({ host }) => {
    const props = defineProps<BitRadioGroupProps>({
      color: { default: undefined },
      disabled: { default: false },
      error: { default: '' },
      helper: { default: '' },
      label: { default: '' },
      name: { default: '' },
      orientation: { default: 'vertical' },
      required: { default: false },
      size: { default: undefined },
      value: { default: '' },
    });

    const selectedValue = signal('');

    watch(
      props.value,
      (v) => {
        selectedValue.value = (v as string | undefined) ?? '';
      },
      { immediate: true },
    );

    const selectRadio = (val: string) => {
      selectedValue.value = val;
      fire(host, 'change', { detail: { value: val } });
    };
    const formCtx = useInject(FORM_CTX, undefined);

    mountFormContextSync(host, formCtx, props);
    // Provide context to child bit-radio elements
    useProvide(RADIO_GROUP_CTX, {
      color: props.color,
      disabled: computed(() => Boolean(props.disabled.value)),
      name: props.name,
      select: selectRadio,
      size: props.size,
      value: selectedValue,
    });

    // Sync name/color/size/disabled onto slotted bit-radio children.
    // Checked state is handled reactively inside bit-radio via group context.
    const syncChildren = () => {
      const slot = host.shadowRoot?.querySelector<HTMLSlotElement>('slot');

      if (!slot) return;

      const radios = slot
        .assignedElements({ flatten: true })
        .filter((el) => el.tagName.toLowerCase() === 'bit-radio') as HTMLElement[];

      for (const radio of radios) {
        const val = radio.getAttribute('value') ?? '';

        if (val === selectedValue.value) radio.setAttribute('checked', '');
        else radio.removeAttribute('checked');

        if (props.name.value) radio.setAttribute('name', props.name.value);

        if (props.color.value) radio.setAttribute('color', props.color.value);
        else radio.removeAttribute('color');

        if (props.size.value) radio.setAttribute('size', props.size.value);
        else radio.removeAttribute('size');

        if (props.disabled.value) radio.setAttribute('disabled', '');
        else radio.removeAttribute('disabled');
      }
    };

    onMount(() => {
      onSlotChange('default', syncChildren);
      effect(syncChildren);

      // Roving tabindex: only the selected (or first) radio is tabbable
      const updateTabindex = () => {
        const slot2 = host.shadowRoot?.querySelector<HTMLSlotElement>('slot');

        if (!slot2) return;

        const radios = slot2
          .assignedElements({ flatten: true })
          .filter((el) => el.tagName.toLowerCase() === 'bit-radio') as HTMLElement[];
        let hasFocusable = false;

        for (const radio of radios) {
          const isSelected = radio.getAttribute('value') === selectedValue.value;

          if (isSelected && !props.disabled.value) {
            radio.setAttribute('tabindex', '0');
            hasFocusable = true;
          } else {
            radio.setAttribute('tabindex', '-1');
          }
        }

        // If nothing is selected, make the first non-disabled radio tabbable
        if (!hasFocusable && radios.length > 0) {
          const first = radios.find((r) => !r.hasAttribute('disabled'));

          if (first) first.setAttribute('tabindex', '0');
        }
      };

      effect(updateTabindex);

      // Arrow-key navigation within the group
      const handleKeydown = (e: KeyboardEvent) => {
        if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;

        const slot3 = host.shadowRoot?.querySelector<HTMLSlotElement>('slot');

        if (!slot3) return;

        const radios = slot3
          .assignedElements({ flatten: true })
          .filter((el) => el.tagName.toLowerCase() === 'bit-radio' && !el.hasAttribute('disabled')) as HTMLElement[];

        if (!radios.length) return;

        const focused = radios.indexOf(document.activeElement as HTMLElement);

        if (focused === -1) return;

        e.preventDefault();

        const next =
          e.key === 'ArrowDown' || e.key === 'ArrowRight'
            ? (focused + 1) % radios.length
            : (focused - 1 + radios.length) % radios.length;

        radios[next].focus();

        const val = radios[next].getAttribute('value') ?? '';

        selectRadio(val);
      };

      handle(host, 'keydown', handleKeydown);
      // Listen for change events bubbled from child bit-radio elements
      handle(host, 'change', (e: Event) => {
        if (e.target === host) return; // our own re-dispatch

        e.stopPropagation();

        const target = e.target as HTMLElement;
        const val = target.getAttribute('value') ?? '';

        selectRadio(val);
      });
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
  {
    styles: [colorThemeMixin, sizeVariantMixin(), disabledStateMixin(), componentStyles],
  },
);
