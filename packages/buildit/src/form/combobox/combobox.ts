import {
  aria,
  computed,
  createFormIds,
  css,
  define,
  defineEmits,
  defineField,
  defineProps,
  effect,
  html,
  inject,
  onMount,
  onSlotChange,
  ref,
  signal,
  watch,
} from '@vielzeug/craftit';
import { autoUpdate, flip, positionFloat, shift, size } from '@vielzeug/floatit';
import { createVirtualizer } from '@vielzeug/virtualit';
import { TAG as CHIP_TAG } from '../../feedback/chip/chip';
import { disabledLoadingMixin, forcedColorsFocusMixin, formFieldMixins, sizeVariantMixin } from '../../styles';
import type {
  AddEventListeners,
  BitComboboxEvents,
  ComboboxChangeDetail,
  DisablableProps,
  FormValidityMethods,
  RoundedSize,
  SizableProps,
  ThemableProps,
  VisualVariant,
} from '../../types';
import { FORM_CTX } from '../form/form';

// ============================================
// Types
// ============================================

export interface ComboboxProps extends ThemableProps, SizableProps, DisablableProps {
  value?: string;
  placeholder?: string;
  name?: string;
  label?: string;
  'label-placement'?: 'inset' | 'outside';
  error?: string;
  helper?: string;
  clearable?: boolean;
  /** Allow typing a new value to create a new option */
  creatable?: boolean;
  'no-filter'?: boolean;
  /** Show loading state in the dropdown */
  loading?: boolean;
  multiple?: boolean;
  variant?: Exclude<VisualVariant, 'glass' | 'text' | 'frost'>;
  rounded?: RoundedSize | '';
  fullwidth?: boolean;
}

// ============================================
// Styles
// ============================================

const componentStyles = /* css */ css`
  @layer buildit.base {
    :host {
      --_font-size: var(--combobox-font-size, var(--text-sm));
      --_gap: var(--combobox-gap, var(--size-2));
      --_field-height: var(--combobox-height, var(--size-10));
      --_row-min-height: calc(var(--leading-normal) * var(--_font-size) + 2px);
      --_padding: var(--combobox-padding, var(--size-1-5) var(--size-3));
      --_radius: var(--combobox-radius, var(--rounded-md));
      --_bg: var(--combobox-bg, var(--color-contrast-100));
      --_border-color: var(--combobox-border-color, var(--color-contrast-300));

      align-items: stretch;
      display: inline-flex;
      flex-direction: column;
      min-width: 12rem;
    }

    :host([fullwidth]) {
      width: 100%;
    }

    .combobox-wrapper {
      display: flex;
      flex-direction: column;
      gap: var(--size-1-5);
      width: 100%;
    }

    /* ========================================
       Label
       ======================================== */

    .label-inset {
      color: var(--color-contrast-500);
      cursor: pointer;
      font-size: var(--text-xs);
      font-weight: var(--font-medium);
      line-height: var(--leading-tight);
      margin-bottom: 2px;
      transition: color var(--transition-fast);
      user-select: none;
    }

    .label-outside {
      color: var(--color-contrast-500);
      cursor: pointer;
      font-size: var(--text-sm);
      font-weight: var(--font-medium);
      line-height: var(--leading-none);
      transition: color var(--transition-fast);
      user-select: none;
    }

    /* ========================================
       Field / Input
       ======================================== */

    .field {
      background: var(--_bg);
      border-radius: var(--_radius);
      border: var(--border) solid var(--_border-color);
      box-shadow: var(--shadow-2xs);
      box-sizing: border-box;
      cursor: text;
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: 0;
      justify-content: center;
      height: var(--_field-height);
      min-height: max(var(--_field-height), var(--_touch-target, 0px));
      padding: var(--_padding);
      padding-inline-end: var(--size-8);
      position: relative;
      transition: var(--_motion-transition,
        background var(--transition-fast),
        border-color var(--transition-fast),
        box-shadow var(--transition-fast),
        transform var(--transition-fast));
    }

    /* Expand height for multi-select chips or inset label */
    :host([multiple]) .field,
    .field:has(.label-inset:not([hidden])) {
      height: auto;
    }

    .field-row {
      align-items: center;
      display: flex;
      flex-wrap: wrap;
      gap: var(--_gap);
      min-height: var(--_row-min-height);
      row-gap: var(--size-1);
    }

    .chips-row {
      align-items: center;
      display: flex;
      flex-wrap: wrap;
      gap: var(--size-1);
      flex: 1;
      min-width: 0;
    }

    .input {
      background: transparent;
      border: 0;
      color: var(--_theme-content);
      flex: 1;
      font-family: inherit;
      font-size: var(--_font-size);
      height: var(--_row-min-height);
      line-height: 1;
      min-width: 80px;
      outline: none;
      padding: 0;
    }

    .input::placeholder {
      color: var(--_placeholder);
    }

    .chevron {
      align-items: center;
      color: var(--color-contrast-500);
      display: inline-flex;
      flex-shrink: 0;
      inset-inline-end: var(--size-2-5);
      pointer-events: none;
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      transition: var(--_motion-transition, transform var(--transition-fast), color var(--transition-fast));
    }

    :host([open]) .chevron {
      color: var(--_theme-focus, var(--color-primary));
      transform: translateY(-50%) rotate(180deg);
    }

    .chevron .loader {
      animation: var(--_motion-animation, bit-combobox-spin 0.6s linear infinite);
      border-radius: 50%;
      border: 2px solid currentColor;
      border-right-color: transparent;
      display: none;
      flex-shrink: 0;
      height: 1em;
      width: 1em;
    }

    :host([loading]) .chevron .loader {
      display: inline-block;
    }

    :host([loading]) .chevron svg {
      display: none;
    }

    @keyframes bit-combobox-spin {
      to { transform: rotate(360deg); }
    }

    .clear-btn {
      align-items: center;
      background: none;
      border: 0;
      color: var(--color-contrast-400);
      cursor: pointer;
      display: inline-flex;
      flex-shrink: 0;
      padding: 0;
      visibility: hidden;
    }

    .clear-btn:hover {
      color: var(--color-contrast-600);
    }

    :host([clearable]) .clear-btn:not([hidden]) {
      visibility: visible;
    }

    /* ========================================
       Dropdown / Listbox
       ======================================== */

    .dropdown {
      background: var(--color-canvas);
      border-radius: var(--_radius);
      border: var(--border) solid var(--color-contrast-200);
      box-shadow: var(--shadow-lg);
      box-sizing: border-box;
      left: 0;
      margin: 0;
      max-height: min(16rem, 50dvh);
      opacity: 0;
      overflow-y: auto;
      overscroll-behavior: contain;
      padding: var(--size-1);
      pointer-events: none;
      position: fixed;
      scrollbar-width: thin;
      top: 0;
      transform: translateY(-4px);
      transition: var(--_motion-transition,
        opacity var(--transition-fast),
        transform var(--transition-fast),
        visibility var(--transition-fast));
      visibility: hidden;
      z-index: calc(var(--z-popover, 1000) + 1);
    }

    .dropdown[data-open] {
      opacity: 1;
      pointer-events: auto;
      transform: translateY(0);
      visibility: visible;
    }

    /* ========================================
       Option Items
       ======================================== */

    .option {
      align-items: center;
      border-radius: var(--rounded-sm);
      cursor: pointer;
      display: flex;
      font-size: var(--_font-size);
      gap: var(--size-2);
      line-height: var(--leading-normal);
      padding: var(--size-1-5) var(--size-2-5);
      transition:
        background var(--transition-fast),
        color var(--transition-fast);
    }

    .option:hover:not([data-disabled]) {
      background: var(--color-contrast-100);
    }

    .option[data-focused]:not([data-disabled]) {
      background: color-mix(in srgb, var(--_theme-base) 12%, var(--color-contrast-100));
      color: var(--_theme-base);
    }

    .option[data-selected] {
      background: color-mix(in srgb, var(--_theme-base) 10%, var(--color-contrast-50));
      color: var(--_theme-base);
      font-weight: var(--font-medium);
    }

    .option[data-selected][data-focused] {
      background: color-mix(in srgb, var(--_theme-base) 20%, var(--color-contrast-100));
    }

    .option[data-disabled] {
      color: var(--color-contrast-400);
      cursor: not-allowed;
      opacity: 0.6;
    }

    .option-check {
      color: var(--_theme-base);
      display: inline-flex;
      flex-shrink: 0;
      margin-inline-start: auto;
      opacity: 0;
      transition: opacity var(--transition-fast);
    }

    .option[data-selected] .option-check {
      opacity: 1;
    }

    .no-results,
    .no-results-create,
    .dropdown-loading {
      color: var(--color-contrast-400);
      font-size: var(--_font-size);
      padding: var(--size-3) var(--size-2-5);
      text-align: center;
    }

    .no-results-create {
      align-items: center;
      background: none;
      border: 0;
      border-radius: var(--rounded-sm);
      color: var(--_theme-base, var(--color-primary));
      cursor: pointer;
      display: flex;
      font-size: var(--_font-size);
      gap: var(--size-1-5);
      padding: var(--size-1-5) var(--size-2-5);
      text-align: start;
      width: 100%;
    }

    .no-results-create:hover,
    .no-results-create[data-focused] {
      background: color-mix(in srgb, var(--_theme-base, var(--color-primary)) 10%, transparent);
    }

    /* ========================================
       Option Icon
       ======================================== */

    .option-icon {
      align-items: center;
      display: inline-flex;
      flex-shrink: 0;
    }

    /* ========================================
       Slotted option elements (hidden data nodes)
       ======================================== */

    ::slotted(bit-combobox-option) {
      display: none;
    }

    /* ========================================
       Helper / Error Text
       ======================================== */

    .helper-text {
      color: var(--color-contrast-500);
      font-size: var(--text-xs);
      line-height: var(--leading-tight);
      padding-inline: 2px;
    }

    /* ========================================
       Focus / Hover States
       ======================================== */

    :host(:not([disabled]):not([variant='bordered']):not([variant='flat'])) .field:hover {
      border-color: var(--color-contrast-400);
    }

    :host(:not([disabled]):not([variant='flat'])) .field:focus-within,
    :host([open]:not([disabled]):not([variant='flat'])) .field {
      background: var(--color-canvas);
      border-color: var(--_theme-focus);
      box-shadow: var(--_theme-shadow, var(--color-primary-focus-shadow));
      transform: translateY(-1px);
    }

    :host(:not([disabled])) .field:focus-within .label-inset,
    :host(:not([disabled])) .field:focus-within .label-outside,
    :host([open]:not([disabled])) .label-inset {
      color: var(--_theme-focus);
    }

    :host([error]:not([error=""])) .field {
      border-color: var(--color-error);
    }

    :host([error]:not([error=""])) .field:focus-within {
      border-color: var(--color-error);
      box-shadow: var(--color-error-focus-shadow);
    }

    :host([error]:not([error=""])) .label-inset,
    :host([error]:not([error=""])) .label-outside {
      color: var(--color-error);
    }
  }

  @layer buildit.variants {
    /* Solid (Default) */
    :host(:not([variant])) .field,
    :host([variant='solid']) .field {
      background: var(--color-contrast-50);
      border-color: var(--color-contrast-300);
      box-shadow: var(--shadow-2xs);
    }

    /* Flat */
    :host([variant='flat']) .field {
      border-color: var(--_theme-border);
      box-shadow: var(--inset-shadow-2xs);
    }

    :host([variant='flat']) .field:hover {
      background: color-mix(in srgb, var(--_theme-base) 6%, var(--color-contrast-100));
      border-color: color-mix(in srgb, var(--_theme-base) 35%, var(--color-contrast-300));
    }

    :host([variant='flat']) .field:focus-within {
      background: color-mix(in srgb, var(--_theme-base) 8%, var(--color-canvas));
      border-color: color-mix(in srgb, var(--_theme-focus) 60%, transparent);
      box-shadow: var(--_theme-shadow);
    }

    /* Bordered */
    :host([variant='bordered']) .field {
      background: var(--_theme-backdrop);
      border-color: color-mix(in srgb, var(--_theme-focus) 70%, transparent);
    }

    :host([variant='bordered']) .input {
      color: var(--_theme-content);
    }

    :host([variant='bordered']) .input::placeholder {
      color: color-mix(in srgb, var(--_theme-content) 45%, transparent);
    }

    :host([variant='bordered']) .field:hover {
      border-color: var(--_theme-focus);
    }

    /* Outline */
    :host([variant='outline']) .field {
      background: transparent;
      box-shadow: none;
    }

    /* Ghost */
    :host([variant='ghost']) .field {
      background: transparent;
      border-color: transparent;
      box-shadow: none;
    }

    :host([variant='ghost']) .field:hover {
      background: var(--color-contrast-100);
    }
  }

  @layer buildit.utilities {
    :host([fullwidth]) {
      display: flex;
      width: 100%;
    }
  }
`;

// ============================================
// ComboboxOption Component
// ============================================

export interface ComboboxOptionProps {
  value?: string;
  /** Explicit label text; falls back to the element's text content. */
  label?: string;
  disabled?: boolean;
}

/**
 * `bit-combobox-option` — A child element of `<bit-combobox>` that represents one option.
 *
 * @slot         - Label text for the option.
 * @slot icon    - Optional leading icon or decoration.
 */
export const OPTION_TAG = define('bit-combobox-option', () => {
  const optionStyles = /* css */ css`
    @layer buildit.base {
      :host {
        display: none;
      }
    }
  `;
  return html`<style>${optionStyles}</style>`;
});

// ============================================
// Component
// ============================================

/**
 * `bit-combobox` — Autocomplete/combobox text input with a filterable listbox.
 *
 * Place `<bit-combobox-option>` elements as children to define the available options.
 * Each option supports a `label` attribute (falls back to text content) and an `icon` named slot.
 *
 * @example
 * ```html
 * <bit-combobox label="Country" placeholder="Search\u2026">
 *   <bit-combobox-option value="us">United States</bit-combobox-option>
 *   <bit-combobox-option value="gb">United Kingdom</bit-combobox-option>
 *   <bit-combobox-option value="de" disabled>Germany</bit-combobox-option>
 * </bit-combobox>
 * ```
 */
export const TAG = define(
  'bit-combobox',
  ({ host }) => {
    const props = defineProps<ComboboxProps>({
      clearable: { default: false },
      color: { default: undefined },
      creatable: { default: false },
      disabled: { default: false },
      error: { default: '', omit: true },
      fullwidth: { default: false },
      helper: { default: '' },
      label: { default: '' },
      'label-placement': { default: 'inset' },
      loading: { default: false },
      multiple: { default: false },
      name: { default: '' },
      'no-filter': { default: false },
      placeholder: { default: '' },
      rounded: { default: undefined },
      size: { default: undefined },
      value: { default: '' },
      variant: { default: undefined },
    });

    const emit = defineEmits<{
      change: ComboboxChangeDetail;
      search: { query: string };
    }>();

    const { labelId, fieldId: comboId, helperId } = createFormIds('combobox', props.name);

    // Label refs
    const labelOutsideRef = ref<HTMLLabelElement>();
    const labelInsetRef = ref<HTMLLabelElement>();

    const formCtx = inject(FORM_CTX);

    // Signal for the form value
    const formValue = signal(String(props.value.value ?? ''));
    const fd = defineField(
      { disabled: computed(() => Boolean(props.disabled.value) || Boolean(formCtx?.disabled.value)), value: formValue },
      {
        onReset: () => {
          formValue.value = '';
          selectedValues.value = [];
          query.value = '';
        },
      },
    );

    function triggerValidation(on: 'blur' | 'change'): void {
      if (formCtx?.validateOn.value === on) fd.reportValidity();
    }

    // ── State ────────────────────────────────────────────────────────────────

    const isOpen = signal(false);
    const query = signal('');
    // Multi-value state: always an array; single mode uses at most one entry
    const selectedValues = signal<{ value: string; label: string }[]>(
      props.value.value ? [{ label: '', value: props.value.value }] : [],
    );
    const focusedIndex = signal(-1);

    // Sync external value prop changes to selectedValues (controlled mode)
    watch(
      props.value,
      (newValue) => {
        if (!newValue) {
          selectedValues.value = [];
          query.value = '';
          formValue.value = '';
        } else if (props.multiple.value) {
          // Multiple mode: split CSV into array
          const values = newValue
            .split(',')
            .map((v) => v.trim())
            .filter(Boolean);
          selectedValues.value = values.map((v) => ({ label: '', value: v }));
          formValue.value = newValue;
        } else {
          // Single mode: one value
          selectedValues.value = [{ label: '', value: newValue }];
          formValue.value = newValue;
        }
      },
      { immediate: true },
    );

    // Convenience getter for single-select
    const selectedValue = computed(() => selectedValues.value[0]?.value ?? '');
    const hasValue = computed(() => selectedValues.value.length > 0);
    const hasLabel = computed(() => !!props.label.value);

    let inputEl: HTMLInputElement | null = null;
    let dropdownEl: HTMLElement | null = null;
    let chipsRowEl: HTMLElement | null = null;
    let listboxEl: HTMLElement | null = null;
    let autoUpdateCleanup: (() => void) | null = null;

    // ── Options ──────────────────────────────────────────────────────────────

    // ── Internal option data ──────────────────────────────────────────────────

    type ComboboxOptionItem = {
      value: string;
      label: string;
      disabled: boolean;
      iconEl: Element | null;
    };

    const slottedOptions = signal<ComboboxOptionItem[]>([]);
    const jsPropOptions = signal<ComboboxOptionItem[] | null>(null);
    const isLoading = signal(false);

    // Merged options: JS property overrides slotted options
    const allOptions = computed<ComboboxOptionItem[]>(() => {
      const jsProp = jsPropOptions.value;
      return jsProp && jsProp.length > 0 ? jsProp : slottedOptions.value;
    });

    // Expose JS options setter
    Object.defineProperty(host, 'options', {
      get() {
        return allOptions.value;
      },
      set(val: ComboboxOptionItem[]) {
        jsPropOptions.value = val;
      },
    });

    function readOptions(elements: Element[]) {
      slottedOptions.value = elements
        .filter((el) => el.localName === 'bit-combobox-option')
        .map((el) => ({
          disabled: el.hasAttribute('disabled'),
          iconEl: el.querySelector('[slot="icon"]'),
          label:
            el.getAttribute('label') ||
            [...el.childNodes]
              .filter((n) => n.nodeType === Node.TEXT_NODE)
              .map((n) => n.textContent?.trim())
              .filter(Boolean)
              .join(' ') ||
            '',
          value: el.getAttribute('value') ?? '',
        }));

      // Back-fill labels for any already-selected values that were set before options loaded
      if (selectedValues.value.length > 0) {
        selectedValues.value = selectedValues.value.map((sel) => {
          if (sel.label) return sel;
          const match = allOptions.value.find((o) => o.value === sel.value);
          return match ? { label: match.label, value: sel.value } : sel;
        });
        // Also sync the query in single mode
        if (!props.multiple.value && selectedValues.value.length === 1) {
          query.value = selectedValues.value[0]?.label ?? '';
        }
      }
    }

    const filteredOptions = computed<ComboboxOptionItem[]>(() => {
      if (props['no-filter'].value || !query.value) return allOptions.value;
      const q = query.value.toLowerCase();
      return allOptions.value.filter((o) => o.label.toLowerCase().includes(q));
    });

    // "Create" option shown when creatable + query doesn't match any existing option
    const creatableLabel = computed(() => {
      if (!props.creatable.value || !query.value) return '';
      const q = query.value.trim();
      if (!q) return '';
      const exact = filteredOptions.value.find((o) => o.label.toLowerCase() === q.toLowerCase());
      return exact ? '' : q;
    });

    // Sync loading signal from prop
    effect(() => {
      isLoading.value = Boolean(props.loading.value);
    });

    // ── Positioning ──────────────────────────────────────────────────────────

    function updateDropdownPosition() {
      if (!dropdownEl || !inputEl) return;
      const referenceWidth = (inputEl.closest('.field') as HTMLElement | null)?.getBoundingClientRect().width ?? 0;
      positionFloat(inputEl.closest('.field') as HTMLElement, dropdownEl, {
        middleware: [
          flip({ padding: 6 }),
          shift({ padding: 6 }),
          size({
            apply({ elements }: { elements: { floating: HTMLElement } }) {
              elements.floating.style.width = `${referenceWidth}px`;
            },
            padding: 6,
          }),
        ],
        placement: 'bottom-start',
      });
    }

    // ── Open / Close ─────────────────────────────────────────────────────────

    function open(clearFilter = true) {
      if (props.disabled.value) return;
      if (clearFilter) query.value = '';
      isOpen.value = true;
      host.setAttribute('open', '');
      const fieldEl = inputEl?.closest('.field') as HTMLElement | null;
      if (fieldEl && dropdownEl) {
        autoUpdateCleanup?.();
        autoUpdateCleanup = autoUpdate(fieldEl, dropdownEl, updateDropdownPosition);
      }
      requestAnimationFrame(() => updateDropdownPosition());
    }

    function close() {
      isOpen.value = false;
      host.removeAttribute('open');
      autoUpdateCleanup?.();
      autoUpdateCleanup = null;
      focusedIndex.value = -1;
      // In single mode restore the query to the selected label (or clear)
      if (!props.multiple.value) {
        const match = allOptions.value.find((o) => o.value === selectedValue.value);
        query.value = match?.label ?? '';
      } else {
        query.value = '';
      }
      triggerValidation('blur');
    }

    // ── Selection ────────────────────────────────────────────────────────────

    function selectOption(opt: ComboboxOptionItem, originalEvent?: Event) {
      if (opt.disabled) return;
      if (props.multiple.value) {
        const already = selectedValues.value.find((s) => s.value === opt.value);
        if (already) {
          selectedValues.value = selectedValues.value.filter((s) => s.value !== opt.value);
        } else {
          selectedValues.value = [...selectedValues.value, { label: opt.label, value: opt.value }];
        }
        formValue.value = selectedValues.value.map((s) => s.value).join(',');
        query.value = '';
        emit('change', {
          label: opt.label,
          originalEvent,
          value: formValue.value,
          values: selectedValues.value.map((s) => s.value),
        });
        triggerValidation('change');
        // Keep dropdown open in multiple mode
        inputEl?.focus();
      } else {
        selectedValues.value = [{ label: opt.label, value: opt.value }];
        query.value = opt.label;
        formValue.value = opt.value;
        emit('change', { label: opt.label, originalEvent, value: opt.value, values: [opt.value] });
        triggerValidation('change');
        close();
        inputEl?.focus();
      }
    }

    function clearValue(e: Event) {
      e.stopPropagation();
      selectedValues.value = [];
      query.value = '';
      formValue.value = '';
      emit('change', { label: '', value: '', values: [] });
      triggerValidation('change');
      inputEl?.focus();
    }

    // ── Keyboard Navigation ──────────────────────────────────────────────────

    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: keyboard nav requires multi-key handling
    function handleKeydown(e: KeyboardEvent) {
      if (props.disabled.value) return;
      const opts = filteredOptions.value;
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          if (!isOpen.value) {
            open();
          } else {
            let next = focusedIndex.value + 1;
            while (next < opts.length && opts[next].disabled) next++;
            if (next < opts.length) {
              focusedIndex.value = next;
              scrollFocusedIntoView();
            }
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (!isOpen.value) {
            open();
          } else {
            let prev = focusedIndex.value - 1;
            while (prev >= 0 && opts[prev].disabled) prev--;
            if (prev >= 0) {
              focusedIndex.value = prev;
              scrollFocusedIntoView();
            }
          }
          break;
        case 'Enter':
          e.preventDefault();
          if (isOpen.value && focusedIndex.value >= 0 && focusedIndex.value < opts.length) {
            selectOption(opts[focusedIndex.value], e);
          } else if (isOpen.value && focusedIndex.value === -1 && creatableLabel.value) {
            // Focused on the "create" item
            createOption(creatableLabel.value, e);
          } else if (!isOpen.value) {
            open();
          }
          break;
        case 'Escape':
          e.preventDefault();
          if (isOpen.value) {
            close();
          }
          break;
        case 'Home':
          if (isOpen.value) {
            e.preventDefault();
            focusedIndex.value = 0;
            scrollFocusedIntoView();
          }
          break;
        case 'End':
          if (isOpen.value) {
            e.preventDefault();
            focusedIndex.value = opts.length - 1;
            scrollFocusedIntoView();
          }
          break;
        case 'Backspace':
          // In multiple mode, remove the last chip when the input is empty
          if (props.multiple.value && !query.value && selectedValues.value.length > 0) {
            selectedValues.value = selectedValues.value.slice(0, -1);
            formValue.value = selectedValues.value.map((s) => s.value).join(',');
            emit('change', { label: '', value: formValue.value, values: selectedValues.value.map((s) => s.value) });
            triggerValidation('change');
          }
          break;
        case 'Tab':
          close();
          break;
      }
    }

    function scrollFocusedIntoView() {
      if (virtualizer && focusedIndex.value >= 0) {
        virtualizer.scrollToIndex(focusedIndex.value, { align: 'auto' });
        return;
      }
      if (!listboxEl) return;
      const focusedEl = listboxEl.querySelector<HTMLElement>('[data-focused]');
      focusedEl?.scrollIntoView({ block: 'nearest' });
    }

    // ── Virtualizer ──────────────────────────────────────────────────────────

    let virtualizer: ReturnType<typeof createVirtualizer> | null = null;

    function setupVirtualizer() {
      virtualizer?.destroy();
      if (!listboxEl) return;
      const opts = filteredOptions.value;
      if (opts.length === 0) {
        virtualizer = null;
        return;
      }
      virtualizer = createVirtualizer({
        count: opts.length,
        estimateSize: () => 36,
        getScrollElement: () => dropdownEl,
        // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Virtualizer onChange renders option rows including selected, focused, group, and create states
        onChange: (virtualItems, totalSize) => {
          if (!listboxEl) return;
          listboxEl.style.height = `${totalSize}px`;
          listboxEl.style.position = 'relative';

          // Clear only virtual-rendered items (keep no-results / loading nodes)
          for (const el of Array.from(listboxEl.querySelectorAll('.option'))) el.remove();

          for (const item of virtualItems) {
            const opt = opts[item.index];
            if (!opt) continue;
            const isFocused = item.index === focusedIndex.value;
            const isSelected = props.multiple.value
              ? selectedValues.value.some((s) => s.value === opt.value)
              : opt.value === selectedValue.value;

            const optionEl = document.createElement('div');
            optionEl.className = 'option';
            optionEl.setAttribute('role', 'option');
            optionEl.id = `${comboId}-opt-${item.index}`;
            optionEl.setAttribute('aria-selected', String(isSelected));
            optionEl.setAttribute('aria-disabled', String(!!opt.disabled));
            optionEl.style.cssText = `position:absolute;top:${item.top}px;left:0;right:0;`;
            if (isFocused) optionEl.setAttribute('data-focused', '');
            if (isSelected) optionEl.setAttribute('data-selected', '');
            if (opt.disabled) optionEl.setAttribute('data-disabled', '');

            if (opt.iconEl) {
              const iconWrapper = document.createElement('span');
              iconWrapper.className = 'option-icon';
              iconWrapper.setAttribute('aria-hidden', 'true');
              const iconClone = opt.iconEl.cloneNode(true) as Element;
              iconClone.removeAttribute('slot');
              iconWrapper.appendChild(iconClone);
              optionEl.appendChild(iconWrapper);
            }

            const labelSpan = document.createElement('span');
            labelSpan.textContent = opt.label;
            optionEl.appendChild(labelSpan);

            const check = document.createElement('span');
            check.className = 'option-check';
            check.setAttribute('aria-hidden', 'true');
            check.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`;
            optionEl.appendChild(check);

            optionEl.addEventListener('click', (e: MouseEvent) => {
              e.stopPropagation();
              selectOption(opt, e);
            });
            optionEl.addEventListener('mouseenter', () => {
              focusedIndex.value = item.index;
            });
            listboxEl.appendChild(optionEl);
          }
        },
        overscan: 4,
      });
    }

    // ── Create option ────────────────────────────────────────────────────────

    function createOption(label: string, originalEvent?: Event) {
      const value = label.toLowerCase().replace(/\s+/g, '-');
      const newOpt: ComboboxOptionItem = { disabled: false, iconEl: null, label, value };
      // Add to JS options so it persists — use the reactive signal so allOptions recomputes
      jsPropOptions.value = [...allOptions.value, newOpt];
      selectOption(newOpt, originalEvent);
      emit('change', { label: newOpt.label, originalEvent, value: newOpt.value, values: [newOpt.value] });
    }

    // ── Lifecycle ────────────────────────────────────────────────────────────

    onMount(() => {
      inputEl = host.shadowRoot?.querySelector<HTMLInputElement>('.input') ?? null;
      dropdownEl = host.shadowRoot?.querySelector<HTMLElement>('.dropdown') ?? null;
      listboxEl = host.shadowRoot?.querySelector<HTMLElement>('[role="listbox"]') ?? null;
      chipsRowEl = host.shadowRoot?.querySelector<HTMLElement>('.chips-row') ?? null;

      if (inputEl) {
        aria(inputEl, {
          activedescendant: () => (focusedIndex.value >= 0 ? `${comboId}-opt-${focusedIndex.value}` : null),
          autocomplete: 'list',
          controls: () => `${comboId}-listbox`,
          describedby: () => (props.error.value || props.helper.value ? helperId : null),
          disabled: () => props.disabled.value,
          expanded: () => isOpen.value,
          invalid: () => !!props.error.value,
          labelledby: () => (hasLabel.value ? labelId : null),
        });
      }

      // Close on outside click
      const handleDocClick = (e: MouseEvent) => {
        if (!isOpen.value) return;
        if (!host.contains(e.target as Node) && !dropdownEl?.contains(e.target as Node)) close();
      };
      document.addEventListener('click', handleDocClick, true);
      onSlotChange('default', readOptions);

      // Rebuild virtualizer when filtered options or open state changes
      effect(() => {
        const opts = filteredOptions.value;
        const open = isOpen.value;
        if (open && opts.length > 0) {
          requestAnimationFrame(() => setupVirtualizer());
        } else {
          // Destroy virtualizer and clear its DOM nodes so state nodes (create / no-results)
          // don't overlap with stale absolute-positioned option elements
          if (listboxEl) {
            for (const el of Array.from(listboxEl.querySelectorAll('.option'))) el.remove();
            listboxEl.style.height = '';
            listboxEl.style.position = '';
          }
          virtualizer?.destroy();
          virtualizer = null;
        }
      });

      // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: effect handles all reactive DOM updates for the combobox in one place
      effect(() => {
        // Label visibility
        const placement = props['label-placement'].value;
        const labelText = props.label.value;
        if (labelInsetRef.value) {
          labelInsetRef.value.textContent = labelText;
          labelInsetRef.value.hidden = !labelText || placement !== 'inset';
        }
        if (labelOutsideRef.value) {
          labelOutsideRef.value.textContent = labelText;
          labelOutsideRef.value.hidden = !labelText || placement !== 'outside';
        }

        // Sync input value
        if (inputEl && document.activeElement !== inputEl) {
          inputEl.value = query.value;
          inputEl.placeholder =
            props.multiple.value && selectedValues.value.length > 0 ? '' : props.placeholder.value || '';
        }

        // Chips rendering in multiple mode
        if (chipsRowEl && inputEl) {
          // Remove old chips without touching the input element
          for (const old of Array.from(chipsRowEl.querySelectorAll(CHIP_TAG))) old.remove();
          if (props.multiple.value) {
            for (const sel of selectedValues.value) {
              const chip = document.createElement(CHIP_TAG) as HTMLElement & { value?: string; mode?: string };
              chip.setAttribute('value', sel.value);
              chip.setAttribute('mode', 'removable');
              chip.setAttribute('variant', 'flat');
              chip.setAttribute('size', 'sm');
              if (props.color.value) chip.setAttribute('color', props.color.value);
              chip.textContent = sel.label;
              chip.addEventListener('remove', (e: Event) => {
                e.stopPropagation();
                const detail = (e as CustomEvent<{ value: string | undefined }>).detail;
                if (detail.value !== undefined) {
                  selectedValues.value = selectedValues.value.filter((s) => s.value !== detail.value);
                  formValue.value = selectedValues.value.map((s) => s.value).join(',');
                  emit('change', {
                    label: '',
                    value: formValue.value,
                    values: selectedValues.value.map((s) => s.value),
                  });
                  triggerValidation('change');
                }
              });
              chipsRowEl.insertBefore(chip, inputEl);
            }
          }
        }

        // Update helper / error text
        const helperEl = host.shadowRoot?.querySelector<HTMLElement>('.helper-text');
        if (helperEl) {
          helperEl.textContent = props.error.value || props.helper.value;
          helperEl.hidden = !props.error.value && !props.helper.value;
          helperEl.id = helperId;
          helperEl.style.color = props.error.value ? 'var(--color-error)' : '';
        }

        // Clear button visibility
        const clearBtn = host.shadowRoot?.querySelector<HTMLElement>('.clear-btn');
        if (clearBtn) {
          clearBtn.hidden = !hasValue.value;
        }

        // Dropdown open state
        if (dropdownEl) {
          if (isOpen.value) {
            dropdownEl.setAttribute('data-open', '');
          } else {
            dropdownEl.removeAttribute('data-open');
          }
        }

        // Loading / empty state inside listbox
        if (listboxEl) {
          // Remove existing state nodes
          for (const el of Array.from(listboxEl.querySelectorAll('.no-results,.no-results-create,.dropdown-loading')))
            el.remove();

          if (isLoading.value) {
            const loadingEl = document.createElement('div');
            loadingEl.className = 'dropdown-loading';
            loadingEl.textContent = 'Loading\u2026';
            listboxEl.prepend(loadingEl);
          } else if (filteredOptions.value.length === 0) {
            if (creatableLabel.value) {
              const createEl = document.createElement('button');
              createEl.type = 'button';
              createEl.className = 'no-results-create';
              createEl.textContent = `Create "${creatableLabel.value}"`;
              // Apply focused state when keyboard nav lands here (focusedIndex === -1 means create row)
              if (focusedIndex.value === -1) createEl.setAttribute('data-focused', '');
              createEl.addEventListener('click', (e) => {
                e.stopPropagation();
                createOption(creatableLabel.value, e);
              });
              listboxEl.appendChild(createEl);
            } else {
              const noResults = document.createElement('div');
              noResults.className = 'no-results';
              noResults.setAttribute('role', 'presentation');
              noResults.textContent = 'No results found';
              listboxEl.appendChild(noResults);
            }
          }

          // Trigger virtualizer re-render for focused/selected changes
          virtualizer?.measure();
        }
      });

      // Effect: propagate form context disabled/size/variant to host when not explicitly set
      let ctxDisabledActive = false;
      // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Propagates form context and handles disabled state transitions
      effect(() => {
        if (!formCtx) return;
        const ctxDisabled = formCtx.disabled.value;
        if (ctxDisabled && !ctxDisabledActive) {
          host.setAttribute('disabled', '');
          ctxDisabledActive = true;
        } else if (!ctxDisabled && ctxDisabledActive) {
          host.removeAttribute('disabled');
          ctxDisabledActive = false;
        }
        if (!props.size.value && formCtx.size.value) host.setAttribute('size', formCtx.size.value);
        if (!props.variant.value && formCtx.variant.value) host.setAttribute('variant', formCtx.variant.value);
      });

      return () => {
        virtualizer?.destroy();
        autoUpdateCleanup?.();
        document.removeEventListener('click', handleDocClick, true);
      };
    });

    // ── Template ──────────────────────────────────────────────────────────────

    return {
      styles: [
        sizeVariantMixin({
          lg: {
            '--_field-height': 'var(--size-12)',
            '--_padding': 'var(--size-2-5) var(--size-3-5)',
            fontSize: 'var(--text-base)',
            gap: 'var(--size-2-5)',
          },
          sm: {
            '--_field-height': 'var(--size-8)',
            '--_padding': 'var(--size-1) var(--size-2)',
            fontSize: 'var(--text-xs)',
            gap: 'var(--size-1-5)',
          },
        }),
        ...formFieldMixins,
        disabledLoadingMixin(),
        forcedColorsFocusMixin('.input'),
        componentStyles,
      ],
      template: html`
      <slot></slot>
      <div class="combobox-wrapper" part="wrapper">
        <label class="label-outside" for="${comboId}" id="${labelId}" ref=${labelOutsideRef} hidden part="label"></label>
        <div
          class="field"
          part="field"
          @click="${() => {
            if (!isOpen.value) open();
          }}"
        >
          <label class="label-inset" for="${comboId}" id="${labelId}" ref=${labelInsetRef} hidden part="label"></label>
          <div class="field-row">
            <div class="chips-row">
              <input
                class="input"
                part="input"
                type="text"
                role="combobox"
                autocomplete="off"
                spellcheck="false"
                id="${comboId}"
                name="${() => props.name.value}"
                :disabled="${() => props.disabled.value}"
                .value="${() => query.value}"
                @input="${(e: Event) => {
                  const target = e.target as HTMLInputElement;
                  query.value = target.value;
                  if (!props.multiple.value) selectedValues.value = [];
                  focusedIndex.value = -1;
                  if (!isOpen.value) open(false);
                  emit('search', { query: target.value } as { query: string });
                }}"
                @keydown="${handleKeydown}"
                @focus="${() => {
                  if (!isOpen.value) open();
                }}"
              />
            </div>
            <button
              class="clear-btn"
              part="clear-btn"
              type="button"
              aria-label="Clear"
              tabindex="-1"
              @click="${clearValue}"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12"/>
              </svg>
            </button>
            <span class="chevron" aria-hidden="true">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="m6 9 6 6 6-6"/>
              </svg>
              <span class="loader" aria-label="Loading"></span>
            </span>
          </div>
        </div>

        <div
          class="dropdown"
          part="dropdown"
          id="${() => `${comboId}-dropdown`}"
        >
          <div
            role="listbox"
            id="${() => `${comboId}-listbox`}"
            aria-label="${() => props.label.value || props.placeholder.value || 'Options'}"
          ></div>
        </div>

        <span class="helper-text" part="helper-text" aria-live="polite" hidden></span>
      </div>
    `,
    };
  },
  { formAssociated: true, shadow: { delegatesFocus: true } },
) as unknown as AddEventListeners<BitComboboxEvents>;

declare global {
  interface HTMLElementTagNameMap {
    'bit-combobox': HTMLElement & ComboboxProps & FormValidityMethods & AddEventListeners<BitComboboxEvents>;
    'bit-combobox-option': HTMLElement & ComboboxOptionProps;
  }
}
