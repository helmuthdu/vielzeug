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

import type {
  AddEventListeners,
  BitSelectEvents,
  DisablableProps,
  FormValidityMethods,
  RoundedSize,
  SizableProps,
  ThemableProps,
  VisualVariant,
} from '../../types';

import { mountFormContextSync, mountLabelSyncStandalone } from '../_common/use-text-field';
import { TAG as CHIP_TAG } from '../../feedback/chip/chip';
import { disabledLoadingMixin, forcedColorsFocusMixin, formFieldMixins, sizeVariantMixin } from '../../styles';
import { FORM_CTX } from '../form/form';

// ============================================
// Types
// ============================================

interface OptionItem {
  value: string;
  label: string;
  disabled: boolean;
  group?: string;
}

// ============================================
// Styles
// ============================================

const componentStyles = /* css */ css`
  @layer buildit.base {
    :host {
      --_font-size: var(--select-font-size, var(--text-sm));
      --_gap: var(--select-gap, var(--size-2));
      --_field-height: var(--select-height, var(--size-10));
      --_row-min-height: calc(var(--leading-normal) * var(--_font-size) + 2px);
      --_padding: var(--select-padding, var(--size-1-5) var(--size-3));
      --_radius: var(--select-radius, var(--rounded-md));
      --_placeholder: var(--select-placeholder-color, var(--color-contrast-500));
      --_bg: var(--select-bg, var(--color-contrast-100));
      --_border-color: var(--select-border-color, var(--color-contrast-300));

      align-items: stretch;
      display: inline-flex;
      flex-direction: column;
      min-width: 12rem;
    }

    :host([fullwidth]) {
      width: 100%;
    }

    /* Hide native <option> elements — we render our own UI */
    ::slotted(option),
    ::slotted(optgroup) {
      display: none;
    }

    .select-wrapper {
      display: flex;
      flex-direction: column;
      gap: var(--size-1-5);
      width: 100%;
    }

    /* ========================================
       Trigger Field
       ======================================== */

    .field {
      align-items: stretch;
      background: var(--_bg);
      border-radius: var(--_radius);
      border: var(--border) solid var(--_border-color);
      box-shadow: var(--shadow-2xs);
      box-sizing: border-box;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      justify-content: center;
      height: var(--_field-height);
      min-height: max(var(--_field-height), var(--_touch-target, 0px));
      padding: var(--_padding);
      padding-inline-end: var(--size-8);
      position: relative;
      transition: var(
        --_motion-transition,
        background var(--transition-fast),
        backdrop-filter var(--transition-slow),
        border-color var(--transition-fast),
        box-shadow var(--transition-fast),
        transform var(--transition-fast)
      );
      user-select: none;
    }

    .field:focus {
      outline: none;
    }

    /* Expand height for multi-select chips or inset label */
    :host([multiple]) .field,
    .field:has(.label-inset:not([hidden])) {
      height: auto;
    }

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

    .trigger-row {
      align-items: center;
      display: flex;
      flex: 1;
      flex-wrap: wrap;
      gap: var(--_gap);
      max-width: calc(100% - var(--size-10));
      min-height: var(--_row-min-height);
    }

    .chips-row {
      align-items: center;
      display: none;
      flex-wrap: wrap;
      gap: var(--size-1);
      flex: 1;
      min-width: 0;
    }

    .trigger-value {
      color: var(--_theme-content);
      flex: 1;
      font-size: var(--_font-size);
      line-height: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      transition: color var(--transition-fast);
      white-space: nowrap;
    }

    .trigger-placeholder {
      color: var(--_placeholder);
      transition: color var(--transition-fast);
    }

    .trigger-icon {
      align-items: center;
      color: var(--color-contrast-500);
      display: flex;
      height: 100%;
      justify-content: center;
      position: absolute;
      inset-inline-end: var(--size-2);
      top: 0;
      transition: transform var(--transition-fast);
      width: var(--size-6);
    }

    :host([open]) .trigger-icon {
      transform: rotate(180deg);
    }

    .loader {
      animation: var(--_motion-animation, bit-select-spin 0.6s linear infinite);
      border-radius: 50%;
      border: 2px solid currentColor;
      border-inline-end-color: transparent;
      display: none;
      flex-shrink: 0;
      height: 1em;
      width: 1em;
    }

    :host([loading]) .loader {
      display: inline-block;
    }

    :host([loading]) .trigger-icon svg {
      display: none;
    }

    @keyframes bit-select-spin {
      to {
        transform: rotate(360deg);
      }
    }

    /* ========================================
       Dropdown Listbox
       ======================================== */

    .dropdown {
      background: var(--color-canvas);
      border-radius: var(--_radius);
      border: var(--border) solid var(--color-contrast-200);
      box-shadow: var(--shadow-lg);
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      gap: var(--size-0-5);
      max-height: 260px;
      overflow-y: auto;
      overscroll-behavior: contain;
      padding: var(--size-1);
      position: fixed;
      z-index: var(--z-dropdown, 8000);

      /* Hidden by default */
      opacity: 0;
      pointer-events: none;
      transform: translateY(-4px);
      visibility: hidden;
      transition: var(
        --_motion-transition,
        opacity var(--transition-fast),
        transform var(--transition-fast),
        visibility var(--transition-fast)
      );
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

    /* ========================================
       Option Groups
       ======================================== */

    .optgroup-label {
      color: var(--color-contrast-500);
      font-size: var(--text-xs);
      font-weight: var(--font-semibold);
      letter-spacing: var(--tracking-wide, 0.05em);
      padding: var(--size-1-5) var(--size-2-5) var(--size-1);
      text-transform: uppercase;
    }

    /* ========================================
       Loading / No-Results
       ======================================== */

    .dropdown-loading,
    .dropdown-empty {
      color: var(--color-contrast-500);
      font-size: var(--_font-size);
      padding: var(--size-3) var(--size-2-5);
      text-align: center;
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
       States
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

    /* ========================================
       Error State
       ======================================== */

    :host([has-error]) .field {
      border-color: var(--color-error);
    }

    :host([has-error]) .field:focus-within {
      border-color: var(--color-error);
      box-shadow: var(--color-error-focus-shadow);
    }

    :host([has-error]) .label-inset,
    :host([has-error]) .label-outside {
      color: var(--color-error);
    }
  }

  @layer buildit.variants {
    /* ========================================
       Visual Variants
       ======================================== */

    /* Solid (Default) - Standard select with background */
    :host(:not([variant])) .field,
    :host([variant='solid']) .field {
      background: var(--color-contrast-50);
      border-color: var(--color-contrast-300);
      box-shadow: var(--shadow-2xs);
    }

    :host(:not([variant]):not([disabled])) .field:focus-within,
    :host([variant='solid']:not([disabled])) .field:focus-within {
      box-shadow: var(--_theme-shadow);
    }

    /* Flat - Minimal with subtle color hint */
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

    /* Bordered - Filled with theme color */
    :host([variant='bordered']) .field {
      background: var(--_theme-backdrop);
      border-color: color-mix(in srgb, var(--_theme-focus) 70%, transparent);
    }

    :host([variant='bordered']) .trigger-value {
      color: var(--_theme-content);
    }

    :host([variant='bordered']) .trigger-placeholder {
      color: color-mix(in srgb, var(--_theme-content) 45%, transparent);
    }

    :host([variant='bordered']) .field:hover {
      border-color: var(--_theme-focus);
    }

    /* Outline - Transparent background */
    :host([variant='outline']) .field {
      background: transparent;
      box-shadow: none;
    }

    :host([variant='outline']:not([disabled])) .field:focus-within {
      box-shadow: var(--_theme-shadow);
    }

    /* Ghost - Transparent until hover */
    :host([variant='ghost']) .field {
      background: transparent;
      border-color: transparent;
      box-shadow: none;
    }

    :host([variant='ghost']) .field:hover {
      background: var(--color-contrast-100);
    }

    :host([variant='ghost']:not([disabled])) .field:focus-within {
      box-shadow: var(--_theme-shadow);
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
// Component Props
// ============================================

/** Select component properties */
export interface SelectProps extends ThemableProps, SizableProps, DisablableProps {
  /** Error message */
  error?: string;
  /** Helper text */
  helper?: string;
  /** Label text */
  label?: string;
  /** Label placement: 'inset' | 'outside' */
  'label-placement'?: 'inset' | 'outside';
  /** Show loading state in dropdown */
  loading?: boolean;
  /** Allow selecting multiple options */
  multiple?: boolean;
  /** Form field name */
  name?: string;
  /** JS options array (alternative to slotted <option> elements) */
  options?: OptionItem[];
  /** Placeholder text when no option is selected */
  placeholder?: string;
  /** Mark the field as required */
  required?: boolean;
  /** Border radius size */
  rounded?: RoundedSize | '';
  /** Current value (use comma-separated for multiple) */
  value?: string;
  /** Visual style variant */
  variant?: Exclude<VisualVariant, 'glass' | 'text' | 'frost'>;
  /** Expand to full width */
  fullwidth?: boolean;
}

/**
 * A fully custom form-associated select dropdown with keyboard navigation and ARIA support.
 * Reads `<option>` and `<optgroup>` children from the default slot.
 *
 * @element bit-select
 *
 * @attr {string} label - Label text
 * @attr {string} label-placement - 'inset' | 'outside'
 * @attr {string} value - Current selected value(s) (comma-separated for multiple)
 * @attr {string} placeholder - Placeholder when no option selected
 * @attr {string} name - Form field name
 * @attr {boolean} multiple - Enable multi-select
 * @attr {boolean} disabled - Disable the select
 * @attr {boolean} required - Required field
 * @attr {string} helper - Helper text below the select
 * @attr {string} error - Error message
 * @attr {string} color - Theme color
 * @attr {string} variant - Visual variant
 * @attr {string} size - Component size
 * @attr {string} rounded - Border radius
 * @attr {boolean} fullwidth - Expand to full width
 *
 * @fires change - Fired when selection changes with the new value
 *
 * @slot - `<option>` and `<optgroup>` elements
 *
 * @cssprop --select-bg - Background
 * @cssprop --select-border-color - Border color
 * @cssprop --select-radius - Border radius
 * @cssprop --select-padding - Padding
 * @cssprop --select-font-size - Font size
 * @cssprop --select-placeholder-color - Placeholder text color
 *
 * @example
 * ```html
 * <bit-select label="Role" value="admin">
 *   <option value="admin">Administrator</option>
 *   <option value="editor">Editor</option>
 *   <option value="viewer">Viewer</option>
 * </bit-select>
 *
 * <bit-select label="Tags" multiple color="primary">
 *   <optgroup label="Frontend">
 *     <option value="react">React</option>
 *     <option value="vue">Vue</option>
 *   </optgroup>
 *   <optgroup label="Backend">
 *     <option value="node">Node.js</option>
 *   </optgroup>
 * </bit-select>
 * ```
 */
export const TAG = define(
  'bit-select',
  ({ host }) => {
    const emit = defineEmits<{
      change: { originalEvent?: Event; value: string; values: string[] };
    }>();

    const props = defineProps<Omit<SelectProps, 'options'>>({
      // 'options' is a JS-only prop handled via Object.defineProperty
      color: { default: undefined },
      disabled: { default: false },
      error: { default: '', omit: true },
      fullwidth: { default: false },
      helper: { default: '' },
      label: { default: '' },
      'label-placement': { default: 'inset' },
      loading: { default: false },
      multiple: { default: false },
      name: { default: '' },
      placeholder: { default: '' },
      required: { default: false },
      rounded: { default: undefined },
      size: { default: undefined },
      value: { default: '' },
      variant: { default: undefined },
    });

    // ============================================
    // State
    // ============================================

    const selectedValues = signal<string[]>([]);
    const slottedOptions = signal<OptionItem[]>([]);
    const isOpen = signal(false);
    const focusedIndex = signal(-1);
    const isLoading = signal(false);

    // Merged options: JS prop overrides slotted options
    const options = computed(() => {
      const jsProp = (host as unknown as { _optionsProp?: OptionItem[] })._optionsProp;

      return jsProp && jsProp.length > 0 ? jsProp : slottedOptions.value;
    });

    const formCtx = inject(FORM_CTX);

    // Form-associated value (comma-separated for multiple)
    const formValue = computed(() => selectedValues.value.join(','));
    const fd = defineField(
      { disabled: computed(() => Boolean(props.disabled.value) || Boolean(formCtx?.disabled.value)), value: formValue },
      {
        onReset: () => {
          selectedValues.value = [];
        },
      },
    );

    function triggerValidation(on: 'blur' | 'change'): void {
      if (formCtx?.validateOn.value === on) fd.reportValidity();
    }

    // Sync open attribute on host
    watch(isOpen, (v) => host.toggleAttribute('open', v), { immediate: true });

    // Sync has-error attribute on host (error is a string prop, needs boolean attribute for CSS)
    watch(props.error, (v) => host.toggleAttribute('has-error', Boolean(v)), { immediate: true });

    // Accessibility IDs
    const { fieldId: selectId, labelId } = createFormIds('select', props.name);
    const listboxId = `listbox-${selectId}`;

    // DOM refs
    let triggerEl: HTMLElement | null = null;
    let dropdownEl: HTMLElement | null = null;

    // Refs for dynamic content
    const labelOutsideRef = ref<HTMLSpanElement>();
    const labelInsetRef = ref<HTMLSpanElement>();
    const helperRef = ref<HTMLDivElement>();
    const triggerValueRef = ref<HTMLSpanElement>();
    const chipsRowRef = ref<HTMLDivElement>();
    const dropdownContentRef = ref<HTMLDivElement>();
    const dropdownSpacerRef = ref<HTMLDivElement>();
    const dropdownLoadingRef = ref<HTMLDivElement>();
    const dropdownEmptyRef = ref<HTMLDivElement>();

    // ============================================
    // Option reading from slot
    // ============================================

    function readOptions() {
      const slot = host.shadowRoot?.querySelector<HTMLSlotElement>('slot');

      if (!slot) return;

      const assigned = slot.assignedElements({ flatten: true });

      const items: OptionItem[] = [];

      for (const el of assigned) {
        if (el.tagName === 'OPTION') {
          const opt = el as HTMLOptionElement;

          items.push({ disabled: opt.disabled, label: opt.text || opt.value, value: opt.value });
        } else if (el.tagName === 'OPTGROUP') {
          const group = el as HTMLOptGroupElement;
          const groupLabel = group.label;

          for (const child of Array.from(group.querySelectorAll('option'))) {
            const opt = child as HTMLOptionElement;

            items.push({ disabled: opt.disabled, group: groupLabel, label: opt.text || opt.value, value: opt.value });
          }
        }
      }
      slottedOptions.value = items;
    }

    // Initialize selectedValues from prop
    effect(() => {
      if (props.value.value) {
        selectedValues.value = props.value.value
          .split(',')
          .map((v) => v.trim())
          .filter(Boolean);
      }
    });

    // Sync loading prop
    effect(() => {
      isLoading.value = Boolean(props.loading.value);
    });

    // Expose JS options property setter
    Object.defineProperty(host, 'options', {
      get() {
        return options.value;
      },
      set(val: OptionItem[]) {
        (host as unknown as { _optionsProp?: OptionItem[] })._optionsProp = val;
        slottedOptions.value = [...slottedOptions.value]; // trigger recompute
      },
    });

    // ============================================
    // Display value
    // ============================================

    const displayLabel = computed(() => {
      if (selectedValues.value.length === 0) return '';

      if (props.multiple.value && selectedValues.value.length > 1) {
        return `${selectedValues.value.length} selected`;
      }

      const first = selectedValues.value[0];

      return options.value.find((o) => o.value === first)?.label ?? first;
    });

    // ============================================
    // Dropdown positioning
    // ============================================

    let autoUpdateCleanup: (() => void) | null = null;

    function updateDropdownPosition() {
      if (!dropdownEl || !triggerEl) return;

      const referenceWidth = triggerEl.getBoundingClientRect().width;

      positionFloat(triggerEl, dropdownEl, {
        middleware: [
          flip({ padding: 6 }),
          shift({ padding: 6 }),
          size({
            apply({ elements }) {
              elements.floating.style.width = `${referenceWidth}px`;
            },
            padding: 6,
          }),
        ],
        placement: 'bottom-start',
      });
    }

    // ============================================
    // Open / Close
    // ============================================

    function open() {
      if (props.disabled.value) return;

      isOpen.value = true;
      focusedIndex.value =
        selectedValues.value.length > 0 ? options.value.findIndex((o) => o.value === selectedValues.value[0]) : 0;
      requestAnimationFrame(() => {
        // Start autoUpdate: repositions on scroll, resize, reference size change
        if (triggerEl && dropdownEl) {
          autoUpdateCleanup?.();
          autoUpdateCleanup = autoUpdate(triggerEl, dropdownEl, updateDropdownPosition);
        } else {
          updateDropdownPosition();
        }

        scrollFocusedIntoView();
      });
    }

    function close() {
      autoUpdateCleanup?.();
      autoUpdateCleanup = null;
      isOpen.value = false;
      focusedIndex.value = -1;
      triggerEl?.focus();
      triggerValidation('blur');
    }

    // ============================================
    // Selection
    // ============================================

    function selectOption(opt: OptionItem, e?: Event) {
      if (opt.disabled) return;

      if (props.multiple.value) {
        const idx = selectedValues.value.indexOf(opt.value);

        selectedValues.value =
          idx >= 0 ? selectedValues.value.filter((v) => v !== opt.value) : [...selectedValues.value, opt.value];
      } else {
        selectedValues.value = [opt.value];
        close();
      }

      emit('change', { originalEvent: e, value: formValue.value, values: [...selectedValues.value] });
      triggerValidation('change');
    }

    // ============================================
    // Keyboard navigation
    // ============================================

    function scrollFocusedIntoView() {
      const idx = focusedIndex.value;

      if (virtualizer && idx >= 0) {
        // Use flat-list index (groups shift real indices), but scrollToIndex uses flat list index
        const flatList = buildFlatList(options.value);
        const flatIdx = flatList.findIndex((r) => r.type === 'option' && r.idx === idx);

        if (flatIdx >= 0) virtualizer.scrollToIndex(flatIdx, { align: 'auto' });

        return;
      }

      if (!dropdownEl) return;

      const focusedEl = dropdownEl.querySelector<HTMLElement>('[data-focused]');

      focusedEl?.scrollIntoView({ block: 'nearest' });
    }

    function handleTriggerKeydown(e: KeyboardEvent) {
      if (props.disabled.value) return;

      const opts = options.value;

      switch (e.key) {
        case ' ':
        case 'Enter':
          e.preventDefault();

          if (isOpen.value) {
            const idx = focusedIndex.value;

            if (idx >= 0 && idx < opts.length) selectOption(opts[idx], e);
          } else {
            open();
          }

          break;
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
        case 'End':
          if (isOpen.value) {
            e.preventDefault();
            focusedIndex.value = opts.length - 1;
            scrollFocusedIntoView();
          }

          break;
        case 'Escape':
          e.preventDefault();
          close();
          break;
        case 'Home':
          if (isOpen.value) {
            e.preventDefault();
            focusedIndex.value = 0;
            scrollFocusedIntoView();
          }

          break;
        case 'Tab':
          close();
          break;
      }
    }

    // ============================================
    // Lifecycle
    // ============================================

    // ============================================
    // Virtualizer
    // ============================================

    // Flatten options to a linear renderable list (group headers + options)
    function buildFlatList(
      opts: OptionItem[],
    ): Array<{ idx: number; opt: OptionItem; type: 'option' } | { label: string; type: 'group' }> {
      const flat: Array<{ idx: number; opt: OptionItem; type: 'option' } | { label: string; type: 'group' }> = [];
      const groups = new Map<string | undefined, OptionItem[]>();

      for (const opt of opts) {
        const key = opt.group;

        if (!groups.has(key)) groups.set(key, []);

        groups.get(key)!.push(opt);
      }

      let globalIdx = 0;

      for (const [groupLabel, groupOpts] of groups) {
        if (groupLabel !== undefined) flat.push({ label: groupLabel, type: 'group' });

        for (const opt of groupOpts) flat.push({ idx: globalIdx++, opt, type: 'option' });
      }

      return flat;
    }

    let virtualizer: ReturnType<typeof createVirtualizer> | null = null;

    function setupVirtualizer() {
      virtualizer?.destroy();

      const scrollEl = dropdownEl;

      if (!scrollEl || !dropdownContentRef.value) return;

      const flatList = buildFlatList(options.value);

      virtualizer = createVirtualizer({
        count: flatList.length,
        estimateSize: (i) => (flatList[i]?.type === 'group' ? 28 : 36),
        getScrollElement: () => scrollEl,
        onChange: (virtualItems, totalSize) => {
          const container = dropdownContentRef.value;
          const spacer = dropdownSpacerRef.value;

          if (!container || !spacer) return;

          spacer.style.height = `${totalSize}px`;
          container.innerHTML = '';

          for (const item of virtualItems) {
            const row = flatList[item.index];

            if (!row) continue;

            if (row.type === 'group') {
              const groupHeader = document.createElement('div');

              groupHeader.className = 'optgroup-label';
              groupHeader.setAttribute('role', 'presentation');
              groupHeader.textContent = row.label;
              groupHeader.style.cssText = `position:absolute;top:${item.top}px;left:0;right:0;`;
              container.appendChild(groupHeader);
            } else {
              const { idx, opt } = row;
              const isFocused = idx === focusedIndex.value;
              const isSelected = selectedValues.value.includes(opt.value);

              const optionEl = document.createElement('div');

              optionEl.className = 'option';
              optionEl.setAttribute('role', 'option');
              optionEl.id = `${selectId}-opt-${idx}`;
              optionEl.setAttribute('aria-selected', String(isSelected));
              optionEl.setAttribute('aria-disabled', String(opt.disabled));
              optionEl.style.cssText = `position:absolute;top:${item.top}px;left:0;right:0;`;

              if (isFocused) optionEl.setAttribute('data-focused', '');

              if (isSelected) optionEl.setAttribute('data-selected', '');

              if (opt.disabled) optionEl.setAttribute('data-disabled', '');

              const label = document.createElement('span');

              label.textContent = opt.label;
              optionEl.appendChild(label);

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
                focusedIndex.value = idx;
              });
              container.appendChild(optionEl);
            }
          }
        },
        overscan: 4,
      });
    }

    onMount(() => {
      onSlotChange('default', readOptions);

      // Rebuild virtualizer when options list changes
      effect(() => {
        // Access options & isOpen to re-create virtualizer when either changes
        const opts = options.value;
        const open = isOpen.value;

        if (open && opts.length > 0) {
          requestAnimationFrame(() => setupVirtualizer());
        } else if (!open) {
          virtualizer?.destroy();
          virtualizer = null;
        }
      });

      mountLabelSyncStandalone(labelInsetRef, labelOutsideRef, props);

      // Effect to manage dynamic content and visibility
      effect(() => {
        // Helper / error
        if (helperRef.value) {
          helperRef.value.textContent = props.error.value || props.helper.value;
          helperRef.value.hidden = !props.error.value && !props.helper.value;
          helperRef.value.style.color = props.error.value ? 'var(--color-error)' : '';
        }

        // Trigger value / chips
        if (triggerValueRef.value && chipsRowRef.value) {
          if (props.multiple.value && selectedValues.value.length > 0) {
            // Multiple mode: render chips
            triggerValueRef.value.hidden = true;
            chipsRowRef.value.style.display = 'flex';
            // Re-build chips
            chipsRowRef.value.innerHTML = '';
            for (const val of selectedValues.value) {
              const optLabel = options.value.find((o) => o.value === val)?.label ?? val;
              const chip = document.createElement(CHIP_TAG) as HTMLElement & { mode?: string; value?: string };

              chip.setAttribute('value', val);
              chip.setAttribute('mode', 'removable');
              chip.setAttribute('variant', 'flat');
              chip.setAttribute('size', 'sm');

              if (props.color.value) chip.setAttribute('color', props.color.value);

              chip.textContent = optLabel;
              chip.addEventListener('remove', (e: Event) => {
                e.stopPropagation();

                const detail = (e as CustomEvent<{ value: string | undefined }>).detail;

                if (detail.value !== undefined) {
                  selectedValues.value = selectedValues.value.filter((v) => v !== detail.value);
                  emit('change', { value: formValue.value, values: [...selectedValues.value] });
                  triggerValidation('change');
                }
              });
              chipsRowRef.value.appendChild(chip);
            }
          } else {
            // Single mode (or multiple with no selection)
            chipsRowRef.value.style.display = '';
            triggerValueRef.value.hidden = false;

            const display = displayLabel.value || props.placeholder.value || '';

            triggerValueRef.value.textContent = display;
            triggerValueRef.value.className = displayLabel.value
              ? 'trigger-value'
              : 'trigger-value trigger-placeholder';
          }
        } else if (triggerValueRef.value) {
          const display = displayLabel.value || props.placeholder.value || '';

          triggerValueRef.value.textContent = display;
          triggerValueRef.value.className = displayLabel.value ? 'trigger-value' : 'trigger-value trigger-placeholder';
        }

        // Loading / empty states
        if (dropdownLoadingRef.value) dropdownLoadingRef.value.hidden = !isLoading.value;

        if (dropdownEmptyRef.value) dropdownEmptyRef.value.hidden = isLoading.value || options.value.length > 0;

        // Spacer + virtual container visibility
        if (dropdownContentRef.value) dropdownContentRef.value.hidden = isLoading.value;

        if (dropdownSpacerRef.value) dropdownSpacerRef.value.hidden = isLoading.value;

        // Re-render virtualizer on focused/selected changes (options handled by separate effect)
        virtualizer?.measure();

        // Dropdown open state
        if (dropdownEl) {
          if (isOpen.value) {
            dropdownEl.setAttribute('data-open', '');
          } else {
            dropdownEl.removeAttribute('data-open');
          }
        }

        // Field tabindex
        if (triggerEl) {
          triggerEl.setAttribute('tabindex', props.disabled.value ? '-1' : '0');
        }
      });

      if (triggerEl) {
        aria(triggerEl, {
          activedescendant: () => (focusedIndex.value >= 0 ? `${selectId}-opt-${focusedIndex.value}` : null),
          disabled: () => props.disabled.value,
          expanded: () => isOpen.value,
          invalid: () => !!props.error.value,
          labelledby: () => (hasLabel.value ? labelId : null),
        });
      }

      // Close on outside click
      const handleOutsideClick = (e: MouseEvent) => {
        if (!isOpen.value) return;

        if (!host.contains(e.target as Node) && !dropdownEl?.contains(e.target as Node)) {
          close();
        }
      };

      document.addEventListener('click', handleOutsideClick, true);

      // Propagate form context size/variant/disabled to host
      mountFormContextSync(host, formCtx, props);

      return () => {
        virtualizer?.destroy();
        autoUpdateCleanup?.();
        autoUpdateCleanup = null;
        document.removeEventListener('click', handleOutsideClick, true);
      };
    });

    // ============================================
    // Computed helpers
    // ============================================

    const hasLabel = computed(() => !!props.label.value);

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
        forcedColorsFocusMixin('.field'),
        componentStyles,
      ],
      template: html`<slot style="display:none"></slot>
        <div class="select-wrapper">
          <label class="label-outside" id="${labelId}" ref=${labelOutsideRef} hidden></label>
          <div
            class="field"
            ref=${(el: HTMLElement) => {
              triggerEl = el;
            }}
            role="combobox"
            tabindex="0"
            aria-controls="${listboxId}"
            aria-expanded="false"
            aria-labelledby="${labelId}"
            @click=${(e: MouseEvent) => {
              e.stopPropagation();

              if (isOpen.value) close();
              else open();
            }}
            @keydown=${handleTriggerKeydown}>
            <label class="label-inset" id="${labelId}" ref=${labelInsetRef} hidden></label>
            <div class="trigger-row">
              <div class="chips-row" ref=${chipsRowRef}></div>
              <span class="trigger-value" ref=${triggerValueRef}></span>
            </div>
            <span class="trigger-icon" aria-hidden="true">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round">
                <path d="m6 9 6 6 6-6" />
              </svg>
              <span class="loader" aria-label="Loading"></span>
            </span>
          </div>
          <div class="helper-text" aria-live="polite" ref=${helperRef} hidden></div>
        </div>
        <div
          class="dropdown"
          role="listbox"
          id="${listboxId}"
          aria-label="Options"
          ref=${(el: HTMLElement) => {
            dropdownEl = el;
          }}>
          <div ref=${dropdownLoadingRef} class="dropdown-loading" hidden>Loading…</div>
          <div ref=${dropdownEmptyRef} class="dropdown-empty" hidden>No options</div>
          <div style="position:relative" ref=${dropdownSpacerRef}>
            <div ref=${dropdownContentRef} style="position:absolute;top:0;left:0;right:0"></div>
          </div>
        </div>`,
    };
  },
  { formAssociated: true, shadow: { delegatesFocus: true } },
);

declare global {
  interface HTMLElementTagNameMap {
    'bit-select': HTMLElement & SelectProps & FormValidityMethods & AddEventListeners<BitSelectEvents>;
  }
}
