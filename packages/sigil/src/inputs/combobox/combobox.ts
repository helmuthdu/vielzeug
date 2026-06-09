import {
  computed,
  define,
  defineField,
  effect,
  html,
  inject,
  onCleanup,
  onElement,
  prop,
  ref,
  signal,
} from '@vielzeug/craft';

import type { AddEventListeners, ComponentSize, RoundedSize, ThemeColor } from '../../types';
import type { SgComboboxEvents, SgComboboxProps, ComboboxOptionInput, ComboboxOptionItem } from './combobox.types';

import {
  lifecycleSignal,
  createChoiceField,
  createInteraction,
  createOptionList,
  type DialogCloseReason,
  type OverlayOpenReason,
} from '../../headless';
import { reducedMotionMixin } from '../../styles';
import { FORM_CTX, useFormContext } from '../shared/form-context';
import { filterOptions, getCreatableLabel, makeCreatableValue, parseSlottedOptions } from './combobox-options';
import '../../feedback/chip/chip';
import '../input/input';
import componentStyles from './combobox.css?inline';

export type { SgComboboxEvents, SgComboboxProps } from './combobox.types';

/**
 * A searchable select field with multiple selection, custom option creation, and large-list support.
 *
 * @element sg-combobox
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
 * @slot - Slotted combobox options and option groups
 * @cssprop --combobox-dropdown-bg - Dropdown panel background color
 * @cssprop --combobox-dropdown-border-color - Dropdown panel border color
 * @cssprop --combobox-option-hover-bg - Option background on hover
 * @cssprop --combobox-option-focus-bg - Option background when keyboard-focused
 * @cssprop --combobox-option-selected-bg - Option background when selected
 * @cssprop --combobox-option-selected-focus-bg - Option background when selected and focused
 * @cssprop --input-bg - Field background (passed through to sg-input)
 * @cssprop --input-border-color - Field border color (passed through to sg-input)
 *
 * @part wrapper - Root wrapper around the entire field
 * @part label - Label element shown inside or outside the field
 * @part field - Field container that holds the trigger input and clear button
 * @part input - Search input used to filter and select options
 * @part clear-btn - Button that clears the current selection/query
 * @part dropdown - Popup list container for options
 * @part helper-text - Helper text displayed below the field
 * @example
 * ```html
 * <sg-combobox label="Country" name="country">
 *   <sg-combobox-option value="us">United States</sg-combobox-option>
 *   <sg-combobox-option value="gb">United Kingdom</sg-combobox-option>
 *   <sg-combobox-option value="de" disabled>Germany</sg-combobox-option>
 * </sg-combobox>
 * ```
 */
export const COMBOBOX_TAG = 'sg-combobox' as const;
define<SgComboboxProps, SgComboboxEvents>(COMBOBOX_TAG, {
  formAssociated: true,
  props: {
    color: prop.string<ThemeColor>(),
    creatable: prop.bool(false),
    disabled: prop.bool(false),
    error: prop.string(),
    fullwidth: prop.bool(false),
    helper: prop.string(),
    label: prop.string(),
    'label-placement': prop.oneOf(['inset', 'outside'] as const, 'inset'),
    loading: prop.bool(false),
    multiple: prop.bool(false),
    name: prop.string(),
    'no-filter': prop.bool(false),
    options: prop.json(undefined as ComboboxOptionInput[] | undefined),
    placeholder: prop.string('Select...'),
    rounded: prop.string<RoundedSize>(),
    size: prop.string<ComponentSize>(),
    value: prop.string(),
    variant: prop.string<'flat' | 'solid' | 'bordered' | 'outline' | 'ghost'>(),
  },
  setup(props, { bind, el, emit }) {
    const formCtx = inject(FORM_CTX);
    const fCtxProps = useFormContext(bind, props, formCtx);
    const query = signal('');

    // Element refs needed by the composite option-list factory.
    let inputEl: HTMLInputElement | null = null;
    let fieldEl: HTMLElement | null = null; // set to the sg-input host once it mounts
    let dropdownEl: HTMLElement | null = null;
    let listboxEl: HTMLElement | null = null;

    // Ref to the sg-input host; resolved when the template renders.
    const bitInputRef = ref<HTMLElement>();

    const abortSignal = lifecycleSignal(onCleanup);
    const choice = createChoiceField({
      disabled: fCtxProps.disabled,
      error: props.error,
      helper: props.helper,
      label: props.label,
      labelPlacement: props['label-placement'],
      multiple: props.multiple,
      prefix: 'combobox',
      signal: abortSignal,
      validateOn: formCtx?.validateOn,
      value: props.value,
    });

    // filteredOptions signal declared before optionList so the getItems getter
    // captures the live signal reference rather than needing a factory indirection.
    const filteredOptions = signal<ComboboxOptionItem[]>([]);

    const optionList = createOptionList<ComboboxOptionItem>({
      dom: {
        getBoundary: () => el,
        getFocusedOptionElement: () => dropdownEl?.querySelector<HTMLElement>('[data-focused]') ?? null,
        getPanel: () => dropdownEl,
        getReference: () => fieldEl,
        getTrigger: () => inputEl,
      },
      isDisabled: () => choice.disabled.value,
      items: {
        getItems: () => filteredOptions.value,
        getOptionId: (index) => `${choice.fieldId}-opt-${index}`,
      },
      on: {
        onClose: (reason) => {
          emit('close', { reason });

          if (!abortSignal.aborted) restoreQueryFromSelection();

          choice.triggerValidation('blur');
        },
        onOpen: (reason) => emit('open', { reason }),
      },
      restoreFocus: false,
      signal: abortSignal,
    });

    const { disabled: isDisabled, fieldId: comboId, selectedValues, triggerValidation } = choice;

    choice.bindFormField(
      defineField<string>({ disabled: choice.disabled, toFormValue: (v) => v, value: choice.formValue }),
    );

    const { focusedIndex, isOpen, positioner, scrollFocusedIntoView } = optionList;
    // ── State ────────────────────────────────────────────────────────────────
    const isMultiple = () => Boolean(props.multiple.value);
    const isCreatable = () => Boolean(props.creatable.value);
    const isNoFilter = () => Boolean(props['no-filter'].value);

    bind({
      attr: {
        open: () => (isOpen.value ? true : undefined),
        size: fCtxProps.size,
        variant: fCtxProps.variant,
      },
    });

    let lastQueryBeforeClear: string | null = null;
    let isRestoringQuery = false;

    // Convenience getter for single-select
    const selectedValue = computed(() => selectedValues.value[0] ?? '');

    // Expose .value as a JS property accessor on the host element
    Object.defineProperty(el, 'value', {
      configurable: true,
      get: () => (isMultiple() ? selectedValues.value : selectedValue.value),
      set: (val: unknown) => {
        const v = val as string | string[] | null | undefined;

        if (Array.isArray(v)) {
          choice.setValues(v.map((entry) => String(entry ?? '')));

          return;
        }

        if (v == null || v === '') {
          choice.clear();

          return;
        }

        choice.setValues([String(v)]);
      },
    });

    const hasValue = () => selectedValues.value.length > 0;

    function focusLiveInput() {
      inputEl?.focus();
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

    function readOptions(elements: Element[] = Array.from(el.children)) {
      slottedOptions.value = parseSlottedOptions(elements);

      if (!isMultiple()) {
        const match = allOptions.value.find((option) => option.value === selectedValue.value);

        query.value = match?.label ?? selectedValue.value;
      }
    }

    // Initialize from light DOM immediately; onMounted/observer keep this in sync afterwards.
    readOptions();

    effect(() => {
      const nextOptions = filterOptions(allOptions.value, query.value, isNoFilter());

      filteredOptions.value = isMultiple()
        ? nextOptions.filter((option) => !selectedValues.value.includes(option.value))
        : nextOptions;
    });

    // "Create" option shown when creatable + query doesn't match any existing option
    const creatableLabel = computed(() => {
      return getCreatableLabel(query.value, isCreatable(), filteredOptions.value);
    });
    const inputPlaceholder = () =>
      isMultiple() && selectedValues.value.length > 0 ? '' : props.placeholder.value || '';

    const selectedValueItems = computed(() => selectedValues.value);
    const selectedLabelItems = computed(() =>
      selectedValues.value.map((value) => allOptions.value.find((option) => option.value === value)?.label ?? value),
    );

    function emitChange(originalEvent?: Event) {
      emit('change', { labels: selectedLabelItems.value, originalEvent, values: selectedValueItems.value });
    }

    function removeChip(event: Event): void {
      event.stopPropagation();

      const value = (event as CustomEvent<{ value?: string }>).detail?.value;

      if (value === undefined) return;

      selectionController.remove(value);
      emitChange(event);
      triggerValidation('change');
    }

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

    effect(() => {
      if (isOpen.value && !isMultiple() && selectedValue.value && focusedIndex.value === -1 && query.value === '') {
        const selectedIndex = filteredOptions.value.findIndex((option) => option.value === selectedValue.value);

        if (selectedIndex >= 0) {
          optionList.set(selectedIndex);
        }
      }
    });

    // ── Open / Close ─────────────────────────────────────────────────────────
    function openPopup(clearFilter = true, reason: OverlayOpenReason = 'programmatic') {
      if (clearFilter) {
        lastQueryBeforeClear = query.value;
        query.value = '';
      }

      // Pre-compute focused index BEFORE opening so the first render has it set
      if (!isMultiple() && selectedValue.value) {
        const freshOptions = filterOptions(allOptions.value, '', isNoFilter());
        const selectedIndex = freshOptions.findIndex((option) => option.value === selectedValue.value);

        if (selectedIndex >= 0) {
          optionList.set(selectedIndex);
        }
      }

      optionList.open(reason);

      if (!isMultiple() && selectedValue.value && focusedIndex.value >= 0) {
        requestAnimationFrame(() => {
          scrollFocusedIntoView();
        });
      }
    }

    function closePopup(reason: DialogCloseReason = 'programmatic') {
      optionList.close(reason);
    }

    const fieldPress = createInteraction({
      disabled: () => isDisabled.value,
      onPress: () => {
        if (!isOpen.value) openPopup(true, 'click');

        focusLiveInput();
      },
    });

    const enterPress = createInteraction({
      disabled: () => isDisabled.value,
      keys: ['Enter'],
      onPress: (originalEvent: Event) => {
        const opts = filteredOptions.value;

        if (isOpen.value && focusedIndex.value >= 0 && focusedIndex.value < opts.length) {
          selectOption(opts[focusedIndex.value], originalEvent);
        } else if (isOpen.value && focusedIndex.value === -1 && creatableLabel.value) {
          // Focused on the "create" item
          createOption(query.value, originalEvent);
        } else if (!isOpen.value) {
          openPopup(true, 'keyboard');
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
    function resolveOptionFromElement(optionEl: HTMLElement): ComboboxOptionItem | null {
      const indexAttr = optionEl.getAttribute('data-option-index');
      const index = indexAttr ? Number(indexAttr) : -1;

      if (Number.isInteger(index) && index >= 0 && index < filteredOptions.value.length) {
        return filteredOptions.value[index] ?? null;
      }

      const valueAttr = optionEl.getAttribute('data-option-value');

      if (valueAttr) {
        const byValue = filteredOptions.value.find((option) => option.value === valueAttr);

        if (byValue) return byValue;
      }

      const labelText = optionEl.querySelector('span')?.textContent?.trim() ?? optionEl.textContent?.trim() ?? '';

      if (!labelText) return null;

      return filteredOptions.value.find((option) => option.label === labelText || option.value === labelText) ?? null;
    }
    function clearValue(e: Event) {
      e.stopPropagation();
      selectionController.clear();
      query.value = '';
      emitChange(e);
      triggerValidation('change');
      focusLiveInput();
    }
    function handleInput(e: InputEvent) {
      const target = e.target as HTMLInputElement;
      const newValue = target.value;

      // Skip all input processing if we're in the middle of restoring the query
      // This prevents the clearing logic from firing during close/restore
      if (isRestoringQuery) {
        return;
      }

      if (newValue === query.value) return;

      query.value = newValue;

      if (!isMultiple()) {
        const currentItem = selectedValues.value[0];
        const currentLabel = currentItem
          ? (allOptions.value.find((o) => o.value === currentItem)?.label ?? currentItem)
          : '';

        // Preserve the current selection while typing. Selection should only
        // change when a new option is committed or when the user explicitly clears.
        const isJustOpening = newValue === '' && lastQueryBeforeClear === currentLabel;

        if (isJustOpening) {
          lastQueryBeforeClear = null;
        }
      }

      optionList.first();

      if (!isOpen.value) openPopup(false, 'keyboard');

      emit('search', { query: target.value });
    }
    function handleFocus() {
      if (!isOpen.value) openPopup(true, 'focus');
    }

    // ── Keyboard Navigation ──────────────────────────────────────────────────
    function handleKeydown(e: KeyboardEvent) {
      if (isDisabled.value) return;

      if (optionList.handleKeydown(e)) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();

          if (!isOpen.value) {
            openPopup(true, 'keyboard');
            optionList.first();
          } else {
            optionList.next();
          }

          break;
        case 'ArrowUp':
          e.preventDefault();

          if (!isOpen.value) {
            openPopup(true, 'keyboard');
          } else {
            optionList.prev();
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
        case 'Tab':
          closePopup('programmatic');
          break;
        default:
          break;
      }
    }

    // ── Create option ────────────────────────────────────────────────────────
    function createOption(rawQuery: string, originalEvent?: Event) {
      const actualLabel = rawQuery.trim();

      if (!actualLabel) return;

      const value = makeCreatableValue(actualLabel);
      const newOpt: ComboboxOptionItem = { disabled: false, iconEl: null, label: actualLabel, value };

      createdOptions.value = [...createdOptions.value, newOpt];
      selectOption(newOpt, originalEvent);
    }
    // ── Lifecycle ────────────────────────────────────────────────────────────

    const observeLightDomOptions = (): (() => void) => {
      const observer = new MutationObserver(() => {
        readOptions();
      });

      observer.observe(el, {
        attributeFilter: ['disabled', 'label', 'value'],
        attributes: true,
        childList: true,
        subtree: true,
      });

      return () => observer.disconnect();
    };

    const stopObserving = observeLightDomOptions();

    const handleShadowOptionPointerMove = (event: PointerEvent): void => {
      const target = event.target;

      if (!(target instanceof Element)) return;

      const optionEl = target.closest<HTMLElement>('.option');

      if (!optionEl) return;

      const option = resolveOptionFromElement(optionEl);

      if (!option || option.disabled) return;

      const focusedIdx = filteredOptions.value.findIndex((candidate) => candidate.value === option.value);

      if (focusedIdx >= 0) {
        optionList.set(focusedIdx);
      }
    };
    const shadowRoot = el.shadowRoot;

    if (shadowRoot) {
      shadowRoot.addEventListener('pointermove', handleShadowOptionPointerMove as EventListener);
    }

    const createListboxListeners = (listEl: HTMLElement): (() => void) => {
      const handleActivate = (event: Event) => {
        const target = event.target;

        if (!(target instanceof Element)) return;

        const createRow = target.closest<HTMLElement>('.no-results-create');

        if (createRow) {
          event.preventDefault();
          event.stopPropagation();
          createOption(query.value, event);

          return;
        }

        const optionEl = target.closest<HTMLElement>('.option');

        if (!optionEl) return;

        event.preventDefault();
        event.stopPropagation();

        const option = resolveOptionFromElement(optionEl);

        if (!option) return;

        selectOption(option, event);
      };

      const handlePointerMove = (event: PointerEvent) => {
        const target = event.target;

        if (!(target instanceof Element)) return;

        const optionEl = target.closest<HTMLElement>('.option');

        if (!optionEl) return;

        const option = resolveOptionFromElement(optionEl);

        if (!option) return;

        const focusedIdx = filteredOptions.value.findIndex((candidate) => candidate.value === option.value);

        if (focusedIdx >= 0) {
          optionList.set(focusedIdx);
        }
      };

      listEl.addEventListener('click', handleActivate);
      listEl.addEventListener('pointermove', handlePointerMove);

      return () => {
        listEl.removeEventListener('click', handleActivate);
        listEl.removeEventListener('pointermove', handlePointerMove);
      };
    };

    let stopListboxListeners: (() => void) | null = null;
    let listboxListenersTarget: HTMLElement | null = null;

    const setListboxElement = (el: HTMLElement | null): void => {
      listboxEl = el;

      if (listboxListenersTarget === el) return;

      stopListboxListeners?.();
      stopListboxListeners = null;
      listboxListenersTarget = null;

      if (!el) return;

      stopListboxListeners = createListboxListeners(el);
      listboxListenersTarget = el;
    };

    const ensureListboxListeners = (): void => {
      if (!listboxEl) return;

      if (listboxListenersTarget === listboxEl && stopListboxListeners) return;

      stopListboxListeners?.();
      stopListboxListeners = createListboxListeners(listboxEl);
      listboxListenersTarget = listboxEl;
    };

    effect(() => {
      ensureListboxListeners();

      if (isOpen.value) positioner.update();
    });

    // Once sg-input is in the DOM, grab its inner <input> from its shadow root
    // and attach all combobox-specific ARIA + event handlers imperatively.
    // MUST be registered before the ARIA effects below so inputEl is set first
    // when bitInputRef fires (effects run in registration order).
    onElement(bitInputRef, (bitInputEl) => {
      fieldEl = bitInputEl;

      const rawInput = bitInputEl.shadowRoot?.querySelector<HTMLInputElement>('input') ?? null;

      if (!rawInput) return;

      inputEl = rawInput;

      rawInput.setAttribute('role', 'combobox');
      rawInput.setAttribute('autocomplete', 'off');
      rawInput.setAttribute('aria-autocomplete', 'list');
      rawInput.setAttribute('aria-haspopup', 'listbox');
      rawInput.setAttribute('spellcheck', 'false');
      rawInput.setAttribute('aria-controls', `${comboId}-listbox`);

      const handleInputClick = (): void => {
        if (!isOpen.value) openPopup(true, 'click');

        focusLiveInput();
      };

      rawInput.addEventListener('input', handleInput as EventListener);
      rawInput.addEventListener('keydown', handleKeydown as EventListener);
      rawInput.addEventListener('focus', handleFocus);
      rawInput.addEventListener('click', handleInputClick);

      return () => {
        inputEl = null;
        fieldEl = null;
        rawInput.removeEventListener('input', handleInput as EventListener);
        rawInput.removeEventListener('keydown', handleKeydown as EventListener);
        rawInput.removeEventListener('focus', handleFocus);
        rawInput.removeEventListener('click', handleInputClick);
      };
    });

    // Reactively sync combobox-specific ARIA attrs that sg-input doesn't manage.
    // Uses bitInputRef (a signal) as the gate so the effect re-runs when the
    // inner input mounts — inputEl is a plain variable and would not trigger re-runs.
    effect(() => {
      if (!bitInputRef.value) return;

      const el = inputEl;

      if (!el) return;

      el.setAttribute('aria-expanded', String(isOpen.value));

      if (isDisabled.value) {
        el.setAttribute('aria-disabled', 'true');
      } else {
        el.removeAttribute('aria-disabled');
      }
    });

    // Reactively sync the query signal into the raw input value.
    effect(() => {
      if (!bitInputRef.value) return;

      const el = inputEl;

      if (!el) return;

      if (el.value !== query.value) el.value = query.value;
    });

    onCleanup(() => {
      shadowRoot?.removeEventListener('pointermove', handleShadowOptionPointerMove as EventListener);
      stopListboxListeners?.();
      stopListboxListeners = null;
      listboxListenersTarget = null;
      stopObserving();
    });

    const inputColor = () => props.color?.value ?? undefined;
    const inputSize = () => fCtxProps.size?.value ?? undefined;
    const inputVariant = () => fCtxProps.variant?.value ?? undefined;
    const inputRounded = () => props.rounded?.value ?? undefined;
    const inputFullwidth = () => (props.fullwidth.value ? true : undefined);

    return html`
      <slot></slot>
      <sg-input
        class="trigger"
        ref=${bitInputRef}
        :label="${() => props.label.value ?? ''}"
        :placeholder="${inputPlaceholder}"
        :label-placement="${() => props['label-placement'].value ?? 'inset'}"
        :color="${inputColor}"
        :size="${inputSize}"
        :variant="${inputVariant}"
        :rounded="${inputRounded}"
        :helper="${() => props.helper.value ?? ''}"
        :error="${() => props.error.value ?? ''}"
        ?disabled="${isDisabled}"
        ?required="${() => false}"
        ?fullwidth="${inputFullwidth}"
        :name="${() => props.name.value ?? ''}"
        @click="${(e: MouseEvent) => {
          fieldPress.handleClick(e);
        }}"
        part="wrapper">
        <div slot="prefix" class="chips-row">
          <!-- Keep chip list diffing isolated so input node identity stays stable. -->
          <span class="chips-list">
            ${() =>
              (isMultiple() ? selectedValues.value : []).map(
                (value) => html`
                  <sg-chip
                    value=${value}
                    label=${allOptions.value.find((option) => option.value === value)?.label ?? value}
                    mode="removable"
                    variant="flat"
                    size="sm"
                    color="${props.color}"
                    @remove=${removeChip}>
                    ${allOptions.value.find((option) => option.value === value)?.label ?? value}
                  </sg-chip>
                `,
              )}
          </span>
        </div>
        <span slot="suffix" class="combobox-suffix" aria-hidden="true">
          <button
            class="clear-btn"
            part="clear-btn"
            type="button"
            aria-label="Clear"
            tabindex="-1"
            ?hidden=${() => !hasValue()}
            @click="${clearValue}">
            <sg-icon name="x" size="12" stroke-width="2.5" aria-hidden="true"></sg-icon>
          </button>
          <span class="combobox-suffix-end">
            <span class="loader"></span>
            <span class="chevron">
              <sg-icon name="chevron-down" size="14" stroke-width="2" aria-hidden="true"></sg-icon>
            </span>
          </span>
        </span>
      </sg-input>
      <div
        class="dropdown"
        part="dropdown"
        id="${() => `${comboId}-dropdown`}"
        ?data-open=${() => isOpen.value}
        ref=${(el: HTMLElement | null) => {
          dropdownEl = el;
        }}>
        <div
          role="listbox"
          id="${() => `${comboId}-listbox`}"
          :style="${() =>
            isOpen.value && filteredOptions.value.length > 0 ? `height:${filteredOptions.value.length * 36}px;` : ''}"
          aria-label="${() => props.label.value || props.placeholder.value || 'Options'}"
          ref=${(el: HTMLElement | null) => {
            setListboxElement(el);
          }}>
          ${() => {
            if (!isOpen.value) return '';

            if (isLoading()) {
              return html`<div class="dropdown-loading">Loading...</div>`;
            }

            if (filteredOptions.value.length === 0) {
              if (creatableLabel.value) {
                return html`<button
                  type="button"
                  class="no-results-create"
                  ?data-focused=${() => focusedIndex.value === -1}>
                  ${creatableLabel.value}
                </button>`;
              }

              return html`<div class="no-results" role="presentation">No results found</div>`;
            }

            return filteredOptions.value.map((option, index) => {
              return html`<div
                class="option"
                role="option"
                id="${`${comboId}-opt-${index}`}"
                data-option-index="${index}"
                data-option-value="${option.value}"
                :aria-selected="${() =>
                  String(
                    isMultiple() ? selectedValues.value.includes(option.value) : selectedValue.value === option.value,
                  )}"
                aria-disabled="${String(option.disabled)}"
                style="${`position:absolute;top:0;left:0;right:0;transform:translateY(${index * 36}px);`}"
                ?data-focused=${() => focusedIndex.value === index}
                ?data-selected=${() =>
                  isMultiple() ? selectedValues.value.includes(option.value) : selectedValue.value === option.value}
                ?data-disabled=${option.disabled}>
                <span>${option.label}</span>
                <span class="option-check" aria-hidden="true"
                  ><sg-icon name="check" size="14" stroke-width="2.5" aria-hidden="true"></sg-icon
                ></span>
              </div>`;
            });
          }}
        </div>
      </div>
    `;
  },
  shadow: { delegatesFocus: true },
  styles: [reducedMotionMixin, componentStyles],
}) as unknown as AddEventListeners<SgComboboxEvents>;
