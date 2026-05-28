import {
  computed,
  define,
  defineField,
  html,
  inject,
  onCleanup,
  prop,
  signal,
  watch,
  onMounted,
} from '@vielzeug/craftit';

import type { DropdownCloseReason, OverlayOpenDetail, OverlayOpenReason } from '../../headless';
import type { ChoiceChangeDetail } from '../../headless';
import type { SelectableFieldProps } from '../../shared/config';

import '../../feedback/chip/chip';
import '../../content/icon/icon';
import type { VisualVariant } from '../../types';

import { createComposite, toAbortSignal } from '../../headless';
import {
  FIELD_SIZE_PRESET,
  disablableBundle,
  loadableBundle,
  roundableBundle,
  sizableBundle,
  themableBundle,
} from '../../shared/config';
import {
  coarsePointerMixin,
  colorThemeMixin,
  disabledLoadingMixin,
  forcedColorsFocusMixin,
  reducedMotionMixin,
  roundedVariantMixin,
  sizeVariantMixin,
} from '../../styles';
import { connectFormField } from '../shared/connect-form-field';
import { FORM_CTX, useFormContext } from '../shared/form-context';
import componentStyles from './select.css?inline';

// ── Types ─────────────────────────────────────────────────────────────

type OptionItem = {
  disabled: boolean;
  group?: string;
  label: string;
  value: string;
};

export type BitSelectOptionInput = {
  disabled?: boolean;
  group?: string;
  label?: string;
  value: string;
};

type FlatRow =
  | {
      idx: number;
      opt: OptionItem;
      type: 'option';
    }
  | {
      label: string;
      type: 'group';
    };

// ── Styles ─────────────────────────────────────────────────────────────

// ── Component Props ─────────────────────────────────────────────────────────────

/** Select component properties */

export type BitSelectEvents = {
  change: ChoiceChangeDetail;
  close: { reason: DropdownCloseReason };
  open: OverlayOpenDetail;
};

export type BitSelectProps = SelectableFieldProps<Exclude<VisualVariant, 'glass' | 'text' | 'frost'>> & {
  /** Show loading state in dropdown */
  loading?: boolean;
  /** Allow selecting multiple options */
  multiple?: boolean;
  /** JS options array (alternative to slotted <option> elements) */
  options?: BitSelectOptionInput[];
  /** Mark the field as required */
  required?: boolean;
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
 * @fires change - Fired when selection changes. detail: { value: string, values: string[], labels: string[], originalEvent?: Event }
 * @fires open - Fired when the dropdown opens. detail: { reason: 'trigger' | 'programmatic' }
 * @fires close - Fired when the dropdown closes. detail: { reason: 'escape' | 'outsideClick' | 'programmatic' | 'trigger' }
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
export const SELECT_TAG = define<BitSelectProps, BitSelectEvents>('bit-select', {
  formAssociated: true,
  props: {
    ...themableBundle,
    ...sizableBundle,
    ...disablableBundle,
    ...loadableBundle,
    ...roundableBundle,
    error: prop.string(),
    fullwidth: prop.bool(false),
    helper: prop.string(),
    label: prop.string(),
    'label-placement': prop.oneOf(['inset', 'outside'] as const, 'inset'),
    multiple: prop.bool(false),
    name: prop.string(),
    options: prop.json(undefined as BitSelectOptionInput[] | undefined),
    placeholder: prop.string(),
    required: prop.bool(false),
    value: prop.string(),
    variant: prop.string<'flat' | 'solid' | 'bordered' | 'outline' | 'ghost'>(),
  },
  setup(props, { bind, el, emit, slots }) {
    const shadowRoot = el.shadowRoot;
    // ────────────────────────────────────────────────────────────────
    // State & Context
    // ────────────────────────────────────────────────────────────────

    const slottedOptions = signal<OptionItem[]>([]);
    const isLoading = computed(() => Boolean(props.loading.value));

    // Merged options: explicit prop value overrides slotted options
    function normalizeOption(option: BitSelectOptionInput): OptionItem {
      return {
        disabled: Boolean(option.disabled),
        group: option.group,
        label: option.label ?? option.value,
        value: option.value,
      };
    }

    const options = computed(() => {
      const explicitOptions = props.options.value;

      return Array.isArray(explicitOptions) ? explicitOptions.map(normalizeOption) : slottedOptions.value;
    });
    const formCtx = inject(FORM_CTX);
    const fCtxProps = useFormContext(bind, props, formCtx);

    let triggerEl: HTMLElement | null = null;
    let dropdownEl: HTMLElement | null = null;

    const abortSignal = toAbortSignal(onCleanup);
    const { choice, optionList } = createComposite<OptionItem>({
      field: {
        disabled: fCtxProps.disabled,
        error: props.error,
        helper: props.helper,
        label: props.label,
        labelPlacement: props['label-placement'],
        multiple: props.multiple,
        prefix: 'select',
        validateOn: formCtx?.validateOn,
        value: props.value,
      },
      listFactory: (c) => ({
        getBoundary: () => el,
        getFocusedOptionElement: () => dropdownEl?.querySelector<HTMLElement>('[data-focused]') ?? null,
        getItems: () => options.value,
        getPanel: () => dropdownEl,
        getReference: () => triggerEl,
        getTrigger: () => triggerEl,
        isDisabled: () => c.disabled.value,
        manageAriaExpanded: false,
        onClose: (reason) => {
          emit('close', { reason });
          c.triggerValidation('blur');
        },
        onOpen: (reason) => emit('open', { reason }),
      }),
      signal: abortSignal,
    });

    const assistiveText = choice.assistive;
    const { triggerValidation } = choice;
    const selectedValues = choice.selectedValues;
    const isDisabled = choice.disabled;

    connectFormField(choice, defineField, choice.formValue, (v) => v);

    const { fieldId: selectId } = choice;
    const { id: labelInsetId } = choice.label.inset;
    const { id: labelOutsideId } = choice.label.outside;
    const listboxId = `listbox-${selectId}`;
    const { focusedIndex, isOpen } = optionList;

    // Sync host attributes for CSS hooks
    bind({
      attr: {
        'has-error': () => (props.error.value ? true : undefined),
        open: () => (isOpen.value ? true : undefined),
        size: fCtxProps.size,
        variant: fCtxProps.variant,
      },
    });

    // ────────────────────────────────────────────────────────────────
    // Option Reading from Slot
    // ────────────────────────────────────────────────────────────────

    function readOptions() {
      const slot = shadowRoot?.querySelector<HTMLSlotElement>('slot');

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

    const displayLabel = computed(() => {
      if (selectedValues.value.length === 0) return '';

      if (props.multiple.value && selectedValues.value.length > 1) {
        return `${selectedValues.value.length} selected`;
      }

      const first = selectedValues.value[0];

      return options.value.find((o) => o.value === first)?.label ?? first;
    });
    const selectedChipItems = computed(() => {
      if (!props.multiple.value) return [];

      return selectedValues.value.map((value) => ({
        label: options.value.find((o) => o.value === value)?.label ?? value,
        value,
      }));
    });
    const showChips = computed(() => props.multiple.value && selectedValues.value.length > 0);
    const triggerText = computed(() => displayLabel.value || props.placeholder.value || '');
    const hasLabel = computed(() => !!props.label.value);
    const { insetLabelHidden, outsideLabelHidden } = {
      insetLabelHidden: () => !choice.label.inset.show.value,
      outsideLabelHidden: () => !choice.label.outside.show.value,
    };

    function buildFlatList(opts: OptionItem[]): FlatRow[] {
      const flat: FlatRow[] = [];
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

    const flatRows = computed(() => buildFlatList(options.value));

    function getLabelForValue(value: string): string {
      return options.value.find((option) => option.value === value)?.label ?? value;
    }

    function emitChange(originalEvent?: Event): void {
      const values = selectedValues.value;
      const labels = values.map((value) => getLabelForValue(value));

      emit('change', { labels, originalEvent, values });
    }

    function removeChip(event: Event): void {
      event.stopPropagation();

      const value = (event as CustomEvent<{ value?: string }>).detail?.value;

      if (value === undefined) return;

      choice.removeValue(value);
      emitChange(event);
      triggerValidation('change');
    }

    function openPopup(reason: OverlayOpenReason = 'programmatic') {
      optionList.open(reason);

      requestAnimationFrame(() => {
        const selectedIndex =
          selectedValues.value.length > 0
            ? options.value.findIndex((option) => option.value === selectedValues.value[0])
            : -1;

        if (selectedIndex >= 0) {
          optionList.set(selectedIndex);

          return;
        }

        optionList.first();
      });
    }

    // Selection

    function selectOption(opt: OptionItem, e?: Event) {
      if (opt.disabled) return;

      if (props.multiple.value) {
        choice.toggleValue(opt.value);
      } else {
        choice.selectValue(opt.value);
        optionList.close();
      }

      emitChange(e);
      triggerValidation('change');
    }

    // Keyboard navigation

    function handleTriggerKeydown(e: KeyboardEvent) {
      if (isDisabled.value) return;

      // Let optionList handle arrow key navigation
      if (optionList.handleKeydown(e)) return;

      switch (e.key) {
        case ' ':
        case 'Enter':
          e.preventDefault();

          if (isOpen.value) {
            const idx = focusedIndex.value;
            const opts = options.value;

            if (idx >= 0 && idx < opts.length) selectOption(opts[idx], e);
          } else {
            openPopup('keyboard');
          }

          break;
        case 'Tab':
          optionList.close();
          break;
      }
    }

    const tabIndexAttr = () => (isDisabled.value ? '-1' : '0');
    const triggerValueClass = () => `trigger-value ${displayLabel.value ? '' : 'trigger-placeholder'}`;
    const helperStyle = () => (assistiveText.value.errorText ? 'color: var(--color-error);' : '');

    watch(slots.elements(), () => readOptions(), { immediate: true });

    onMounted(() => {
      let onTriggerClick: ((event: MouseEvent) => void) | null = null;
      let onTriggerKeydown: ((event: KeyboardEvent) => void) | null = null;

      if (triggerEl) {
        onTriggerClick = (event: MouseEvent) => {
          event.stopPropagation();

          if (isDisabled.value) return;

          if (isOpen.value) optionList.close('trigger');
          else openPopup('click');
        };
        onTriggerKeydown = (event: KeyboardEvent) => {
          handleTriggerKeydown(event);
        };

        triggerEl.addEventListener('click', onTriggerClick);
        triggerEl.addEventListener('keydown', onTriggerKeydown);
      }

      return () => {
        if (triggerEl && onTriggerClick) triggerEl.removeEventListener('click', onTriggerClick);

        if (triggerEl && onTriggerKeydown) triggerEl.removeEventListener('keydown', onTriggerKeydown);
      };
    });

    return html`<slot style="display:none"></slot>
      <div class="select-wrapper">
        <label class="label-outside" id="${labelOutsideId}" ?hidden="${outsideLabelHidden}">${props.label}</label>
        <div
          class="field"
          ref="${(el: HTMLElement) => {
            triggerEl = el;
          }}"
          role="combobox"
          tabindex="${tabIndexAttr}"
          aria-controls="${listboxId}"
          aria-haspopup="listbox"
          :aria-disabled="${() => (isDisabled.value ? 'true' : null)}"
          :aria-expanded="${() => String(isOpen.value)}"
          :aria-invalid="${() => (props.error.value ? 'true' : null)}"
          :aria-labelledby="${() => (hasLabel.value ? `${labelOutsideId} ${labelInsetId}` : null)}">
          <label class="label-inset" id="${labelInsetId}" ?hidden="${insetLabelHidden}">${props.label}</label>
          <div class="trigger-row">
            <div class="chips-row" ?hidden="${() => !showChips.value}">
              ${() =>
                selectedChipItems.value.map(
                  (item) => html`
                    <bit-chip
                      value="${item.value}"
                      label="${item.label}"
                      mode="removable"
                      variant="flat"
                      size="sm"
                      color="${props.color}"
                      @remove="${removeChip}">
                      ${item.label}
                    </bit-chip>
                  `,
                )}
            </div>
            <span class="${triggerValueClass}" ?hidden="${showChips}">${triggerText}</span>
          </div>
          <span class="trigger-icon" aria-hidden="true">
            <bit-icon name="chevron-down" size="14" stroke-width="2" aria-hidden="true"></bit-icon>
            <span class="loader" aria-label="Loading"></span>
          </span>
        </div>
        <div
          class="helper-text"
          aria-live="polite"
          ?hidden="${() => !assistiveText.value.errorText && !assistiveText.value.helperText}"
          style="${helperStyle}">
          ${() => assistiveText.value.errorText || assistiveText.value.helperText}
        </div>
      </div>
      <div
        class="dropdown"
        ?data-open="${isOpen}"
        role="listbox"
        id="${listboxId}"
        aria-label="Options"
        ref="${(el: HTMLElement) => {
          dropdownEl = el;
        }}">
        <div class="dropdown-loading" ?hidden="${() => !isLoading.value}">Loading…</div>
        <div class="dropdown-empty" ?hidden="${() => isLoading.value || options.value.length > 0}">No options</div>
        <div class="options-list" ?hidden="${() => isLoading.value || options.value.length === 0}">
          ${() =>
            flatRows.value.map((row) =>
              row.type === 'group'
                ? html`<div class="optgroup-label" role="presentation">${row.label}</div>`
                : html`<div
                    class="option"
                    role="option"
                    id="${`${selectId}-opt-${row.idx}`}"
                    data-option-index="${String(row.idx)}"
                    data-option-value="${row.opt.value}"
                    aria-selected="${() => String(selectedValues.value.includes(row.opt.value))}"
                    aria-disabled="${() => String(row.opt.disabled)}"
                    ?data-focused="${() => focusedIndex.value === row.idx}"
                    ?data-selected="${() => selectedValues.value.includes(row.opt.value)}"
                    ?data-disabled="${() => row.opt.disabled}"
                    @click="${(e: MouseEvent) => {
                      e.stopPropagation();
                      selectOption(row.opt, e);
                    }}"
                    @pointerenter="${() => {
                      optionList.set(row.idx);
                    }}">
                    <span>${row.opt.label}</span>
                    <span class="option-check" aria-hidden="true">
                      <bit-icon name="check" size="14" stroke-width="2.5" aria-hidden="true"></bit-icon>
                    </span>
                  </div>`,
            )}
        </div>
      </div>`;
  },
  shadow: { delegatesFocus: true },
  styles: [
    sizeVariantMixin(FIELD_SIZE_PRESET),
    colorThemeMixin,
    coarsePointerMixin,
    reducedMotionMixin,
    roundedVariantMixin,
    disabledLoadingMixin(),
    forcedColorsFocusMixin('.field'),
    componentStyles,
  ],
});
