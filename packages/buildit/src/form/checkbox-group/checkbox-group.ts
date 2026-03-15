import {
  computed,
  createContext,
  createId,
  define,
  defineProps,
  effect,
  handle,
  html,
  inject,
  onMount,
  onSlotChange,
  provide,
  type ReadonlySignal,
  signal,
} from '@vielzeug/craftit';

import type { ComponentSize, ThemeColor } from '../../types';

import { colorThemeMixin, disabledStateMixin, sizeVariantMixin } from '../../styles';
import { mountFormContextSync } from '../../utils/use-text-field';
import { FORM_CTX } from '../form/form';

// ─── Context ──────────────────────────────────────────────────────────────────

export type CheckboxGroupContext = {
  color: ReadonlySignal<ThemeColor | undefined>;
  disabled: ReadonlySignal<boolean>;
  size: ReadonlySignal<ComponentSize | undefined>;
  toggle: (value: string) => void;
  values: ReadonlySignal<string[]>;
};

export const CHECKBOX_GROUP_CTX = createContext<CheckboxGroupContext>();

// ─── Styles ───────────────────────────────────────────────────────────────────

import componentStyles from './checkbox-group.css?inline';

// ─── Props ────────────────────────────────────────────────────────────────────

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
  /** Layout direction of the checkbox options */
  orientation?: 'vertical' | 'horizontal';
  /** Mark the group as required */
  required?: boolean;
  /** Size — propagated to all child bit-checkbox elements */
  size?: ComponentSize;
  /** Comma-separated list of currently checked values */
  values?: string;
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
 * @attr {string} color - Theme color
 * @attr {string} size - Component size: 'sm' | 'md' | 'lg'
 * @attr {string} orientation - Layout: 'vertical' | 'horizontal'
 * @attr {boolean} required - Required field
 *
 * @fires change - Emitted when selection changes. detail: { values: string[] }
 *
 * @slot - Place `bit-checkbox` elements here
 *
 * @example
 * ```html
 * <bit-checkbox-group name="fruits" label="Favourite fruits" value="apple,banana">
 *   <bit-checkbox value="apple">Apple</bit-checkbox>
 *   <bit-checkbox value="banana">Banana</bit-checkbox>
 *   <bit-checkbox value="cherry">Cherry</bit-checkbox>
 * </bit-checkbox-group>
 * ```
 */
export const CHECKBOX_GROUP_TAG = define('bit-checkbox-group', ({ host }) => {
  const props = defineProps<BitCheckboxGroupProps>({
    color: { default: undefined },
    disabled: { default: false },
    error: { default: '' },
    helper: { default: '' },
    label: { default: '' },
    orientation: { default: 'vertical' },
    required: { default: false },
    size: { default: undefined },
    values: { default: '' },
  });

  // Parse comma-separated value string into an array of checked values
  const parseValues = (v: string): string[] =>
    v
      ? v
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

  const checkedValues = signal<string[]>(parseValues(props.values.value));

  // Keep checkedValues in sync when prop changes externally
  effect(() => {
    checkedValues.value = parseValues(props.values.value);
  });

  const toggleCheckbox = (val: string) => {
    const current = checkedValues.value;
    const next = current.includes(val) ? current.filter((v) => v !== val) : [...current, val];

    checkedValues.value = next;
    host.setAttribute('values', next.join(','));
    host.dispatchEvent(new CustomEvent('change', { bubbles: true, composed: true, detail: { values: next } }));
  };

  const formCtx = inject(FORM_CTX);

  mountFormContextSync(host, formCtx, props);

  // Provide context to child bit-checkbox elements
  provide(CHECKBOX_GROUP_CTX, {
    color: props.color,
    disabled: computed(() => Boolean(props.disabled.value)),
    size: props.size,
    toggle: toggleCheckbox,
    values: checkedValues,
  });

  // Sync checked state + color/size/disabled onto slotted bit-checkbox children
  const syncChildren = () => {
    // Read reactive signals before any early return so this effect subscribes
    // to them even when the shadow DOM hasn't rendered yet. Once the slot is
    // available, any change to these signals will re-run syncChildren.
    const values = checkedValues.value;
    const color = props.color.value;
    const size = props.size.value;
    const disabled = props.disabled.value;

    const slot = host.shadowRoot?.querySelector<HTMLSlotElement>('slot');

    if (!slot) return;

    const checkboxes = slot
      .assignedElements({ flatten: true })
      .filter((el) => el.tagName.toLowerCase() === 'bit-checkbox') as HTMLElement[];

    for (const checkbox of checkboxes) {
      const val = checkbox.getAttribute('value') ?? '';

      if (values.includes(val)) {
        checkbox.setAttribute('checked', '');
      } else {
        checkbox.removeAttribute('checked');
      }

      if (color) checkbox.setAttribute('color', color);
      else checkbox.removeAttribute('color');

      if (size) checkbox.setAttribute('size', size);
      else checkbox.removeAttribute('size');

      if (disabled) checkbox.setAttribute('disabled', '');
      else checkbox.removeAttribute('disabled');
    }
  };

  effect(syncChildren);

  onMount(() => {
    onSlotChange('default', syncChildren);

    // Listen for change events bubbled from child bit-checkbox elements
    handle(host, 'change', (e: Event) => {
      if (e.target === host) return; // our own re-dispatch

      e.stopPropagation();

      const target = e.target as HTMLElement;
      const val = target.getAttribute('value') ?? '';

      toggleCheckbox(val);
    });
  });

  const legendId = createId('checkbox-group-legend');
  const errorId = `${legendId}-error`;
  const helperId = `${legendId}-helper`;

  const hasError = computed(() => Boolean(props.error.value));
  const hasHelper = computed(() => Boolean(props.helper.value) && !hasError.value);

  return {
    styles: [colorThemeMixin, sizeVariantMixin(), disabledStateMixin(), componentStyles],
    template: html`
      <fieldset
        role="group"
        aria-required="${() => String(Boolean(props.required.value))}"
        aria-invalid="${() => String(hasError.value)}"
        aria-errormessage="${() => (hasError.value ? errorId : null)}"
        aria-describedby="${() => (hasError.value ? errorId : hasHelper.value ? helperId : null)}">
        <legend id="${legendId}" ?hidden=${() => !props.label.value}>
          ${() => props.label.value}${() => (props.required.value ? html`<span aria-hidden="true"> *</span>` : '')}
        </legend>
        <div class="checkbox-group-items" part="items">
          <slot></slot>
        </div>
        <div class="error-text" id="${errorId}" role="alert" ?hidden=${() => !hasError.value}>
          ${() => props.error.value}
        </div>
        <div class="helper-text" id="${helperId}" ?hidden=${() => !hasHelper.value}>${() => props.helper.value}</div>
      </fieldset>
    `,
  };
});
