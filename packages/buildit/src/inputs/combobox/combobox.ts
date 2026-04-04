import {
  define,
  createCleanupSignal,
  computed,
  css,
  effect,
  html,
  inject,
  onMount,
  signal,
  untrack,
  watch,
} from '@vielzeug/craftit';
import {
  createChoiceFieldControl,
  createListControl,
  createListKeyControl,
  createOverlayControl,
  createPressControl,
  type OverlayCloseReason,
  type OverlayOpenReason,
} from '@vielzeug/craftit/controls';

import '../../content/icon/icon';
import '../../feedback/chip/chip';
import type { AddEventListeners } from '../../types';

import { disabledLoadingMixin, forcedColorsFocusMixin, formFieldMixins, sizeVariantMixin } from '../../styles';
import { syncAria } from '../../utils/aria';
import {
  disablableBundle,
  loadableBundle,
  roundableBundle,
  sizableBundle,
  themableBundle,
  type PropBundle,
} from '../shared/bundles';
import { FIELD_SIZE_PRESET } from '../shared/design-presets';
import { createDropdownPositioner, mountFormContextSync } from '../shared/dom-sync';
import { FORM_CTX } from '../shared/form-context';
import { createChoiceChangeDetail } from '../shared/utils';
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
  type ComboboxOptionInput,
  type BitComboboxProps,
  type ComboboxOptionItem,
  type ComboboxSelectionItem,
} from './combobox.types';

const checkIconHTML = '<bit-icon name="check" size="14" stroke-width="2.5" aria-hidden="true"></bit-icon>';

export type {
  BitComboboxEvents,
  BitComboboxOptionProps,
  BitComboboxProps,
  ComboboxOptionInput,
} from './combobox.types';

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
export const COMBOBOX_OPTION_TAG = define('bit-combobox-option', {
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
});

// ============================================
// Component
// ============================================

const comboboxProps = {
  ...themableBundle,
  ...sizableBundle,
  ...disablableBundle,
  ...loadableBundle,
  ...roundableBundle,
  clearable: false,
  creatable: false,
  error: { default: '' as string, omit: true },
  fullwidth: false,
  helper: '',
  label: '',
  'label-placement': 'inset',
  multiple: false,
  name: '',
  'no-filter': false,
  options: { default: undefined as ComboboxOptionInput[] | undefined, reflect: false },
  placeholder: '',
  value: '',
  variant: undefined,
} satisfies PropBundle<BitComboboxProps>;

/**
 * `bit-combobox` — Autocomplete/combobox text input with a filterable listbox.
 *
 * Place `<bit-combobox-option>` elements as children to define the available options.
 * Each option supports a `label` attribute (falls back to text content) and an `icon` named slot.
 *
 * @fires change - Fired when selection changes. detail: { value: string, values: string[], labels: string[], originalEvent?: Event }
 * @fires open - Fired when the dropdown opens. detail: { reason: 'trigger' | 'programmatic' }
 * @fires close - Fired when the dropdown closes. detail: { reason: 'escape' | 'outside-click' | 'programmatic' }
 * @fires search - Fired while typing in the input. detail: { query: string }
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
export const COMBOBOX_TAG = define<BitComboboxProps, BitComboboxEvents>('bit-combobox', {
  formAssociated: true,
  props: comboboxProps,
  setup({ emit, host, props, slots }) {
    const formCtx = inject(FORM_CTX, undefined);
    const isOpen = signal(false);
    const query = signal('');
    const choice = createChoiceFieldControl<ComboboxSelectionItem>({
      context: formCtx,
      disabled: props.disabled,
      error: props.error,
      getValue: (item) => item.value,
      helper: props.helper,
      label: props.label,
      labelPlacement: props['label-placement'],
      mapControlledValue: (value) => ({ label: '', value }),
      multiple: props.multiple,
      name: props.name,
      onReset: () => {
        query.value = '';
      },
      prefix: 'combobox',
      value: props.value,
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
    const isMultiple = computed(() => Boolean(props.multiple.value));
    const isCreatable = computed(() => Boolean(props.creatable.value));
    const isNoFilter = computed(() => Boolean(props['no-filter'].value));

    host.bind('attr', {
      open: () => (isOpen.value ? true : undefined),
    });

    const focusedIndex = signal(-1);

    // Convenience getter for single-select
    const selectedValue = computed(() => selectedValues.value[0]?.value ?? '');
    const hasValue = computed(() => selectedValues.value.length > 0);
    const hasLabel = computed(() => !!props.label.value);
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
    const isLoading = computed(() => Boolean(props.loading.value));

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
      const base = props.options.value?.map(normalizeOption) ?? slottedOptions.value;

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
    const assistiveText = choice.assistive;
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

    const listNavigation = createListControl<ComboboxOptionItem>({
      getIndex: () => focusedIndex.value,
      getItems: () => filteredOptions.value,
      isItemDisabled: (option) => option.disabled,
      setIndex: (index) => {
        focusedIndex.value = index;
        scrollFocusedIntoView();
      },
    });

    const openListKeys = createListKeyControl({
      control: listNavigation,
      disabled: () => !isOpen.value,
      onInvoke: (_action, result) => {
        applyNavigationResult(result as ReturnType<typeof listNavigation.next>);
      },
    });

    const overlayElements: { boundary: HTMLElement; panel: HTMLElement | null; trigger: HTMLInputElement | null } = {
      boundary: host.el,
      panel: null,
      trigger: null,
    };

    const overlay = createOverlayControl({
      disabled: isDisabled,
      elements: overlayElements,
      isOpen: isOpen,
      onClose: (reason) => emit('close', { reason }),
      onOpen: (reason) => emit('open', { reason }),
      positioner: {
        floating: () => dropdownEl,
        reference: () => fieldEl,
        update: () => positioner.updatePosition(),
      },
      restoreFocus: false,
      setOpen: (next) => {
        isOpen.value = next;

        if (!next) listNavigation.reset();
      },
    });

    const applyNavigationResult = (result: ReturnType<typeof listNavigation.next>): void => {
      if (result.index === -1) {
        focusedIndex.value = -1;
      }
    };

    // ── Open / Close ─────────────────────────────────────────────────────────
    function open(clearFilter = true, reason: OverlayOpenReason = 'programmatic') {
      if (clearFilter) query.value = '';

      overlay.open(reason);
    }

    function close(reason: OverlayCloseReason = 'programmatic') {
      overlay.close(reason, false);

      // In single mode restore the query to the selected label (or clear)
      if (!isMultiple.value) {
        const match = allOptions.value.find((o) => o.value === selectedValue.value);

        query.value = match?.label ?? '';
      } else {
        query.value = '';
      }

      triggerValidation('blur');
    }

    const fieldPress = createPressControl({
      disabled: () => isDisabled.value,
      onPress: () => {
        if (!isOpen.value) open(true, 'trigger');

        focusLiveInput();
      },
    });

    const enterPress = createPressControl({
      disabled: () => isDisabled.value,
      keys: ['Enter'],
      onPress: (originalEvent) => {
        const opts = filteredOptions.value;

        if (isOpen.value && focusedIndex.value >= 0 && focusedIndex.value < opts.length) {
          selectOption(opts[focusedIndex.value], originalEvent);
        } else if (isOpen.value && focusedIndex.value === -1 && creatableLabel.value) {
          // Focused on the "create" item
          createOption(creatableLabel.value, originalEvent);
        } else if (!isOpen.value) {
          open();
        }
      },
    });

    // ── Selection ────────────────────────────────────────────────────────────
    function selectOption(opt: ComboboxOptionItem, originalEvent?: Event) {
      if (opt.disabled) return;

      if (isMultiple.value) {
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
        close();
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
    function handleInput(e: Event) {
      const target = e.target as HTMLInputElement;

      query.value = target.value;

      if (!isMultiple.value) selectionController.clear();

      applyNavigationResult(listNavigation.first());

      if (!isOpen.value) open(false, 'trigger');

      emit('search', { query: target.value } as { query: string });
    }
    function handleFocus() {
      if (!isOpen.value) open(true, 'trigger');
    }
    // ── Keyboard Navigation ──────────────────────────────────────────────────
    function handleKeydown(e: KeyboardEvent) {
      if (isDisabled.value) return;

      if (openListKeys.handleKeydown(e)) return;

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
            close('escape');
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
      getFocusedIndex: () => untrack(() => focusedIndex.value),
      getIsMultiple: () => untrack(() => isMultiple.value),
      getListboxElement: () => listboxEl,
      getSelectedValue: () => untrack(() => selectedValue.value),
      getSelectedValues: () => untrack(() => selectedValues.value),
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

      // Make the outside-click handler aware of the panel so clicks inside
      // the dropdown are not treated as outside clicks (critical for multi-select)
      overlayElements.panel = dropdownEl;

      const removeOutsideClick = overlay.bindOutsideClick(document);

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
            .map((item) => item.value)
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
                  (isMultiple.value ? selectedValues.value : []).map(
                    (item) => html`
                      <bit-chip
                        value=${item.value}
                        label=${item.label || item.value}
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
                    inputAriaBinding.clear();

                    return;
                  }

                  fieldEl = el.closest('.field') as HTMLElement | null;
                  inputAriaBinding.set(
                    syncAria(el, {
                      activedescendant: () => (focusedIndex.value >= 0 ? `${comboId}-opt-${focusedIndex.value}` : null),
                      autocomplete: 'list',
                      controls: () => `${comboId}-listbox`,
                      describedby: () => (props.error.value || props.helper.value ? helperId : null),
                      disabled: () => isDisabled.value,
                      expanded: () => (isOpen.value ? 'true' : 'false'),
                      invalid: () => !!props.error.value,
                      labelledby: () => (hasLabel.value ? `${labelOutsideId} ${labelInsetId}` : null),
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
}) as unknown as AddEventListeners<BitComboboxEvents>;
