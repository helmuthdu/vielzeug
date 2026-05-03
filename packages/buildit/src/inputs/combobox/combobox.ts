import { computed, define, effect, html, inject, prop, signal, untrack, watch, onMounted } from '@vielzeug/craftit';
import {
  createChoiceField,
  createPopupListControl,
  createPressControl,
  type OverlayCloseReason,
  type OverlayOpenReason,
} from '@vielzeug/craftit/controls';

import type { AddEventListeners } from '../../types';
import type { BitComboboxEvents, BitComboboxProps, ComboboxOptionInput, ComboboxOptionItem } from './combobox.types';

import { disabledLoadingMixin, forcedColorsFocusMixin, formFieldMixins, sizeVariantMixin } from '../../styles';
import { FIELD_SIZE_PRESET } from '../shared/design-presets';
import { createDropdownPositioner, mountFormContextSync } from '../shared/dom-sync';
import { FORM_CTX } from '../shared/form-context';
import { createChoiceChangeDetail } from '../shared/utils';
import { filterOptions, getCreatableLabel, makeCreatableValue, parseSlottedOptions } from './combobox-options';
import { createComboboxVirtualizer } from './combobox-virtualizer';
import '../../feedback/chip/chip';
import componentStyles from './combobox.css?inline';

export type { BitComboboxEvents, BitComboboxProps } from './combobox.types';

const checkIconHTML = html`<svg
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round">
  <polyline points="20 6 9 17 4 12"></polyline>
</svg>`.toString();

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
  props: {
    color: undefined,
    creatable: false,
    disabled: false,
    error: undefined,
    fullwidth: false,
    helper: undefined,
    label: undefined,
    'label-placement': prop.oneOf(['inset', 'outside', 'hidden'] as const, 'inset'),
    loading: false,
    multiple: false,
    name: undefined,
    'no-filter': false,
    options: undefined,
    placeholder: 'Select...',
    rounded: undefined,
    size: undefined,
    value: undefined,
    variant: undefined,
  },
  setup(props, { emit, host, slots }) {
    const formCtx = inject(FORM_CTX);
    const isOpen = signal(false);
    const query = signal('');
    const triggerRef = { value: null as HTMLInputElement | null };

    const choice = createChoiceField({
      context: formCtx,
      disabled: props.disabled,
      error: props.error,
      helper: props.helper,
      multiple: props.multiple,
      name: props.name,
      prefix: 'combobox',
      value: props.value as any,
    });
    const {
      disabled: isDisabled,
      fieldId: comboId,
      helperId,
      labelInsetId,
      labelOutsideId,
      selectedValues,
      triggerValidation,
    } = choice;

    mountFormContextSync(host.el, formCtx, props);

    // ── State ────────────────────────────────────────────────────────────────
    const isMultiple = () => Boolean(props.multiple.value);
    const isCreatable = () => Boolean(props.creatable.value);
    const isNoFilter = () => Boolean(props['no-filter'].value);
    const hasLabel = () => !!props.label.value;
    const outsideLabelHidden = () => !props.label.value || props['label-placement'].value !== 'outside';
    const insetLabelHidden = () => !props.label.value || props['label-placement'].value !== 'inset';

    host.bind({
      attr: {
        open: () => (isOpen.value ? true : undefined),
      },
      prop: {
        value: {
          get: () => (isMultiple() ? selectedValues.value : selectedValue.value),
          set: (val: any) => {
            if (Array.isArray(val)) {
              choice.setValues(val.map((entry) => String(entry ?? '')));

              return;
            }

            if (val == null || val === '') {
              choice.clear();

              return;
            }

            choice.setValues([String(val)]);
          },
        },
      },
    });

    const focusedIndex = signal(-1);
    let lastQueryBeforeClear: string | null = null;
    let isRestoringQuery = false;

    // Convenience getter for single-select
    const selectedValue = computed(() => selectedValues.value[0] ?? '');
    const hasValue = () => selectedValues.value.length > 0;
    let inputEl: HTMLInputElement | null = null;
    let fieldEl: HTMLElement | null = null;
    let dropdownEl: HTMLElement | null = null;
    let listboxEl: HTMLElement | null = null;

    function getLiveInput(): HTMLInputElement | null {
      const liveInput = host.el.shadowRoot?.querySelector<HTMLInputElement>('input[role="combobox"]') ?? null;

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

    const selectionController = {
      clear: () => {
        choice.clear();
      },
      remove: (key: string) => {
        choice.removeValue(key);
      },
      select: (key: string) => {
        choice.selectValue(key);
      },
      toggle: (key: string) => {
        choice.toggleValue(key);
      },
    };

    function readOptions(elements: Element[] = Array.from(host.el.children)) {
      slottedOptions.value = parseSlottedOptions(elements);

      if (!isMultiple()) {
        const match = allOptions.value.find((option) => option.value === selectedValue.value);

        query.value = match?.label ?? selectedValue.value;
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

    const selectedValueItems = computed(() => selectedValues.value);
    const selectedLabelItems = computed(() =>
      selectedValues.value.map((value) => allOptions.value.find((option) => option.value === value)?.label ?? value),
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
      ariaSync: {
        additional: {
          autocomplete: 'list',
          describedby: () => (props.error.value || props.helper.value ? helperId : null),
          invalid: () => !!props.error.value,
          labelledby: () => (hasLabel() ? `${labelOutsideId} ${labelInsetId}` : null),
        },
        role: 'listbox',
      },
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
      triggerRef,
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
        const currentItem = selectedValues.value[0];
        const currentLabel = currentItem
          ? (allOptions.value.find((o) => o.value === currentItem)?.label ?? currentItem)
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
            choice.removeValue(selectedValues.value[selectedValues.value.length - 1] ?? '');
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

    watch(slots.elements(), () => readOptions(), { immediate: true });

    // Rebuild virtualizer when filtered options or open state changes
    effect(() => {
      const opts = filteredOptions.value;
      const open = isOpen.value;

      if (open && opts.length > 0) {
        setupVirtualizer(opts, open);
      } else {
        domVirtualList.setItems(opts);
      }

      if (listboxEl) {
        listboxEl.style.height = opts.length > 0 ? `${opts.length * 36}px` : '';
      }

      if (open) {
        positioner.updatePosition();
      }
    });

    effect(() => {
      const open = isOpen.value;
      const loading = isLoading();
      const optionCount = filteredOptions.value.length;
      const createLabel = creatableLabel.value;

      if (!listboxEl) return;

      for (const el of Array.from(listboxEl.querySelectorAll('.no-results,.no-results-create,.dropdown-loading'))) {
        el.remove();
      }

      if (!open) {
        updateRenderedItemState();

        return;
      }

      const visibleValues = new Set(filteredOptions.value.map((option) => option.value));
      const visibleIndexByValue = new Map(filteredOptions.value.map((option, index) => [option.value, index]));

      for (const optionEl of Array.from(listboxEl.querySelectorAll<HTMLElement>('.option'))) {
        const optionValue = optionEl.getAttribute('data-option-value');

        if (!optionValue) continue;

        if (!visibleValues.has(optionValue)) {
          optionEl.remove();

          continue;
        }

        const visibleIndex = visibleIndexByValue.get(optionValue);

        if (visibleIndex === undefined) continue;

        optionEl.id = `${comboId}-opt-${visibleIndex}`;
        optionEl.style.transform = `translateY(${visibleIndex * 36}px)`;
      }

      if (loading) {
        const loadingEl = document.createElement('div');

        loadingEl.className = 'dropdown-loading';
        loadingEl.textContent = 'Loading...';
        listboxEl.prepend(loadingEl);
      } else if (optionCount === 0) {
        if (createLabel) {
          const createEl = document.createElement('button');

          createEl.type = 'button';
          createEl.className = 'no-results-create';
          createEl.textContent = createLabel;
          createEl.toggleAttribute('data-focused', focusedIndex.value === -1);

          createEl.addEventListener('pointerdown', (e: PointerEvent) => {
            e.preventDefault();
          });

          createEl.addEventListener('click', (e) => {
            e.stopPropagation();
            createOption(createLabel, e);
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

      updateRenderedItemState();
    });

    const renderedStateDeps = computed(
      () =>
        `${isOpen.value ? '1' : '0'}|${props.multiple.value ? '1' : '0'}|${focusedIndex.value}|${selectedValue.value}|${selectedValues.value.join(',')}`,
    );

    watch(
      renderedStateDeps,
      () => {
        if (!isOpen.value) return;

        updateRenderedItemState();
      },
      { immediate: true },
    );

    onMounted(() => {
      fieldEl = inputEl?.closest('.field') as HTMLElement | null;
      dropdownEl = host.el.shadowRoot?.querySelector<HTMLElement>('.dropdown') ?? null;
      listboxEl = host.el.shadowRoot?.querySelector<HTMLElement>('[role="listbox"]') ?? null;

      return () => {
        domVirtualList.destroy();
      };
    });

    return () => html`
      <slot></slot>
      <div class="combobox-wrapper" part="wrapper">
        <label class="label-outside" for="${comboId}" id="${labelOutsideId}" ?hidden=${outsideLabelHidden} part="label">
          ${props.label}
        </label>
        <div
          class="field"
          part="field"
          @click="${(e: MouseEvent) => {
            fieldPress.handleClick(e);
          }}">
          <label class="label-inset" for="${comboId}" id="${labelInsetId}" ?hidden=${insetLabelHidden} part="label">
            ${props.label}
          </label>
          <div class="field-row">
            <div class="chips-row">
              <!-- Keep chip list diffing isolated so input node identity stays stable. -->
              <span class="chips-list">
                ${() =>
                  (isMultiple() ? selectedValues.value : []).map(
                    (value) => html`
                      <bit-chip
                        value=${value}
                        label=${allOptions.value.find((option) => option.value === value)?.label ?? value}
                        mode="removable"
                        variant="flat"
                        size="sm"
                        color="${props.color}"
                        @remove=${removeChip}>
                        ${allOptions.value.find((option) => option.value === value)?.label ?? value}
                      </bit-chip>
                    `,
                  )}
              </span>
              <input
                ref=${(el: HTMLInputElement | null) => {
                  inputEl = el;
                  triggerRef.value = el;

                  if (!el) {
                    fieldEl = null;

                    return;
                  }

                  fieldEl = el.closest('.field') as HTMLElement | null;
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
                :aria-controls="${() => `${comboId}-listbox`}"
                :aria-expanded="${() => String(isOpen.value)}"
                :disabled="${isDisabled}"
                @input=${handleInput}
                @keydown=${handleKeydown}
                @focus=${handleFocus}
                :value=${query} />
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
          ?hidden=${() => !assistiveText.value.errorText && !assistiveText.value.helperText}
          style="${() => (assistiveText.value.errorText ? 'color: var(--color-error);' : '')}"
          >${() => assistiveText.value.errorText || assistiveText.value.helperText}</span
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
