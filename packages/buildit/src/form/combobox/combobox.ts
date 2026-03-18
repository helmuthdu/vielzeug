import {
  aria,
  computed,
  createFormIds,
  css,
  define,
  defineField,
  effect,
  html,
  useInject,
  onMount,
  onSlotChange,
  ref,
  signal,
  watch,
  defineProps,
  defineEmits,
} from '@vielzeug/craftit';
import { each } from '@vielzeug/craftit/directives';
import { autoUpdate, flip, positionFloat, shift, size } from '@vielzeug/floatit';
import { createVirtualizer, type VirtualItem } from '@vielzeug/virtualit';

import type {
  AddEventListeners,
  DisablableProps,
  RoundedSize,
  SizableProps,
  ThemableProps,
  VisualVariant,
} from '../../types';

import '../../feedback/chip/chip';
import { checkIconHTML, chevronDownIcon, clearIcon } from '../../icons';
import { disabledLoadingMixin, forcedColorsFocusMixin, formFieldMixins, sizeVariantMixin } from '../../styles';
import {
  mountFormContextSync,
  mountLabelSyncStandalone,
  resolveMergedAssistiveText,
  stringifyCsvValues,
  triggerValidationOnEvent,
} from '../../utils/use-text-field';
import { FORM_CTX } from '../form/form';
import {
  computeControlledCsvState,
  mapControlledValues,
  mapItemValues,
  removeItemByValue,
  toggleItemByValue,
} from '../shared/form-utils';

// ============================================
// Types
// ============================================

export type BitComboboxEvents = {
  change: { label: string; originalEvent?: Event; value: string; values: string[] };
  search: { query: string };
};

export type BitComboboxProps = ThemableProps &
  SizableProps &
  DisablableProps & {
    clearable?: boolean;
    /** Allow typing a new value to create a new option */
    creatable?: boolean;
    error?: string;
    fullwidth?: boolean;
    helper?: string;
    label?: string;
    'label-placement'?: 'inset' | 'outside';
    /** Show loading state in the dropdown */
    loading?: boolean;
    multiple?: boolean;
    name?: string;
    'no-filter'?: boolean;
    placeholder?: string;
    rounded?: RoundedSize | '';
    value?: string;
    variant?: Exclude<VisualVariant, 'glass' | 'text' | 'frost'>;
  };

// ============================================
// Styles
// ============================================

import componentStyles from './combobox.css?inline';

// ============================================
// ComboboxOption Component
// ============================================

export type BitComboboxOptionProps = {
  disabled?: boolean;
  /** Explicit label text; falls back to the element's text content. */
  label?: string;
  value?: string;
};

/**
 * `bit-combobox-option` — A child element of `<bit-combobox>` that represents one option.
 *
 * @slot         - Label text for the option.
 * @slot icon    - Optional leading icon or decoration.
 */
export const COMBOBOX_OPTION_TAG = define(
  'bit-combobox-option',
  () => {
    const optionStyles = /* css */ css`
      @layer buildit.base {
        :host {
          display: none;
        }
      }
    `;

    return html`<style>
      ${optionStyles}
    </style>`;
  },
  {},
);

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
export const COMBOBOX_TAG = define(
  'bit-combobox',
  ({ host }) => {
    const props = defineProps<BitComboboxProps>({
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
    const emit = defineEmits<BitComboboxEvents>();

    const { fieldId: comboId, helperId, labelId } = createFormIds('combobox', props.name.value);
    // Label refs
    const labelOutsideRef = ref<HTMLLabelElement>();
    const labelInsetRef = ref<HTMLLabelElement>();
    const formCtx = useInject(FORM_CTX, undefined);
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
      triggerValidationOnEvent(formCtx, fd, on);
    }

    // ── State ────────────────────────────────────────────────────────────────
    const isOpen = signal(false);
    const query = signal('');
    // Multi-value state: always an array; single mode uses at most one entry
    const selectedValues = signal<
      {
        label: string;
        value: string;
      }[]
    >(props.value.value ? [{ label: '', value: props.value.value }] : []);
    const focusedIndex = signal(-1);

    // Sync external value prop changes to selectedValues (controlled mode)
    watch(
      props.value,
      (newValue) => {
        const state = computeControlledCsvState((newValue as string | undefined) ?? '');

        if (state.isEmpty) {
          selectedValues.value = [];
          query.value = '';
          formValue.value = '';
        } else if (props.multiple.value) {
          selectedValues.value = mapControlledValues(state.values, (value) => ({ label: '', value }));
          formValue.value = state.formValue;
        } else {
          // Single mode: one value
          selectedValues.value = [{ label: '', value: state.firstValue }];
          formValue.value = state.firstValue;
        }
      },
      { immediate: true },
    );

    // Convenience getter for single-select
    const selectedValue = computed(() => selectedValues.value[0]?.value ?? '');
    const hasValue = computed(() => selectedValues.value.length > 0);
    const hasLabel = computed(() => !!props.label.value);
    let inputEl: HTMLInputElement | null = null;
    let fieldEl: HTMLElement | null = null;
    let dropdownEl: HTMLElement | null = null;
    let listboxEl: HTMLElement | null = null;
    let autoUpdateCleanup: (() => void) | null = null;

    // ── Options ──────────────────────────────────────────────────────────────
    type ComboboxOptionItem = {
      disabled: boolean;
      iconEl: Element | null;
      label: string;
      value: string;
    };

    const slottedOptions = signal<ComboboxOptionItem[]>([]);
    const jsPropOptions = signal<ComboboxOptionItem[] | null>(null);
    const isLoading = computed(() => Boolean(props.loading.value));
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
    function readOptions(elements: Element[] = Array.from(host.children)) {
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
    const assistiveText = computed(() => resolveMergedAssistiveText(props.error.value, props.helper.value));
    const inputPlaceholder = computed(() =>
      props.multiple.value && selectedValues.value.length > 0 ? '' : props.placeholder.value || '',
    );

    function removeChip(event: Event): void {
      event.stopPropagation();

      const value = (event as CustomEvent<{ value?: string }>).detail?.value;

      if (value === undefined) return;

      selectedValues.value = removeItemByValue(selectedValues.value, value);
      formValue.value = stringifyCsvValues(mapItemValues(selectedValues.value));
      emit('change', {
        label: '',
        value: formValue.value,
        values: mapItemValues(selectedValues.value),
      });
      triggerValidation('change');
    }

    // ── Positioning ──────────────────────────────────────────────────────────
    function updateDropdownPosition() {
      if (!dropdownEl || !fieldEl) return;

      const referenceWidth = fieldEl.getBoundingClientRect().width;

      positionFloat(fieldEl, dropdownEl, {
        middleware: [
          flip({ padding: 6 }),
          shift({ padding: 6 }),
          size({
            apply({
              elements,
            }: {
              elements: {
                floating: HTMLElement;
              };
            }) {
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

      if (fieldEl && dropdownEl) {
        autoUpdateCleanup?.();
        autoUpdateCleanup = autoUpdate(fieldEl, dropdownEl, updateDropdownPosition, { observeFloating: false });
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
        selectedValues.value = toggleItemByValue(selectedValues.value, { label: opt.label, value: opt.value });
        formValue.value = stringifyCsvValues(mapItemValues(selectedValues.value));
        query.value = '';
        emit('change', {
          label: opt.label,
          originalEvent,
          value: formValue.value,
          values: mapItemValues(selectedValues.value),
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
    function handleKeydown(e: KeyboardEvent) {
      if (props.disabled.value) return;

      const opts = filteredOptions.value;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();

          if (!isOpen.value) {
            open();

            let first = 0;

            while (first < opts.length && opts[first].disabled) first++;

            if (first < opts.length) {
              focusedIndex.value = first;
              scrollFocusedIntoView();
            }
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
        case 'Backspace':
          // In multiple mode, remove the last chip when the input is empty
          if (props.multiple.value && !query.value && selectedValues.value.length > 0) {
            selectedValues.value = selectedValues.value.slice(0, -1);
            formValue.value = stringifyCsvValues(mapItemValues(selectedValues.value));
            emit('change', {
              label: '',
              value: formValue.value,
              values: mapItemValues(selectedValues.value),
            });
            triggerValidation('change');
          }

          break;
        case 'End':
          if (isOpen.value) {
            e.preventDefault();
            focusedIndex.value = opts.length - 1;
            scrollFocusedIntoView();
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
        case 'Tab':
          close();
          break;
        default:
          // Fallback for environments where synthetic typing doesn't dispatch input reliably.
          if (e.key.length === 1 || e.key === 'Backspace' || e.key === 'Delete') {
            queueMicrotask(() => {
              if (!inputEl) return;

              query.value = inputEl.value;

              if (!props.multiple.value) selectedValues.value = [];

              focusedIndex.value = -1;

              if (!isOpen.value) open(false);

              emit('search', { query: inputEl.value } as {
                query: string;
              });
            });
          }

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
    let currentOpts: typeof filteredOptions.value = [];
    // Cached raw DOM ref — set once in setupVirtualizer so renderVirtualItems
    // never reads from signal refs (which would make the calling effect re-subscribe).
    let listboxElCached: HTMLElement | null = null;

    // Standalone render function — called only from the virtualizer's onChange
    // (scroll-driven). Signal reads use .peek() so this function is never tracked
    // by any reactive effect, preventing the "hover → full re-render" loop.
    function renderVirtualItems(virtualItems: VirtualItem[]) {
      if (!listboxElCached) return;

      // Clear only virtual-rendered option items (keep loading / no-results state nodes)
      for (const el of Array.from(listboxElCached.querySelectorAll('.option'))) el.remove();

      const focused = focusedIndex.peek();

      for (const item of virtualItems) {
        const opt = currentOpts[item.index];

        if (!opt) continue;

        const isSelected = props.multiple.peek()
          ? selectedValues.peek().some((s) => s.value === opt.value)
          : opt.value === selectedValue.peek();
        const optionEl = document.createElement('div');

        optionEl.className = 'option';
        optionEl.setAttribute('role', 'option');
        optionEl.id = `${comboId}-opt-${item.index}`;
        optionEl.setAttribute('aria-selected', String(isSelected));
        optionEl.setAttribute('aria-disabled', String(!!opt.disabled));
        optionEl.style.cssText = `position:absolute;top:0;left:0;right:0;transform:translateY(${item.top}px);`;

        if (focused === item.index) optionEl.setAttribute('data-focused', '');

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
        check.innerHTML = checkIconHTML;
        optionEl.appendChild(check);
        optionEl.addEventListener('click', (e: MouseEvent) => {
          e.stopPropagation();
          selectOption(opt, e);
        });
        optionEl.addEventListener('mouseenter', () => {
          focusedIndex.value = item.index;
          // Update focused state in-place — no full re-render needed.
          for (const el of listboxElCached!.querySelectorAll<HTMLElement>('[data-focused]')) {
            el.removeAttribute('data-focused');
          }
          optionEl.setAttribute('data-focused', '');
        });
        listboxElCached.appendChild(optionEl);
      }
    }
    // Refreshes focused/selected data-attributes on already-rendered items without
    // clearing the DOM. Called from the reactive effect so signal changes (hover,
    // selection) update styling without triggering a full scroll re-render.
    function updateRenderedItemState() {
      if (!listboxElCached) return;

      const focused = focusedIndex.peek();
      const isMultiple = props.multiple.peek();

      for (const el of listboxElCached.querySelectorAll<HTMLElement>('.option')) {
        const idx = Number(el.id.replace(`${comboId}-opt-`, ''));
        const opt = currentOpts[idx];

        if (!opt) continue;

        const isSelected = isMultiple
          ? selectedValues.peek().some((s) => s.value === opt.value)
          : opt.value === selectedValue.peek();

        el.toggleAttribute('data-focused', idx === focused);
        el.toggleAttribute('data-selected', isSelected);
        el.setAttribute('aria-selected', String(isSelected));
      }
    }
    function setupVirtualizer() {
      virtualizer?.destroy();
      listboxElCached = listboxEl;

      if (!listboxElCached || !dropdownEl) return;

      currentOpts = filteredOptions.value;

      if (currentOpts.length === 0) {
        virtualizer = null;

        return;
      }

      virtualizer = createVirtualizer(dropdownEl, {
        count: currentOpts.length,
        estimateSize: () => 36,
        onChange: (virtualItems) => renderVirtualItems(virtualItems),
        overscan: 4,
      });
      // Set the listbox height once — it equals the total height of all items
      // and never changes during scrolling. Setting it inside onChange would
      // trigger the virtualizer's own ResizeObserver and cause a render loop.
      listboxElCached.style.height = `${virtualizer.getTotalSize()}px`;
      listboxElCached.style.position = 'relative';
      // Stop item transforms from leaking into the dropdown's scrollable overflow
      // area (which would cause the scrollbar thumb to resize during scroll).
      listboxElCached.style.contain = 'layout';
    }
    // ── Create option ────────────────────────────────────────────────────────
    function createOption(label: string, originalEvent?: Event) {
      const value = label.toLowerCase().replace(/\s+/g, '-');
      const newOpt: ComboboxOptionItem = { disabled: false, iconEl: null, label, value };

      // Add to JS options so it persists — use the reactive signal so allOptions recomputes
      jsPropOptions.value = [...allOptions.value, newOpt];
      selectOption(newOpt, originalEvent);
      emit('change', {
        label: newOpt.label,
        originalEvent,
        value: newOpt.value,
        values: [newOpt.value],
      });
    }
    // ── Lifecycle ────────────────────────────────────────────────────────────
    onMount(() => {
      inputEl = host.shadowRoot?.querySelector<HTMLInputElement>('.input') ?? null;
      fieldEl = inputEl?.closest('.field') as HTMLElement | null;
      dropdownEl = host.shadowRoot?.querySelector<HTMLElement>('.dropdown') ?? null;
      listboxEl = host.shadowRoot?.querySelector<HTMLElement>('[role="listbox"]') ?? null;

      let handleInput: ((e: Event) => void) | undefined;
      let handleFocus: (() => void) | undefined;

      if (inputEl) {
        handleInput = (e: Event) => {
          const target = e.target as HTMLInputElement;

          if (!props.multiple.value) selectedValues.value = [];

          focusedIndex.value = -1;

          if (!isOpen.value) open(false);

          emit('search', { query: target.value } as {
            query: string;
          });
        };
        handleFocus = () => {
          if (!isOpen.value) open();
        };
        inputEl.addEventListener('input', handleInput);
        inputEl.addEventListener('keydown', handleKeydown);
        inputEl.addEventListener('focus', handleFocus);
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
      // Ensure initial light-DOM options are available for immediate keyboard interaction.
      readOptions();
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
      mountLabelSyncStandalone(labelInsetRef, labelOutsideRef, props);
      effect(() => {
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

          // Update focused/selected state on already-rendered items without touching
          // the DOM structure. The virtualizer owns full re-renders via onChange.
          updateRenderedItemState();
        }
      });
      // Keep rendered option selected/focused attributes in sync while the popup stays open.
      watch(
        [isOpen, props.multiple, focusedIndex, selectedValues, selectedValue],
        () => {
          if (!isOpen.value) return;

          updateRenderedItemState();
        },
        { immediate: true },
      );
      // Propagate form context size/variant/disabled to host
      mountFormContextSync(host, formCtx, props);

      return () => {
        virtualizer?.destroy();
        autoUpdateCleanup?.();
        document.removeEventListener('click', handleDocClick, true);

        if (inputEl && handleInput && handleFocus) {
          inputEl.removeEventListener('input', handleInput);
          inputEl.removeEventListener('keydown', handleKeydown);
          inputEl.removeEventListener('focus', handleFocus);
        }
      };
    });

    // ── Template ──────────────────────────────────────────────────────────────
    return html`
      <slot></slot>
      <div class="combobox-wrapper" part="wrapper">
        <label
          class="label-outside"
          for="${comboId}"
          id="${labelId}"
          ref=${labelOutsideRef}
          hidden
          part="label"></label>
        <div
          class="field"
          part="field"
          @click="${() => {
            if (!isOpen.value) open();
          }}">
          <label class="label-inset" for="${comboId}" id="${labelId}" ref=${labelInsetRef} hidden part="label"></label>
          <div class="field-row">
            <div class="chips-row">
              ${each(
                () => (props.multiple.value ? selectedValues.value : []),
                (item) => html`
                  <bit-chip
                    value=${item.value}
                    aria-label=${item.label || item.value}
                    mode="removable"
                    variant="flat"
                    size="sm"
                    color=${() => props.color.value}
                    @remove=${removeChip}>
                    ${item.label || item.value}
                  </bit-chip>
                `,
              )}
              <input
                class="input"
                part="input"
                type="text"
                role="combobox"
                autocomplete="off"
                spellcheck="false"
                id="${comboId}"
                name="${() => props.name.value}"
                placeholder=${() => inputPlaceholder.value}
                :disabled="${() => props.disabled.value}"
                .value=${query} />
            </div>
            <button
              class="clear-btn"
              part="clear-btn"
              type="button"
              aria-label="Clear"
              tabindex="-1"
              ?hidden=${() => !hasValue.value}
              @click="${clearValue}">
              ${clearIcon}
            </button>
            <span class="chevron" aria-hidden="true">
              ${chevronDownIcon}
              <span class="loader" aria-label="Loading"></span>
            </span>
          </div>
        </div>

        <div class="dropdown" part="dropdown" id="${() => `${comboId}-dropdown`}" ?data-open=${() => isOpen.value}>
          <div
            role="listbox"
            id="${() => `${comboId}-listbox`}"
            aria-label="${() => props.label.value || props.placeholder.value || 'Options'}"></div>
        </div>

        <span
          class="helper-text"
          id="${helperId}"
          part="helper-text"
          aria-live="polite"
          ?hidden=${() => assistiveText.value.hidden}
          style=${() => (assistiveText.value.isError ? 'color: var(--color-error);' : '')}
          >${() => assistiveText.value.text}</span
        >
      </div>
    `;
  },
  {
    formAssociated: true,
    shadow: { delegatesFocus: true },
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
  },
) as unknown as AddEventListeners<BitComboboxEvents>;
