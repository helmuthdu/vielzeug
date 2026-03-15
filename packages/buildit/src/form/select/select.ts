import {
  aria,
  computed,
  createFormIds,
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
import { createVirtualizer, type VirtualItem } from '@vielzeug/virtualit';

import type { DisablableProps, RoundedSize, SizableProps, ThemableProps, VisualVariant } from '../../types';

import { CHIP_TAG } from '../../feedback/chip/chip';
import { checkIconHTML, chevronDownIcon } from '../../icons';
import { disabledLoadingMixin, forcedColorsFocusMixin, formFieldMixins, sizeVariantMixin } from '../../styles';
import { mountFormContextSync, mountLabelSyncStandalone } from '../../utils/use-text-field';
import { FORM_CTX } from '../form/form';

// ============================================
// Types
// ============================================

type OptionItem = {
  disabled: boolean;
  group?: string;
  label: string;
  value: string;
};

// ============================================
// Styles
// ============================================

import componentStyles from './select.css?inline';

// ============================================
// Component Props
// ============================================

/** Select component properties */

export type BitSelectEvents = {
  change: { originalEvent?: Event; value: string; values: string[] };
};

export type BitSelectProps = ThemableProps &
  SizableProps &
  DisablableProps & {
    /** Error message */
    error?: string;
    /** Expand to full width */
    fullwidth?: boolean;
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
  };

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
export const SELECT_TAG = define(
  'bit-select',
  ({ host }) => {
    const emit = defineEmits<BitSelectEvents>();

    const props = defineProps<Omit<BitSelectProps, 'options'>>({
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
    const isLoading = computed(() => Boolean(props.loading.value));

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

    const hasLabel = computed(() => !!props.label.value);

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
          autoUpdateCleanup = autoUpdate(triggerEl, dropdownEl, updateDropdownPosition, { observeFloating: false });
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
        const flatIdx = currentFlatList.findIndex((r) => r.type === 'option' && r.idx === idx);

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
    let currentFlatList: ReturnType<typeof buildFlatList> = [];
    // Cached raw DOM refs — set once when setupVirtualizer runs so renderVirtualItems
    // never reads from reactive signal refs (which would re-subscribe the calling effect).
    let containerEl: HTMLDivElement | null = null;

    function renderVirtualItems(virtualItems: VirtualItem[]) {
      if (!containerEl) return;

      containerEl.innerHTML = '';

      for (const item of virtualItems) {
        const row = currentFlatList[item.index];

        if (!row) continue;

        if (row.type === 'group') {
          const groupHeader = document.createElement('div');

          groupHeader.className = 'optgroup-label';
          groupHeader.setAttribute('role', 'presentation');
          groupHeader.textContent = row.label;
          groupHeader.style.cssText = `position:absolute;top:0;left:0;right:0;transform:translateY(${item.top}px);`;
          containerEl.appendChild(groupHeader);
        } else {
          const { idx, opt } = row;

          const optionEl = document.createElement('div');

          optionEl.className = 'option';
          optionEl.setAttribute('role', 'option');
          optionEl.id = `${selectId}-opt-${idx}`;
          optionEl.setAttribute('aria-selected', String(selectedValues.peek().includes(opt.value)));
          optionEl.setAttribute('aria-disabled', String(opt.disabled));
          optionEl.style.cssText = `position:absolute;top:0;left:0;right:0;transform:translateY(${item.top}px);`;

          if (focusedIndex.peek() === idx) optionEl.setAttribute('data-focused', '');

          if (selectedValues.peek().includes(opt.value)) optionEl.setAttribute('data-selected', '');

          if (opt.disabled) optionEl.setAttribute('data-disabled', '');

          const label = document.createElement('span');

          label.textContent = opt.label;
          optionEl.appendChild(label);

          const check = document.createElement('span');

          check.className = 'option-check';
          check.setAttribute('aria-hidden', 'true');
          check.innerHTML = checkIconHTML;
          optionEl.appendChild(check);

          optionEl.addEventListener('click', (e: MouseEvent) => {
            e.stopPropagation();
            selectOption(opt, e);
          });
          optionEl.addEventListener('mouseenter', () => {
            focusedIndex.value = idx;
            // Update focused styling in-place without a full re-render.
            for (const el of containerEl!.querySelectorAll<HTMLElement>('[data-focused]')) {
              el.removeAttribute('data-focused');
            }
            optionEl.setAttribute('data-focused', '');
          });
          containerEl.appendChild(optionEl);
        }
      }
    }

    // Refreshes only the selected/focused data-attributes on already-rendered
    // items without clearing the DOM. Called when selection changes while the
    // dropdown is open (e.g. programmatic value update).
    function updateRenderedItemState() {
      if (!containerEl) return;

      const focused = focusedIndex.peek();
      const selected = selectedValues.peek();

      for (const el of containerEl.querySelectorAll<HTMLElement>('.option')) {
        const idx = Number(el.id.replace(`${selectId}-opt-`, ''));

        const row = currentFlatList[idx];
        const isSelected = row?.type === 'option' && selected.includes(row.opt.value);

        el.toggleAttribute('data-focused', idx === focused);
        el.toggleAttribute('data-selected', isSelected);
        el.setAttribute('aria-selected', String(isSelected));
      }
    }

    function setupVirtualizer() {
      virtualizer?.destroy();

      const scrollEl = dropdownEl;

      containerEl = dropdownContentRef.value ?? null;

      if (!scrollEl || !containerEl) return;

      currentFlatList = buildFlatList(options.value);

      virtualizer = createVirtualizer(scrollEl, {
        count: currentFlatList.length,
        estimateSize: (i) => (currentFlatList[i]?.type === 'group' ? 28 : 36),
        onChange: (virtualItems) => renderVirtualItems(virtualItems),
        overscan: 4,
      });

      // Set the spacer height once — it equals the total height of all items and
      // never changes during scrolling. Setting it inside onChange (every scroll)
      // would trigger the virtualizer's own ResizeObserver and cause a render loop.
      if (dropdownSpacerRef.value) {
        dropdownSpacerRef.value.style.height = `${virtualizer.getTotalSize()}px`;
        // Prevent the flex container from shrinking this spacer below its declared
        // height, and stop item transforms from leaking into the dropdown's
        // scrollable overflow area (which would cause the scrollbar thumb to resize
        // as different items are rendered during scroll).
        dropdownSpacerRef.value.style.flexShrink = '0';
        dropdownSpacerRef.value.style.contain = 'layout';
      }
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
              chip.setAttribute('aria-label', optLabel);
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

        // Update focused/selected state on already-rendered items without touching
        // the DOM structure. The virtualizer owns full re-renders via onChange.
        updateRenderedItemState();

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
              ${chevronDownIcon}
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
