import {
  computed,
  createContext,
  createId,
  css,
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
import { colorThemeMixin, disabledStateMixin, sizeVariantMixin } from '../../styles';
import type { ComponentSize, ThemeColor } from '../../types';
import { mountFormContextSync } from '../_common/use-text-field';
import { FORM_CTX } from '../form/form';

// ─── Context ──────────────────────────────────────────────────────────────────

export type CheckboxGroupContext = {
  values: ReadonlySignal<string[]>;
  disabled: ReadonlySignal<boolean>;
  color: ReadonlySignal<ThemeColor | undefined>;
  size: ReadonlySignal<ComponentSize | undefined>;
  toggle: (value: string) => void;
};

export const CHECKBOX_GROUP_CTX = createContext<CheckboxGroupContext>();

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

    .checkbox-group-items {
      display: flex;
      flex-direction: var(--checkbox-group-direction, column);
      gap: var(--checkbox-group-gap, var(--size-2));
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
    :host([orientation='horizontal']) .checkbox-group-items {
      --checkbox-group-direction: row;
      flex-wrap: wrap;
    }
  }
`;

// ─── Props ────────────────────────────────────────────────────────────────────

export interface CheckboxGroupProps {
  /** Legend / label for the fieldset. Required for accessibility. */
  label?: string;
  /** Comma-separated list of currently checked values */
  value?: string;
  /** Disable all checkboxes in the group */
  disabled?: boolean;
  /** Error message shown below the group */
  error?: string;
  /** Helper text shown below the group */
  helper?: string;
  /** Theme color — propagated to all child bit-checkbox elements */
  color?: ThemeColor;
  /** Size — propagated to all child bit-checkbox elements */
  size?: ComponentSize;
  /** Layout direction of the checkbox options */
  orientation?: 'vertical' | 'horizontal';
  /** Mark the group as required */
  required?: boolean;
}

/**
 * A fieldset wrapper that groups `bit-checkbox` elements, provides shared
 * `color` and `size` via context, and manages multi-value selection state.
 *
 * @element bit-checkbox-group
 *
 * @attr {string} label - Legend text (required for a11y)
 * @attr {string} value - Comma-separated list of checked values
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
export const TAG = define('bit-checkbox-group', ({ host }) => {
  const props = defineProps<CheckboxGroupProps>({
    color: { default: undefined },
    disabled: { default: false },
    error: { default: '' },
    helper: { default: '' },
    label: { default: '' },
    orientation: { default: 'vertical' },
    required: { default: false },
    size: { default: undefined },
    value: { default: '' },
  });

  // Parse comma-separated value string into an array of checked values
  const parseValues = (v: string): string[] =>
    v
      ? v
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

  const checkedValues = signal<string[]>(parseValues(props.value.value));

  // Keep checkedValues in sync when prop changes externally
  effect(() => {
    checkedValues.value = parseValues(props.value.value);
  });

  const toggleCheckbox = (val: string) => {
    const current = checkedValues.value;
    const next = current.includes(val) ? current.filter((v) => v !== val) : [...current, val];
    checkedValues.value = next;
    host.setAttribute('value', next.join(','));
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
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Syncing many checkbox attributes requires branching on multiple props
  const syncChildren = () => {
    const slot = host.shadowRoot?.querySelector<HTMLSlotElement>('slot');
    if (!slot) return;
    const checkboxes = slot
      .assignedElements({ flatten: true })
      .filter((el) => el.tagName.toLowerCase() === 'bit-checkbox') as HTMLElement[];
    for (const checkbox of checkboxes) {
      const val = checkbox.getAttribute('value') ?? '';
      if (checkedValues.value.includes(val)) {
        checkbox.setAttribute('checked', '');
      } else {
        checkbox.removeAttribute('checked');
      }
      if (props.color.value) checkbox.setAttribute('color', props.color.value);
      else checkbox.removeAttribute('color');
      if (props.size.value) checkbox.setAttribute('size', props.size.value);
      else checkbox.removeAttribute('size');
      if (props.disabled.value) checkbox.setAttribute('disabled', '');
      else checkbox.removeAttribute('disabled');
    }
  };

  onMount(() => {
    onSlotChange('default', syncChildren);
    effect(syncChildren);

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
        aria-describedby="${() => (hasError.value ? errorId : hasHelper.value ? helperId : null)}"
      >
        <legend id="${legendId}" ?hidden=${() => !props.label.value}>
          ${() => props.label.value}${() => (props.required.value ? html`<span aria-hidden="true"> *</span>` : '')}
        </legend>
        <div class="checkbox-group-items" part="items">
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
    'bit-checkbox-group': HTMLElement & CheckboxGroupProps;
  }
}
