import {
  computed,
  createContext,
  css,
  define,
  defineProps,
  effect,
  html,
  onMount,
  onSlotChange,
  provide,
  type ReadonlySignal,
  signal,
} from '@vielzeug/craftit';
import { colorThemeMixin, disabledStateMixin, sizeVariantMixin } from '../../styles';
import type { ComponentSize, ThemeColor } from '../../types';

// ─── Context ──────────────────────────────────────────────────────────────────

export type RadioGroupContext = {
  name: ReadonlySignal<string>;
  value: ReadonlySignal<string>;
  disabled: ReadonlySignal<boolean>;
  color: ReadonlySignal<ThemeColor | undefined>;
  size: ReadonlySignal<ComponentSize | undefined>;
  select: (value: string) => void;
};

export const RADIO_GROUP_CTX = createContext<RadioGroupContext>();

// ─── Styles ───────────────────────────────────────────────────────────────────

const componentStyles = /* css */ css`
  @layer buildit.base {
    :host {
      display: block;
    }

    fieldset {
      border: none;
      margin: 0;
      padding: 0;
      min-width: 0;
    }

    legend {
      color: var(--color-contrast-600);
      font-size: var(--text-sm);
      font-weight: var(--font-medium);
      margin-bottom: var(--size-2);
      padding: 0;
    }

    legend[hidden] {
      display: none;
    }

    .radio-group-items {
      display: flex;
      flex-direction: var(--radio-group-direction, column);
      gap: var(--radio-group-gap, var(--size-2));
    }

    .helper-text {
      color: var(--color-contrast-500);
      font-size: var(--text-xs);
      line-height: var(--leading-tight);
      margin-top: var(--size-1-5);
      padding-inline: 2px;
    }

    .error-text {
      color: var(--color-error);
      font-size: var(--text-xs);
      line-height: var(--leading-tight);
      margin-top: var(--size-1-5);
      padding-inline: 2px;
    }
  }

  @layer buildit.variants {
    :host([orientation='horizontal']) .radio-group-items {
      --radio-group-direction: row;
      flex-wrap: wrap;
    }
  }
`;

// ─── Props ────────────────────────────────────────────────────────────────────

export interface RadioGroupProps {
  /** Legend / label for the fieldset. Required for accessibility. */
  label?: string;
  /** Currently selected value */
  value?: string;
  /** Form field name — propagated to all child bit-radio elements */
  name?: string;
  /** Disable all radios in the group */
  disabled?: boolean;
  /** Error message shown below the group */
  error?: string;
  /** Helper text shown below the group */
  helper?: string;
  /** Theme color — propagated to all child bit-radio elements */
  color?: ThemeColor;
  /** Size — propagated to all child bit-radio elements */
  size?: ComponentSize;
  /** Layout direction of the radio options */
  orientation?: 'vertical' | 'horizontal';
  /** Mark the group as required */
  required?: boolean;
}

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
export const TAG = define('bit-radio-group', ({ host }) => {
  const props = defineProps<RadioGroupProps>({
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

  const selectedValue = signal(props.value.value);

  // Keep selectedValue in sync when prop changes externally
  effect(() => {
    selectedValue.value = props.value.value;
  });

  const selectRadio = (val: string) => {
    selectedValue.value = val;
    host.dispatchEvent(new CustomEvent('change', { bubbles: true, composed: true, detail: { value: val } }));
  };

  // Provide context to child bit-radio elements
  provide(RADIO_GROUP_CTX, {
    color: props.color,
    disabled: computed(() => Boolean(props.disabled.value)),
    name: props.name,
    select: selectRadio,
    size: props.size,
    value: selectedValue,
  });

  // Sync checked state + name/color/size onto slotted bit-radio children
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Syncing many radio attributes requires branching on multiple props
  const syncChildren = () => {
    const slot = host.shadowRoot?.querySelector<HTMLSlotElement>('slot');
    if (!slot) return;
    const radios = slot
      .assignedElements({ flatten: true })
      .filter((el) => el.tagName.toLowerCase() === 'bit-radio') as HTMLElement[];

    for (const radio of radios) {
      const val = radio.getAttribute('value') ?? '';
      if (val === selectedValue.value) {
        radio.setAttribute('checked', '');
      } else {
        radio.removeAttribute('checked');
      }
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
    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Roving tabindex requires iterating all radios and handling fallback to first non-disabled
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
    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Keyboard navigation cycles through radios and handles disabled items
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

    host.addEventListener('keydown', handleKeydown);
    // Listen for change events bubbled from child bit-radio elements
    host.addEventListener('change', (e: Event) => {
      if (e.target === host) return; // our own re-dispatch
      e.stopPropagation();
      const target = e.target as HTMLElement;
      const val = target.getAttribute('value') ?? '';
      selectRadio(val);
    });
  });

  const legendId = `radio-group-legend-${Math.random().toString(36).slice(2, 8)}`;
  const errorId = `${legendId}-error`;
  const helperId = `${legendId}-helper`;

  const hasError = computed(() => Boolean(props.error.value));
  const hasHelper = computed(() => Boolean(props.helper.value) && !hasError.value);

  return {
    styles: [colorThemeMixin, sizeVariantMixin(), disabledStateMixin(), componentStyles],
    template: html`
      <fieldset
        role="radiogroup"
        aria-required="${() => String(Boolean(props.required.value))}"
        aria-invalid="${() => String(hasError.value)}"
        aria-errormessage="${() => (hasError.value ? errorId : null)}"
        aria-describedby="${() => (hasError.value ? errorId : hasHelper.value ? helperId : null)}"
      >
        <legend id="${legendId}" ?hidden=${() => !props.label.value}>
          ${() => props.label.value}${() => (props.required.value ? html`<span aria-hidden="true"> *</span>` : '')}
        </legend>
        <div class="radio-group-items" part="items">
          <slot></slot>
        </div>
        <div class="error-text" id="${errorId}" role="alert" ?hidden=${() => !hasError.value}>
          ${() => props.error.value}
        </div>
        <div class="helper-text" id="${helperId}" ?hidden=${() => !hasHelper.value}>
          ${() => props.helper.value}
        </div>
      </fieldset>
    `,
  };
});

declare global {
  interface HTMLElementTagNameMap {
    'bit-radio-group': HTMLElement & RadioGroupProps;
  }
}
