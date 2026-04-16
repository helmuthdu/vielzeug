import {
  computed,
  createCleanupSignal,
  define,
  effect,
  html,
  inject,
  onMount,
  signal,
  untrack,
  watch,
} from '@vielzeug/craftit';
import {
  createFieldControl,
  createPopupListControl,
  createPressControl,
  type OverlayCloseReason,
  type OverlayOpenReason,
} from '@vielzeug/craftit/controls';

import type { AddEventListeners } from '../../types';
import type { PropBundle } from '../shared/bundles';
import type { ComboboxOptionInput, ComboboxOptionItem, ComboboxSelectionItem } from './combobox.types';

import { disabledLoadingMixin, forcedColorsFocusMixin, formFieldMixins, sizeVariantMixin } from '../../styles';
import { createDropdownPositioner, mountFormContextSync } from '../shared/dom-sync';
import { FORM_CTX } from '../shared/form-context';
import { createChoiceChangeDetail } from '../shared/utils';
import { parseSlottedOptions, backfillSelectionLabels } from './combobox-options';
import { createComboboxVirtualizer } from './combobox-virtualizer';
import '../../feedback/chip/chip';
import componentStyles from './combobox.css?inline';

const FIELD_SIZE_PRESET = {
  lg: { height: '48px' },
  md: { height: '40px' },
  sm: { height: '32px' },
};

const getCreatableLabel = (query: string, creatable: boolean, filteredOptions: any[]) => {
  if (!creatable || !query.trim()) return '';

  const exists = filteredOptions.some((o) => o.label.toLowerCase() === query.toLowerCase().trim());

  return exists ? '' : `Create "${query}"`;
};

const makeCreatableValue = (query: string) => `__new__:${query}`;

const filterOptions = (options: ComboboxOptionItem[], query: string, noFilter: boolean) => {
  if (noFilter) return options;

  const q = query.toLowerCase().trim();

  if (!q) return options;

  return options.filter((o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q));
};

const checkIconHTML = html`<svg
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round">
  <polyline points="20 6 9 17 4 12"></polyline>
</svg>`.toString();

export type BitComboboxEvents = {
  change: { labels: string[]; originalEvent?: Event; value: string | string[]; values: string[] };
  close: { reason: OverlayCloseReason };
  open: { reason: OverlayOpenReason };
  search: { query: string };
};

export type BitComboboxProps = {
  color?: string;
  creatable?: boolean;
  disabled?: boolean;
  error?: string;
  helper?: string;
  label?: string;
  'label-placement'?: 'outside' | 'inset' | 'hidden';
  loading?: boolean;
  multiple?: boolean;
  name?: string;
  'no-filter'?: boolean;
  options?: ComboboxOptionInput[];
  placeholder?: string;
  size?: 'sm' | 'md' | 'lg';
  value?: string | string[];
  variant?: string;
};

const comboboxProps: PropBundle<BitComboboxProps> = {
  color: undefined,
  creatable: false,
  disabled: false,
  error: undefined,
  helper: undefined,
  label: undefined,
  'label-placement': 'outside',
  loading: false,
  multiple: false,
  name: undefined,
  'no-filter': false,
  options: undefined,
  placeholder: 'Select...',
  size: undefined,
  value: undefined,
  variant: undefined,
};

/**
 * A search-enhanced select component with support for multiple selection, custom creation,
 * and virtualized lists for large datasets.
 *
 * @element bit-combobox
 *
 * @attr {string} value - Selected value(s). Use comma-separated for multiple.
 * @attr {boolean} multiple - Enable multiple selection
 * @attr {boolean} creatable - Allow users to create custom options from search query
 * @attr {boolean} no-filter - Disable client-side filtering (useful for server-side search)
 * @attr {string} placeholder - Placeholder text
 *
 * @fires {CustomEvent} change - Emitted when selection changes. detail: { value: string | string[], values: string[], labels: string[] }
 * @fires {CustomEvent} search - Emitted when user types. detail: { query: string }
 *
 * @example
 * ```html
 * <bit-combobox label="Country" name="country">
 *   <bit-combobox-option value="us">United States</bit-combobox-option>
 *   <bit-combobox-option value="gb">United Kingdom</bit-combobox-option>
 *   <bit-combobox-option value="de" disabled>Germany</bit-combobox-option>
 * </bit-combobox>
 * ```
 */
export const COMBOBOX_TAG = define<BitComboboxProps, BitComboboxEvents>('bit-combobox', {
  formAssociated: true,
  props: comboboxProps,
  setup({ emit, host, props, slots }) {
    const formCtx = inject(FORM_CTX, undefined);
    const isOpen = signal(false);
    const query = signal('');

    const choice = createFieldControl({
      kind: 'choice',
      options: {
        context: formCtx,
        disabled: props.disabled,
        error: props.error,
        getValue: (item: ComboboxSelectionItem) => item.value,
        helper: props.helper,
        label: props.label,
        labelPlacement: props['label-placement'] as any,
        mapControlledValue: (value: string) => ({ label: '', value }),
        multiple: props.multiple,
        name: props.name,
        onReset: () => {
          query.value = '';
        },
        prefix: 'combobox',
        value: props.value as any,
      },
    });
    const {
      disabled: isDisabled,
      fieldId: comboId,
      helperId,
      labelInsetId,
      labelInsetRef,
      labelOutsideId,
      labelOutsideRef,
      selectedItems: selectedValues,
      triggerValidation,
    } = choice;

    mountFormContextSync(host.el, formCtx, props);

    // ── State ────────────────────────────────────────────────────────────────
    const isMultiple = () => Boolean(props.multiple.value);
    const isCreatable = () => Boolean(props.creatable.value);
    const isNoFilter = () => Boolean(props['no-filter'].value);

    host.bind({
      attr: {
        open: () => (isOpen.value ? true : undefined),
      },
      prop: {
        value: {
          get: () => (isMultiple() ? selectedValues.value : selectedValue.value),
          set: (val: any) => choice.selectItem(val),
        },
      },
    });

    const focusedIndex = signal(-1);
    let lastQueryBeforeClear: string | null = null;
    let isRestoringQuery = false;

    // Convenience getter for single-select
    const selectedValue = computed(() => selectedValues.value[0]?.value ?? '');
    const hasValue = () => selectedValues.value.length > 0;
    const hasLabel = () => !!props.label.value;
    let inputEl: HTMLInputElement | null = null;
    let fieldEl: HTMLElement | null = null;
    let dropdownEl: HTMLElement | null = null;
    let listboxEl: HTMLElement | null = null;
    const inputAriaBinding = createCleanupSignal();

    function getLiveInput(): HTMLInputElement | null {
      const liveInput = host.shadowRoot?.querySelector<HTMLInputElement>('input[role="combobox"]') ?? null;

      if (liveInput) inputEl = liveInput;

      return liveInput ?? inputEl;
    }

    function focusLiveInput() {
      getLiveInput()?.focus();
    }

    // ── Options ──────────────────────────────────────────────────────────────
    const slottedOptions = signal<ComboboxOptionItem[]>([]);
    const createdOptions = signal<ComboboxOptionItem[]>([]);
    const isLoading = () => Boolean(props.loading.value);

    function normalizeOption(option: ComboboxOptionInput): ComboboxOptionItem {
      return {
        disabled: Boolean(option.disabled),
        iconEl: option.iconEl ?? null,
        label: option.label ?? option.value,
        value: option.value,
      };
    }

    // Merged options: explicit prop value overrides slotted options.
    const allOptions = computed<ComboboxOptionItem[]>(() => {
      const optionsProp = props.options.value;
      const base = Array.isArray(optionsProp) ? optionsProp.map(normalizeOption) : slottedOptions.value;

      if (createdOptions.value.length === 0) return base;

      return [...base, ...createdOptions.value];
    });

    const allItemsSignal = computed<ComboboxSelectionItem[]>(() =>
      allOptions.value.map((option) => ({ label: option.label, value: option.value })),
    );

    const selectionController = {
      clear: () => {
        choice.clear();
      },
      remove: (key: string) => {
        choice.removeValue(key);
      },
      select: (key: string) => {
        const item = allItemsSignal.value.find((entry) => entry.value === key);

        if (!item) return;

        choice.selectItem(item);
      },
      toggle: (key: string) => {
        const item = allItemsSignal.value.find((entry) => entry.value === key);

        if (!item) return;

        choice.toggleItem(item);
      },
    };

    function readOptions(elements: Element[] = Array.from(host.el.children)) {
      slottedOptions.value = parseSlottedOptions(elements);

      // Backfill labels for any already-selected values that were set before options loaded
      if (selectedValues.value.length > 0) {
        selectedValues.value = backfillSelectionLabels(selectedValues.value, allOptions.value);

        // Also sync the query in single mode
        if (!isMultiple() && selectedValues.value.length === 1) {
          query.value = selectedValues.value[0]?.label ?? '';
        }
      }
    }

    const filteredOptions = computed<ComboboxOptionItem[]>(() => {
      return filterOptions(allOptions.value, query.value, isNoFilter());
    });
    // "Create" option shown when creatable + query doesn't match any existing option
    const creatableLabel = computed(() => {
      return getCreatableLabel(query.value, isCreatable(), filteredOptions.value);
    });
    const assistiveText = choice.assistive;
    const inputPlaceholder = () =>
      isMultiple() && selectedValues.value.length > 0 ? '' : props.placeholder.value || '';

    const selectedValueItems = computed(() => (selectedValues.value as any[]).map((s) => s.value));
    const selectedLabelItems = computed(() =>
      (selectedValues.value as any[]).map((selection) => {
        if (selection.label) return selection.label;

        return allOptions.value.find((option) => option.value === selection.value)?.label ?? selection.value;
      }),
    );

    function emitChange(originalEvent?: Event) {
      emit('change', createChoiceChangeDetail(selectedValueItems.value, selectedLabelItems.value, originalEvent));
    }

    function removeChip(event: Event): void {
      event.stopPropagation();

      const value = (event as CustomEvent<{ value?: string }>).detail?.value;

      if (value === undefined) return;

      selectionController.remove(value);
      emitChange(event);
      triggerValidation('change');
    }

    // ── Positioning (shared positioner) ──────────────────────────────────────
    const positioner = createDropdownPositioner(
      () => fieldEl,
      () => dropdownEl,
    );

    const popupList = createPopupListControl({
      ariaSync: { role: 'listbox' },
      getBoundaryElement: () => host.el,
      getIndex: () => focusedIndex.value,
      getItems: () => filteredOptions.value,
      getPanelElement: () => dropdownEl,
      getTriggerElement: () => inputEl,
      isDisabled: () => isDisabled.value,
      isItemDisabled: (option) => option.disabled,
      isOpen: () => isOpen.value,
      listId: `${comboId}-listbox`,
      onClose: (reason) => {
        emit('close', { reason });
        restoreQueryFromSelection();
        triggerValidation('blur');
      },
      onOpen: (reason) => emit('open', { reason }),
      positioner: {
        floating: () => dropdownEl,
        reference: () => fieldEl,
        update: () => positioner.updatePosition(),
      },
      restoreFocus: false,
      setIndex: (index: number) => {
        focusedIndex.value = index;
        scrollFocusedIntoView();
      },
      setOpen: (next) => {
        isOpen.value = next;
      },
    });

    function restoreQueryFromSelection() {
      // Keep input text and selected value in sync whenever the popup closes.
      if (!isMultiple()) {
        const match = allOptions.value.find((option) => option.value === selectedValue.value);

        isRestoringQuery = true;
        query.value = match?.label ?? '';
        Promise.resolve().then(() => {
          isRestoringQuery = false;
        });

        return;
      }

      query.value = '';
    }

    // ── Open / Close ─────────────────────────────────────────────────────────
    function openPopup(clearFilter = true, reason: OverlayOpenReason = 'programmatic') {
      if (clearFilter) {
        lastQueryBeforeClear = query.value;
        query.value = '';
      }

      popupList.open(reason);
    }

    function closePopup(reason: OverlayCloseReason = 'programmatic') {
      popupList.close(reason);
    }

    const fieldPress = createPressControl({
      disabled: () => isDisabled.value,
      onPress: () => {
        if (!isOpen.value) openPopup(true, 'trigger');

        focusLiveInput();
      },
    });

    const enterPress = createPressControl({
      disabled: () => isDisabled.value,
      keys: ['Enter'],
      onPress: (originalEvent: any) => {
        const opts = filteredOptions.value;

        if (isOpen.value && focusedIndex.value >= 0 && focusedIndex.value < opts.length) {
          selectOption(opts[focusedIndex.value], originalEvent);
        } else if (isOpen.value && focusedIndex.value === -1 && creatableLabel.value) {
          // Focused on the "create" item
          createOption(creatableLabel.value, originalEvent);
        } else if (!isOpen.value) {
          openPopup(true, 'trigger');
        }
      },
    });

    // ── Selection ────────────────────────────────────────────────────────────
    function selectOption(opt: ComboboxOptionItem, originalEvent?: Event) {
      if (opt.disabled) return;

      if (isMultiple()) {
        selectionController.toggle(opt.value);
        query.value = '';
        emitChange(originalEvent);
        triggerValidation('change');
        // Keep dropdown open in multiple mode
        focusLiveInput();
        requestAnimationFrame(() => focusLiveInput());
      } else {
        selectionController.select(opt.value);
        query.value = opt.label;
        emitChange(originalEvent);
        triggerValidation('change');
        closePopup();
        focusLiveInput();
      }
    }
    function clearValue(e: Event) {
      e.stopPropagation();
      selectionController.clear();
      query.value = '';
      emitChange(e);
      triggerValidation('change');
      focusLiveInput();
    }
    function handleInput(e: any) {
      const target = e.target as HTMLInputElement;
      const newValue = target.value;

      // Skip all input processing if we're in the middle of restoring the query
      // This prevents the clearing logic from firing during close/restore
      if (isRestoringQuery) {
        return;
      }

      if (newValue === query.value) return;

      const previousQuery = query.value;

      query.value = newValue;

      if (!isMultiple()) {
        const currentItem = selectedValues.value[0] as any;
        const currentLabel = currentItem
          ? (allOptions.value.find((o) => o.value === currentItem.value)?.label ?? currentItem.label)
          : '';

        // Only clear selection if user actively typed something different from the current label.
        // Don't clear if:
        // 1. We just opened and cleared the query (newValue is empty, and we were showing the label before)
        const isJustOpening = newValue === '' && lastQueryBeforeClear === currentLabel;

        if (!isJustOpening && newValue !== currentLabel && previousQuery !== '') {
          selectionController.clear();
        }

        // Only clear the flag after we've processed the current input event
        if (isJustOpening) {
          lastQueryBeforeClear = null;
        }
      }

      popupList.first();

      if (!isOpen.value) openPopup(false, 'trigger');

      emit('search', { query: target.value });
    }
    function handleFocus() {
      if (!isOpen.value) openPopup(true, 'trigger');
    }
    // ── Keyboard Navigation ──────────────────────────────────────────────────
    function handleKeydown(e: KeyboardEvent) {
      if (isDisabled.value) return;

      if (popupList.handleListKeydown(e)) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();

          if (!isOpen.value) {
            openPopup(true, 'trigger');
            popupList.first();
          } else {
            popupList.next();
          }

          break;
        case 'ArrowUp':
          e.preventDefault();

          if (!isOpen.value) {
            openPopup(true, 'trigger');
          } else {
            popupList.prev();
          }

          break;
        case 'Backspace':
          // In multiple mode, remove the last chip when the input is empty
          if (isMultiple() && !query.value && selectedValues.value.length > 0) {
            selectedValues.value = selectedValues.value.slice(0, -1);
            emitChange(e);
            triggerValidation('change');
          }

          break;
        case 'Enter':
          enterPress.handleKeydown(e);

          break;
        case 'Escape':
          e.preventDefault();

          if (isOpen.value) {
            closePopup('escape');
          }

          break;
        case 'Tab':
          closePopup('programmatic');
          break;
        default:
          break;
      }
    }
    function scrollFocusedIntoView() {
      if (focusedIndex.value >= 0) {
        domVirtualList.scrollToIndex(focusedIndex.value, { align: 'auto' });

        return;
      }

      if (!listboxEl) return;

      const focusedEl = listboxEl.querySelector<HTMLElement>('[data-focused]');

      focusedEl?.scrollIntoView({ block: 'nearest' });
    }

    // ── Virtualizer ──────────────────────────────────────────────────────────
    const { domVirtualList, setupVirtualizer, updateRenderedItemState } = createComboboxVirtualizer({
      checkIconHTML,
      comboId,
      getDropdownElement: () => dropdownEl,
      getFocusedIndex: () => untrack(() => focusedIndex.value),
      getIsMultiple: () => untrack(() => isMultiple()),
      getListboxElement: () => listboxEl,
      getSelectedValue: () => untrack(() => selectedValue.value),
      getSelectedValues: () => untrack(() => selectedValues.value),
      onSelectOption: selectOption,
      setFocusedIndex: (index: number) => {
        focusedIndex.value = index;
      },
    });

    // ── Create option ────────────────────────────────────────────────────────
    function createOption(label: string, originalEvent?: Event) {
      const actualLabel = label.startsWith('Create "') && label.endsWith('"') ? label.slice(8, -1) : label;
      const value = makeCreatableValue(actualLabel);
      const newOpt: ComboboxOptionItem = { disabled: false, iconEl: null, label: actualLabel, value };

      createdOptions.value = [...createdOptions.value, newOpt];
      selectOption(newOpt, originalEvent);
    }
    // ── Lifecycle ────────────────────────────────────────────────────────────
    onMount(() => {
      fieldEl = inputEl?.closest('.field') as HTMLElement | null;
      dropdownEl = host.shadowRoot?.querySelector<HTMLElement>('.dropdown') ?? null;
      listboxEl = host.shadowRoot?.querySelector<HTMLElement>('[role="listbox"]') ?? null;

      // Now update the open/close calls to use object options
      const removeOutsideClick = popupList.bindOutsideClick(document);

      watch(slots.elements(), () => readOptions(), { immediate: true });
      // Rebuild virtualizer when filtered options or open state changes
      effect(() => {
        const opts = filteredOptions.value;
        const open = isOpen.value;

        if (open && opts.length > 0) {
          requestAnimationFrame(() => setupVirtualizer(opts, open));
        } else {
          domVirtualList.setItems(opts);
        }
      });
      effect(() => {
        if (!listboxEl) return;

        const open = isOpen.value;

        // Remove existing state nodes
        for (const el of Array.from(listboxEl.querySelectorAll('.no-results,.no-results-create,.dropdown-loading')))
          el.remove();

        if (!open) {
          updateRenderedItemState();

          return;
        }

        if (isLoading()) {
          const loadingEl = document.createElement('div');

          loadingEl.className = 'dropdown-loading';
          loadingEl.textContent = 'Loading\u2026';
          listboxEl.prepend(loadingEl);
        } else if (filteredOptions.value.length === 0) {
          if (creatableLabel.value) {
            const createEl = document.createElement('button');

            createEl.type = 'button';
            createEl.className = 'no-results-create';
            createEl.textContent = creatableLabel.value;

            // Apply focused state when keyboard nav lands here (focusedIndex === -1 means create row)
            createEl.toggleAttribute('data-focused', focusedIndex.value === -1);

            createEl.addEventListener('pointerdown', (e: PointerEvent) => {
              e.preventDefault();
            });

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
      });

      // Keep rendered option selected/focused attributes in sync while the popup stays open.
      const renderedStateDeps = computed(
        () =>
          `${isOpen.value ? '1' : '0'}|${props.multiple.value ? '1' : '0'}|${focusedIndex.value}|${selectedValue.value}|${selectedValues.value
            .map((item: any) => item.value)
            .join(',')}`,
      );

      watch(
        renderedStateDeps,
        () => {
          if (!isOpen.value) return;

          updateRenderedItemState();
        },
        { immediate: true },
      );

      return () => {
        domVirtualList.destroy();
        positioner.destroy();
        removeOutsideClick();
      };
    });

    return html`
      <slot></slot>
      <div class="combobox-wrapper" part="wrapper">
        <label
          class="label-outside"
          for="${comboId}"
          id="${labelOutsideId}"
          ref=${labelOutsideRef}
          hidden
          part="label"></label>
        <div
          class="field"
          part="field"
          @click="${(e: MouseEvent) => {
            fieldPress.handleClick(e);
          }}">
          <label
            class="label-inset"
            for="${comboId}"
            id="${labelInsetId}"
            ref=${labelInsetRef}
            hidden
            part="label"></label>
          <div class="field-row">
            <div class="chips-row">
              <!-- Keep chip list diffing isolated so input node identity stays stable. -->
              <span class="chips-list">
                ${() =>
                  (isMultiple() ? selectedValues.value : []).map(
                    (item: any) => html`
                      <bit-chip
                        value=${item.value}
                        label=${item.label || item.value}
                        mode="removable"
                        variant="flat"
                        size="sm"
                        color="${props.color}"
                        @remove=${removeChip}>
                        ${item.label || item.value}
                      </bit-chip>
                    `,
                  )}
              </span>
              <input
                ref=${(el: HTMLInputElement | null) => {
                  inputEl = el;

                  if (!el) {
                    fieldEl = null;
                    inputAriaBinding.clear();

                    return;
                  }

                  fieldEl = el.closest('.field') as HTMLElement | null;
                  inputAriaBinding.set(
                    popupList.syncTriggerAria(el, {
                      additional: {
                        autocomplete: 'list',
                        describedby: () => (props.error.value || props.helper.value ? helperId : null),
                        invalid: () => !!props.error.value,
                        labelledby: () => (hasLabel() ? `${labelOutsideId} ${labelInsetId}` : null),
                      },
                    }),
                  );
                }}
                class="input"
                part="input"
                type="text"
                role="combobox"
                autocomplete="off"
                spellcheck="false"
                id="${comboId}"
                name="${props.name}"
                placeholder="${inputPlaceholder}"
                :disabled="${isDisabled}"
                @input=${handleInput}
                @keydown=${handleKeydown}
                @focus=${handleFocus}
                .value=${query} />
            </div>
            <button
              class="clear-btn"
              part="clear-btn"
              type="button"
              aria-label="Clear"
              tabindex="-1"
              ?hidden=${() => !hasValue()}
              @click="${clearValue}">
              <bit-icon name="x" size="12" stroke-width="2.5" aria-hidden="true"></bit-icon>
            </button>
            <span class="chevron" aria-hidden="true">
              <bit-icon name="chevron-down" size="14" stroke-width="2" aria-hidden="true"></bit-icon>
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
          style="${() => (assistiveText.value.isError ? 'color: var(--color-error);' : '')}"
          >${() => assistiveText.value.text}</span
        >
      </div>
    `;
  },
  shadow: { delegatesFocus: true },
  styles: [
    sizeVariantMixin(FIELD_SIZE_PRESET),
    ...formFieldMixins,
    disabledLoadingMixin(),
    forcedColorsFocusMixin('.input'),
    componentStyles,
  ],
}) as unknown as AddEventListeners<BitComboboxEvents>;
