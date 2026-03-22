import {
  aria,
  computed,
  createFormIds,
  css,
  defineComponent,
  defineField,
  effect,
  html,
  inject,
  onMount,
  onSlotChange,
  ref,
  signal,
  typed,
  watch,
} from '@vielzeug/craftit';
import {
  createListNavigation,
  createOverlayControl,
  createSelectionControl,
  type ListNavigationResult,
  type OverlayOpenReason,
} from '@vielzeug/craftit/labs';

import type { AddEventListeners } from '../../types';

import '../../feedback/chip/chip';
import { checkIconHTML, chevronDownIcon, clearIcon } from '../../icons';
import { disabledLoadingMixin, forcedColorsFocusMixin, formFieldMixins, sizeVariantMixin } from '../../styles';
import { FORM_CTX } from '../form/form';
import { FIELD_SIZE_PRESET } from '../shared/design-presets';
import { createDropdownPositioner, mountLabelSyncStandalone } from '../shared/dom-sync';
import { computeControlledCsvState, createChoiceChangeDetail, resolveMergedAssistiveText } from '../shared/utils';
import { createFieldValidation } from '../shared/validation';
import {
  backfillSelectionLabels,
  filterOptions,
  getCreatableLabel,
  makeCreatableValue,
  parseSlottedOptions,
} from './combobox-options';
import { createComboboxVirtualizer } from './combobox-virtualizer';
import componentStyles from './combobox.css?inline';
import {
  type BitComboboxEvents,
  type BitComboboxProps,
  type ComboboxOptionItem,
  type ComboboxSelectionItem,
} from './combobox.types';

export type { BitComboboxEvents, BitComboboxOptionProps, BitComboboxProps } from './combobox.types';

// ============================================
// Styles
// ============================================

// ============================================
// ComboboxOption Component
// ============================================

/**
 * `bit-combobox-option` — A child element of `<bit-combobox>` that represents one option.
 *
 * @slot         - Label text for the option.
 * @slot icon    - Optional leading icon or decoration.
 */
export const COMBOBOX_OPTION_TAG = defineComponent({
  setup() {
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
  tag: 'bit-combobox-option',
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
export const COMBOBOX_TAG = defineComponent<BitComboboxProps, BitComboboxEvents>({
  formAssociated: true,
  props: {
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
    options: typed<ComboboxOptionItem[] | undefined>(undefined, { reflect: false }),
    placeholder: { default: '' },
    rounded: { default: undefined },
    size: { default: undefined },
    value: { default: '' },
    variant: { default: undefined },
  },
  setup({ emit, host, props }) {
    const { fieldId: comboId, helperId, labelId } = createFormIds('combobox', props.name.value);
    // Label refs
    const labelOutsideRef = ref<HTMLLabelElement>();
    const labelInsetRef = ref<HTMLLabelElement>();
    const formCtx = inject(FORM_CTX, undefined);
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

    const { triggerValidation } = createFieldValidation(formCtx, fd);

    // ── State ────────────────────────────────────────────────────────────────
    const isOpen = signal(false);
    const query = signal('');
    const isDisabled = computed(() => Boolean(props.disabled.value));
    const isMultiple = computed(() => Boolean(props.multiple.value));
    const isCreatable = computed(() => Boolean(props.creatable.value));
    const isNoFilter = computed(() => Boolean(props['no-filter'].value));

    watch(
      isOpen,
      (value) => {
        host.toggleAttribute('open', ((value) => Boolean(value))(value));
      },
      { immediate: true },
    );

    // Multi-value state: always an array; single mode uses at most one entry
    const selectedValues = signal<ComboboxSelectionItem[]>(
      props.value.value ? [{ label: '', value: props.value.value }] : [],
    );
    const focusedIndex = signal(-1);
    const selectionController = createSelectionControl<ComboboxSelectionItem>({
      findByKey: (value) => {
        const existing = selectedValues.value.find((item) => item.value === value);

        if (existing) return existing;

        // If not found in selection, try to find in all options to get label
        const option = allOptions.value.find((o) => o.value === value);

        if (option) return { label: option.label, value: option.value };

        // Fallback: key is the value
        return { label: '', value };
      },
      getMode: () => (isMultiple.value ? 'multiple' : 'single'),
      getSelected: () => selectedValues.value,
      keyExtractor: (item) => item.value,
      setSelected: (next) => {
        selectedValues.value = next;
      },
    });

    // Sync external value prop changes to selectedValues (controlled mode)
    const syncControlledValue = (nextValue: unknown): void => {
      const state = computeControlledCsvState(String(nextValue ?? ''));

      if (state.isEmpty) {
        selectionController.clear();
        query.value = '';
        formValue.value = '';

        return;
      }

      if (isMultiple.value) {
        selectedValues.value = state.values.map((value) => ({ label: '', value }));
        formValue.value = state.formValue;

        return;
      }

      // Single mode: one value
      selectedValues.value = [{ label: '', value: state.firstValue }];
      formValue.value = state.firstValue;
    };

    watch(props.value, (newValue) => syncControlledValue(newValue), { immediate: true });
    watch(props.multiple, () => syncControlledValue(props.value.value));

    // Convenience getter for single-select
    const selectedValue = computed(() => selectedValues.value[0]?.value ?? '');
    const hasValue = computed(() => selectedValues.value.length > 0);
    const hasLabel = computed(() => !!props.label.value);
    let inputEl: HTMLInputElement | null = null;
    let fieldEl: HTMLElement | null = null;
    let dropdownEl: HTMLElement | null = null;
    let listboxEl: HTMLElement | null = null;

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
    const isLoading = computed(() => Boolean(props.loading.value));
    // Merged options: explicit prop value overrides slotted options.
    const allOptions = computed<ComboboxOptionItem[]>(() => {
      const base = props.options.value ?? slottedOptions.value;

      if (createdOptions.value.length === 0) return base;

      return [...base, ...createdOptions.value];
    });

    function readOptions(elements: Element[] = Array.from(host.children)) {
      slottedOptions.value = parseSlottedOptions(elements);

      // Backfill labels for any already-selected values that were set before options loaded
      if (selectedValues.value.length > 0) {
        selectedValues.value = backfillSelectionLabels(selectedValues.value, allOptions.value);

        // Also sync the query in single mode
        if (!isMultiple.value && selectedValues.value.length === 1) {
          query.value = selectedValues.value[0]?.label ?? '';
        }
      }
    }

    const filteredOptions = computed<ComboboxOptionItem[]>(() => {
      return filterOptions(allOptions.value, query.value, isNoFilter.value);
    });
    // "Create" option shown when creatable + query doesn't match any existing option
    const creatableLabel = computed(() => {
      return getCreatableLabel(query.value, isCreatable.value, filteredOptions.value);
    });
    const assistiveText = computed(() => resolveMergedAssistiveText(props.error.value, props.helper.value));
    const inputPlaceholder = computed(() =>
      isMultiple.value && selectedValues.value.length > 0 ? '' : props.placeholder.value || '',
    );

    const selectedValueItems = computed(() => selectedValues.value.map((s) => s.value));
    const selectedLabelItems = computed(() =>
      selectedValues.value.map((selection) => {
        if (selection.label) return selection.label;

        return allOptions.value.find((option) => option.value === selection.value)?.label ?? selection.value;
      }),
    );

    function syncMultipleFormValue() {
      formValue.value = selectionController.serialize(',');
    }

    function emitChange(originalEvent?: Event) {
      emit('change', createChoiceChangeDetail(selectedValueItems.value, selectedLabelItems.value, originalEvent));
    }

    function removeChip(event: Event): void {
      event.stopPropagation();

      const value = (event as CustomEvent<{ value?: string }>).detail?.value;

      if (value === undefined) return;

      selectionController.remove(value);
      syncMultipleFormValue();
      emitChange(event);
      triggerValidation('change');
    }

    // ── Positioning (shared positioner) ──────────────────────────────────────
    const positioner = createDropdownPositioner(
      () => fieldEl,
      () => dropdownEl,
    );

    const listNavigation = createListNavigation<ComboboxOptionItem>({
      getIndex: () => focusedIndex.value,
      getItems: () => filteredOptions.value,
      isItemDisabled: (option) => option.disabled,
      setIndex: (index) => {
        focusedIndex.value = index;
        scrollFocusedIntoView();
      },
    });

    const overlay = createOverlayControl({
      getBoundaryElement: () => host,
      getPanelElement: () => dropdownEl,
      getTriggerElement: () => inputEl,
      isDisabled: () => isDisabled.value,
      isOpen: () => isOpen.value,
      positioner: {
        floating: () => dropdownEl,
        reference: () => fieldEl,
        update: () => positioner.updatePosition(),
      },
      restoreFocus: false,
      setOpen: (next, _context) => {
        isOpen.value = next;

        if (!next) listNavigation.reset();
      },
    });

    const applyNavigationResult = (result: ListNavigationResult): void => {
      if (result.reason === 'empty' || result.reason === 'no-enabled-item') {
        focusedIndex.value = -1;
      }
    };

    // ── Open / Close ─────────────────────────────────────────────────────────
    function open(clearFilter = true, reason: OverlayOpenReason = 'programmatic') {
      if (clearFilter) query.value = '';

      overlay.open({ reason });
    }

    function close(reason: 'escape' | 'programmatic' | 'outside-click' | 'toggle' = 'programmatic') {
      overlay.close({ reason, restoreFocus: false });

      // In single mode restore the query to the selected label (or clear)
      if (!isMultiple.value) {
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

      if (isMultiple.value) {
        selectionController.toggle(opt.value);
        syncMultipleFormValue();
        query.value = '';
        emitChange(originalEvent);
        triggerValidation('change');
        // Keep dropdown open in multiple mode
        focusLiveInput();
        requestAnimationFrame(() => focusLiveInput());
      } else {
        selectionController.select(opt.value);
        query.value = opt.label;
        formValue.value = opt.value;
        emitChange(originalEvent);
        triggerValidation('change');
        close();
        focusLiveInput();
      }
    }
    function clearValue(e: Event) {
      e.stopPropagation();
      selectionController.clear();
      query.value = '';
      formValue.value = '';
      emitChange(e);
      triggerValidation('change');
      focusLiveInput();
    }
    function handleInput(e: Event) {
      const target = e.target as HTMLInputElement;

      query.value = target.value;

      if (!isMultiple.value) selectionController.clear();

      applyNavigationResult(listNavigation.first());

      if (!isOpen.value) open(false, 'trigger');

      emit('search', { query: target.value } as { query: string });
    }
    function handleFocus() {
      if (!isOpen.value) open(false, 'trigger');
    }
    // ── Keyboard Navigation ──────────────────────────────────────────────────
    function handleKeydown(e: KeyboardEvent) {
      if (isDisabled.value) return;

      const opts = filteredOptions.value;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();

          if (!isOpen.value) {
            open(true, 'trigger');

            applyNavigationResult(listNavigation.first());
          } else {
            applyNavigationResult(listNavigation.next());
          }

          break;
        case 'ArrowUp':
          e.preventDefault();

          if (!isOpen.value) {
            open(true, 'trigger');
          } else {
            applyNavigationResult(listNavigation.prev());
          }

          break;
        case 'Backspace':
          // In multiple mode, remove the last chip when the input is empty
          if (isMultiple.value && !query.value && selectedValues.value.length > 0) {
            selectedValues.value = selectedValues.value.slice(0, -1);
            syncMultipleFormValue();
            emitChange(e);
            triggerValidation('change');
          }

          break;
        case 'End':
          if (isOpen.value) {
            e.preventDefault();
            applyNavigationResult(listNavigation.last());
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
            close('escape');
          }

          break;
        case 'Home':
          if (isOpen.value) {
            e.preventDefault();
            applyNavigationResult(listNavigation.first());
          }

          break;
        case 'Tab':
          close('programmatic');
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
      getFocusedIndex: () => focusedIndex.peek(),
      getIsMultiple: () => isMultiple.peek(),
      getListboxElement: () => listboxEl,
      getSelectedValue: () => selectedValue.peek(),
      getSelectedValues: () => selectedValues.peek(),
      onSelectOption: selectOption,
      setFocusedIndex: (index) => {
        focusedIndex.value = index;
      },
    });

    // ── Create option ────────────────────────────────────────────────────────
    function createOption(label: string, originalEvent?: Event) {
      const value = makeCreatableValue(label);
      const newOpt: ComboboxOptionItem = { disabled: false, iconEl: null, label, value };

      createdOptions.value = [...createdOptions.value, newOpt];
      selectOption(newOpt, originalEvent);
    }
    // ── Lifecycle ────────────────────────────────────────────────────────────
    onMount(() => {
      fieldEl = inputEl?.closest('.field') as HTMLElement | null;
      dropdownEl = host.shadowRoot?.querySelector<HTMLElement>('.dropdown') ?? null;
      listboxEl = host.shadowRoot?.querySelector<HTMLElement>('[role="listbox"]') ?? null;

      const removeOutsideClick = overlay.bindOutsideClick(document);

      onSlotChange('default', readOptions);
      // Ensure initial light-DOM options are available for immediate keyboard interaction.
      readOptions();
      // Rebuild virtualizer when filtered options or open state changes
      effect(() => {
        const opts = filteredOptions.value;
        const open = isOpen.value;

        if (open && opts.length > 0) {
          requestAnimationFrame(() => setupVirtualizer(opts, open));
        } else {
          domVirtualList.update(opts, false);
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

              createEl.addEventListener('mousedown', (e) => {
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
          id="${labelId}"
          ref=${labelOutsideRef}
          hidden
          part="label"></label>
        <div
          class="field"
          part="field"
          @click="${() => {
            if (!isOpen.value) open(false, 'trigger');

            focusLiveInput();
          }}">
          <label class="label-inset" for="${comboId}" id="${labelId}" ref=${labelInsetRef} hidden part="label"></label>
          <div class="field-row">
            <div class="chips-row">
              <!-- Keep chip list diffing isolated so input node identity stays stable. -->
              <span class="chips-list">
                ${() =>
                  (isMultiple.value ? selectedValues.value : []).map(
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
              </span>
              <input
                ref=${(el: HTMLInputElement | null) => {
                  inputEl = el;

                  if (!el) {
                    fieldEl = null;

                    return;
                  }

                  fieldEl = el.closest('.field') as HTMLElement | null;
                  aria(el, {
                    activedescendant: () => (focusedIndex.value >= 0 ? `${comboId}-opt-${focusedIndex.value}` : null),
                    autocomplete: 'list',
                    controls: () => `${comboId}-listbox`,
                    describedby: () => (props.error.value || props.helper.value ? helperId : null),
                    disabled: () => isDisabled.value,
                    expanded: () => (isOpen.value ? 'true' : 'false'),
                    invalid: () => !!props.error.value,
                    labelledby: () => (hasLabel.value ? labelId : null),
                  });
                }}
                class="input"
                part="input"
                type="text"
                role="combobox"
                autocomplete="off"
                spellcheck="false"
                id="${comboId}"
                name="${() => props.name.value}"
                placeholder=${() => inputPlaceholder.value}
                :disabled="${() => isDisabled.value}"
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
  shadow: { delegatesFocus: true },
  styles: [
    sizeVariantMixin(FIELD_SIZE_PRESET),
    ...formFieldMixins,
    disabledLoadingMixin(),
    forcedColorsFocusMixin('.input'),
    componentStyles,
  ],
  tag: 'bit-combobox',
}) as unknown as AddEventListeners<BitComboboxEvents>;
