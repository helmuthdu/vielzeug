import {
  computed,
  createId,
  css,
  define,
  defineEmits,
  defineProps,
  effect,
  field,
  html,
  onFormReset,
  onMount,
  ref,
  signal,
} from '@vielzeug/craftit';
import {
  colorThemeMixin,
  disabledLoadingMixin,
  roundedVariantMixin,
  sizeVariantMixin,
} from '../../styles';
import type { ComponentSize, RoundedSize, ThemeColor, VisualVariant } from '../../types';

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
      min-height: var(--size-10);
      padding: var(--_padding);
      padding-right: calc(var(--_padding) + var(--size-6));
      position: relative;
      transition:
        background var(--transition-fast),
        backdrop-filter var(--transition-slow),
        border-color var(--transition-fast),
        box-shadow var(--transition-fast),
        transform var(--transition-fast);
      user-select: none;
    }

    .field:focus {
      outline: none;
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
      gap: var(--_gap);
      min-height: var(--size-6);
      max-width: calc(100% - var(--size-10));
    }

    .trigger-value {
      color: var(--_theme-content);
      flex: 1;
      font-size: var(--_font-size);
      line-height: var(--leading-normal);
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
      right: var(--size-2);
      top: 0;
      transition: transform var(--transition-fast);
      width: var(--size-6);
    }

    :host([open]) .trigger-icon {
      transform: rotate(180deg);
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
      transition:
        opacity var(--transition-fast),
        transform var(--transition-fast),
        visibility var(--transition-fast);
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
      margin-left: auto;
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

    :host([error]) .field {
      border-color: var(--color-error);
    }

    :host([error]) .field:focus-within {
      border-color: var(--color-error);
      box-shadow: var(--color-error-focus-shadow);
    }

    :host([error]) .label-inset,
    :host([error]) .label-outside {
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

    /* Ghost - Transparent until hover */
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
// Component Props
// ============================================

/** Select component properties */
export interface SelectProps {
  /** Theme color */
  color?: ThemeColor;
  /** Disable interaction */
  disabled?: boolean;
  /** Error message */
  error?: string;
  /** Helper text */
  helper?: string;
  /** Label text */
  label?: string;
  /** Label placement: 'inset' | 'outside' */
  'label-placement'?: 'inset' | 'outside';
  /** Allow selecting multiple options */
  multiple?: boolean;
  /** Form field name */
  name?: string;
  /** Placeholder text when no option is selected */
  placeholder?: string;
  /** Mark the field as required */
  required?: boolean;
  /** Border radius size */
  rounded?: RoundedSize | '';
  /** Component size */
  size?: ComponentSize;
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
define(
  'bit-select',
  ({ host }) => {
    const emit = defineEmits<{
      change: { value: string; values: string[]; originalEvent?: Event };
    }>();

    const props = defineProps({
      color: { default: undefined as ThemeColor | undefined, reflect: true },
      disabled: { default: false, reflect: true },
      error: { default: '' },
      fullwidth: { default: false, reflect: true },
      helper: { default: '' },
      label: { default: '' },
      'label-placement': { default: 'inset' },
      multiple: { default: false },
      name: { default: '' },
      placeholder: { default: '' },
      required: { default: false },
      rounded: { default: undefined as RoundedSize | undefined, reflect: true },
      size: { default: undefined as ComponentSize | undefined, reflect: true },
      value: { default: '' },
      variant: { default: undefined as Exclude<VisualVariant, 'glass' | 'text' | 'frost'> | undefined, reflect: true },
    });

    // ============================================
    // State
    // ============================================

    const selectedValues = signal<string[]>([]);
    const options = signal<OptionItem[]>([]);
    const isOpen = signal(false);
    const focusedIndex = signal(-1);

    // Form-associated value (comma-separated for multiple)
    const formValue = computed(() => selectedValues.value.join(','));
    field({
      disabled: computed(() => Boolean(props.disabled.value)),
      value: formValue,
    });

    onFormReset(() => {
      selectedValues.value = [];
    });

    // Sync open attribute on host
    effect(() => {
      if (isOpen.value) {
        host.setAttribute('open', '');
      } else {
        host.removeAttribute('open');
      }
    });

    // Sync error attribute on host (error is a string prop, needs boolean attribute for CSS)
    effect(() => {
      if (props.error.value) {
        host.setAttribute('error', '');
      } else {
        host.removeAttribute('error');
      }
    });

    // Accessibility IDs
    const selectId = props.name.value ? `select-${props.name.value}` : createId('select');
    const labelId = `label-${selectId}`;
    const listboxId = `listbox-${selectId}`;

    // DOM refs
    let triggerEl: HTMLElement | null = null;
    let dropdownEl: HTMLElement | null = null;

    // Refs for dynamic content
    const labelOutsideRef = ref<HTMLSpanElement>();
    const labelInsetRef = ref<HTMLSpanElement>();
    const helperRef = ref<HTMLDivElement>();
    const triggerValueRef = ref<HTMLSpanElement>();
    const dropdownContentRef = ref<HTMLDivElement>();

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
      options.value = items;
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

    function updateDropdownPosition() {
      if (!dropdownEl || !triggerEl) return;
      const triggerRect = triggerEl.getBoundingClientRect();
      const dropRect = dropdownEl.getBoundingClientRect();
      const vp = { h: window.innerHeight, w: window.innerWidth };

      const spaceBelow = vp.h - triggerRect.bottom;
      const spaceAbove = triggerRect.top;
      const openUpward = spaceBelow < dropRect.height && spaceAbove > spaceBelow;

      const top = openUpward ? triggerRect.top - dropRect.height - 4 : triggerRect.bottom + 4;
      const left = Math.max(8, Math.min(triggerRect.left, vp.w - dropRect.width - 8));
      const width = triggerRect.width;

      dropdownEl.style.top = `${top}px`;
      dropdownEl.style.left = `${left}px`;
      dropdownEl.style.width = `${width}px`;
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
        updateDropdownPosition();
        scrollFocusedIntoView();
      });
    }

    function close() {
      isOpen.value = false;
      focusedIndex.value = -1;
      triggerEl?.focus();
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
    }

    // ============================================
    // Keyboard navigation
    // ============================================

    function scrollFocusedIntoView() {
      if (!dropdownEl) return;
      const focusedEl = dropdownEl.querySelector<HTMLElement>('[data-focused]');
      focusedEl?.scrollIntoView({ block: 'nearest' });
    }

    function handleTriggerKeydown(e: KeyboardEvent) {
      if (props.disabled.value) return;
      const opts = options.value;

      switch (e.key) {
        case 'Enter':
        case ' ':
          e.preventDefault();
          if (isOpen.value) {
            const idx = focusedIndex.value;
            if (idx >= 0 && idx < opts.length) selectOption(opts[idx], e);
          } else {
            open();
          }
          break;
        case 'Escape':
          e.preventDefault();
          close();
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
        case 'Tab':
          close();
          break;
      }
    }

    // ============================================
    // Lifecycle
    // ============================================

    onMount(() => {
      const slot = host.shadowRoot?.querySelector<HTMLSlotElement>('slot');
      if (slot) {
        slot.addEventListener('slotchange', readOptions);
        readOptions();
      }

      // Effect to manage dynamic content and visibility
      const stopEffects = effect(() => {
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

        // Helper / error
        if (helperRef.value) {
          helperRef.value.textContent = props.error.value || props.helper.value;
          helperRef.value.hidden = !props.error.value && !props.helper.value;
          helperRef.value.style.color = props.error.value ? 'var(--color-error)' : '';
        }

        // Trigger value
        if (triggerValueRef.value) {
          const display = displayLabel.value || props.placeholder.value || '';
          triggerValueRef.value.textContent = display;
          triggerValueRef.value.className = displayLabel.value ? 'trigger-value' : 'trigger-value trigger-placeholder';
        }

        // Render options into dropdown
        if (dropdownContentRef.value) {
          const container = dropdownContentRef.value;
          container.innerHTML = ''; // Clear existing options

          const opts = options.value;
          const focused = focusedIndex.value;

          // Group by optgroup label
          const groups = new Map<string | undefined, OptionItem[]>();
          for (const opt of opts) {
            const key = opt.group;
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key)!.push(opt);
          }

          let globalIdx = 0;
          for (const [groupLabel, groupOpts] of groups) {
            if (groupLabel !== undefined) {
              const groupHeader = document.createElement('div');
              groupHeader.className = 'optgroup-label';
              groupHeader.setAttribute('role', 'presentation');
              groupHeader.textContent = groupLabel;
              container.appendChild(groupHeader);
            }

            for (const opt of groupOpts) {
              const idx = globalIdx++;
              const isFocused = idx === focused;
              const isSelected = selectedValues.value.includes(opt.value);

              const optionEl = document.createElement('div');
              optionEl.className = 'option';
              optionEl.setAttribute('role', 'option');
              optionEl.id = `${selectId}-opt-${idx}`;
              optionEl.setAttribute('aria-selected', String(isSelected));
              optionEl.setAttribute('aria-disabled', String(opt.disabled));

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

              // Event handlers
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
        }

        // Dropdown open state
        if (dropdownEl) {
          if (isOpen.value) {
            dropdownEl.setAttribute('data-open', '');
          } else {
            dropdownEl.removeAttribute('data-open');
          }
        }

        // Field aria attributes
        if (triggerEl) {
          triggerEl.setAttribute('aria-expanded', String(isOpen.value));
          triggerEl.setAttribute('aria-invalid', props.error.value ? 'true' : 'false');
          triggerEl.setAttribute('aria-disabled', String(props.disabled.value));
          triggerEl.setAttribute('tabindex', props.disabled.value ? '-1' : '0');
          if (hasLabel.value) {
            triggerEl.setAttribute('aria-labelledby', labelId);
          } else {
            triggerEl.removeAttribute('aria-labelledby');
          }
          if (focusedIndex.value >= 0) {
            triggerEl.setAttribute('aria-activedescendant', `${selectId}-opt-${focusedIndex.value}`);
          } else {
            triggerEl.removeAttribute('aria-activedescendant');
          }
        }
      });

      // Close on outside click
      const handleOutsideClick = (e: MouseEvent) => {
        if (!isOpen.value) return;
        if (!host.contains(e.target as Node) && !dropdownEl?.contains(e.target as Node)) {
          close();
        }
      };

      // Reposition on scroll/resize
      const handleReposition = () => {
        if (isOpen.value) updateDropdownPosition();
      };

      document.addEventListener('click', handleOutsideClick, true);
      window.addEventListener('scroll', handleReposition, true);
      window.addEventListener('resize', handleReposition);

      return () => {
        stopEffects();
        slot?.removeEventListener('slotchange', readOptions);
        document.removeEventListener('click', handleOutsideClick, true);
        window.removeEventListener('scroll', handleReposition, true);
        window.removeEventListener('resize', handleReposition);
      };
    });

    // ============================================
    // Computed helpers
    // ============================================

    const hasLabel = computed(() => !!props.label.value);

    return {
      styles: [
        sizeVariantMixin({
          lg: { '--_padding': 'var(--size-2-5) var(--size-3-5)', fontSize: 'var(--text-base)', gap: 'var(--size-2-5)' },
          sm: { '--_padding': 'var(--size-1) var(--size-2)', fontSize: 'var(--text-xs)', gap: 'var(--size-1-5)' },
        }),
        roundedVariantMixin,
        colorThemeMixin,
        disabledLoadingMixin(),
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
            </span>
          </div>
          <div class="helper-text" ref=${helperRef} hidden></div>
        </div>
        <div
          class="dropdown"
          role="listbox"
          id="${listboxId}"
          aria-label="Options"
          ref=${(el: HTMLElement) => {
            dropdownEl = el;
          }}>
          <div ref=${dropdownContentRef}></div>
        </div>`,
    };
  },
  { formAssociated: true },
);

export default {};
