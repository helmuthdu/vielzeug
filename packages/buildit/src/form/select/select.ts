import {
  aria,
  computed,
  createFormIds,
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
import { createListNavigation, createOverlayControl } from '@vielzeug/craftit/labs';

import type { VisualVariant } from '../../types';

import '../../feedback/chip/chip';
import type { SelectableFieldProps } from '../shared/base-props';

import { checkIcon, chevronDownIcon } from '../../icons';
import { disabledLoadingMixin, forcedColorsFocusMixin, formFieldMixins, sizeVariantMixin } from '../../styles';
import { FORM_CTX } from '../form/form';
import { FIELD_SIZE_PRESET } from '../shared/design-presets';
import { createDropdownPositioner, mountLabelSyncStandalone } from '../shared/dom-sync';
import {
  type ChoiceChangeDetail,
  computeControlledCsvState,
  createChoiceChangeDetail,
  resolveMergedAssistiveText,
} from '../shared/utils';
import { createFieldValidation } from '../shared/validation';
import componentStyles from './select.css?inline';

// ============================================
// Types
// ============================================

type OptionItem = {
  disabled: boolean;
  group?: string;
  label: string;
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

// ============================================
// Styles
// ============================================

// ============================================
// Component Props
// ============================================

/** Select component properties */

export type BitSelectEvents = {
  change: ChoiceChangeDetail;
};

export type BitSelectProps = SelectableFieldProps<Exclude<VisualVariant, 'glass' | 'text' | 'frost'>> & {
  /** Show loading state in dropdown */
  loading?: boolean;
  /** Allow selecting multiple options */
  multiple?: boolean;
  /** JS options array (alternative to slotted <option> elements) */
  options?: OptionItem[];
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
export const SELECT_TAG = defineComponent<BitSelectProps, BitSelectEvents>({
  formAssociated: true,
  props: {
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
    options: typed<OptionItem[] | undefined>(undefined, { reflect: false }),
    placeholder: { default: '' },
    required: { default: false },
    rounded: { default: undefined },
    size: { default: undefined },
    value: { default: '' },
    variant: { default: undefined },
  },
  setup({ emit, host, props }) {
    // ============================================
    // State
    // ============================================
    const selectedValues = signal<string[]>([]);
    const slottedOptions = signal<OptionItem[]>([]);
    const isOpen = signal(false);
    const focusedIndex = signal(-1);
    const isLoading = computed(() => Boolean(props.loading.value));
    // Merged options: explicit prop value overrides slotted options.
    const options = computed(() => {
      const propOptions = props.options.value;

      return propOptions !== undefined ? propOptions : slottedOptions.value;
    });
    const formCtx = inject(FORM_CTX, undefined);
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

    const { triggerValidation } = createFieldValidation(formCtx, fd);

    // Sync host attributes from component state for CSS hooks.
    watch(
      isOpen,
      (value) => {
        host.toggleAttribute('open', ((value) => Boolean(value))(value));
      },
      { immediate: true },
    );
    watch(
      props.error,
      (value) => {
        host.toggleAttribute('has-error', ((value) => Boolean(value))(value));
      },
      { immediate: true },
    );

    // Accessibility IDs
    const { fieldId: selectId, labelId } = createFormIds('select', props.name.value);
    const listboxId = `listbox-${selectId}`;
    // DOM refs
    let triggerEl: HTMLElement | null = null;
    let dropdownEl: HTMLElement | null = null;
    // Refs for dynamic content
    const labelOutsideRef = ref<HTMLSpanElement>();
    const labelInsetRef = ref<HTMLSpanElement>();

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
      selectedValues.value = computeControlledCsvState(props.value.value).values;
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
    const selectedChipItems = computed(() => {
      if (!props.multiple.value) return [];

      return selectedValues.value.map((value) => ({
        label: options.value.find((o) => o.value === value)?.label ?? value,
        value,
      }));
    });
    const assistiveText = computed(() => resolveMergedAssistiveText(props.error.value, props.helper.value));
    const showChips = computed(() => props.multiple.value && selectedValues.value.length > 0);
    const triggerText = computed(() => displayLabel.value || props.placeholder.value || '');
    const hasLabel = computed(() => !!props.label.value);

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

      emit('change', createChoiceChangeDetail(values, labels, originalEvent));
    }

    function removeChip(event: Event): void {
      event.stopPropagation();

      const value = (event as CustomEvent<{ value?: string }>).detail?.value;

      if (value === undefined) return;

      selectedValues.value = selectedValues.value.filter((v) => v !== value);
      emitChange(event);
      triggerValidation('change');
    }

    // ============================================
    // Dropdown positioning (shared positioner)
    // ============================================
    const positioner = createDropdownPositioner(
      () => triggerEl,
      () => dropdownEl,
    );

    const listNavigation = createListNavigation<OptionItem>({
      getIndex: () => focusedIndex.value,
      getItems: () => options.value,
      isItemDisabled: (option) => option.disabled,
      setIndex: (index) => {
        focusedIndex.value = index;
        scrollFocusedIntoView();
      },
    });

    const overlay = createOverlayControl({
      getBoundaryElement: () => host,
      getPanelElement: () => dropdownEl,
      getTriggerElement: () => triggerEl,
      isDisabled: () => Boolean(props.disabled.value),
      isOpen: () => isOpen.value,
      positioner: {
        floating: () => dropdownEl,
        reference: () => triggerEl,
        update: () => positioner.updatePosition(),
      },
      setOpen: (next) => {
        isOpen.value = next;

        if (!next) listNavigation.reset();
      },
    });

    // ============================================
    // Open / Close
    // ============================================
    function open() {
      overlay.open();

      requestAnimationFrame(() => {
        const selectedIndex =
          selectedValues.value.length > 0
            ? options.value.findIndex((option) => option.value === selectedValues.value[0])
            : 0;

        listNavigation.set(selectedIndex >= 0 ? selectedIndex : 0);
      });
    }

    function close(reason: 'escape' | 'programmatic' = 'programmatic') {
      overlay.close({ reason });
      triggerValidation('blur');
    }
    // ============================================
    // Selection
    // ============================================
    function selectOption(opt: OptionItem, e?: Event) {
      if (opt.disabled) return;

      if (props.multiple.value) {
        selectedValues.value = selectedValues.value.includes(opt.value)
          ? selectedValues.value.filter((entry) => entry !== opt.value)
          : [...selectedValues.value, opt.value];
      } else {
        selectedValues.value = [opt.value];
        close();
      }

      emitChange(e);
      triggerValidation('change');
    }
    // ============================================
    // Keyboard navigation
    // ============================================
    function scrollFocusedIntoView() {
      const idx = focusedIndex.value;

      if (idx >= 0) {
        const focusedOptionEl = dropdownEl?.querySelector<HTMLElement>(`#${selectId}-opt-${idx}`);

        focusedOptionEl?.scrollIntoView({ block: 'nearest' });

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
            listNavigation.next();
          }

          break;
        case 'ArrowUp':
          e.preventDefault();

          if (!isOpen.value) {
            open();
          } else {
            listNavigation.prev();
          }

          break;
        case 'End':
          if (isOpen.value) {
            e.preventDefault();
            listNavigation.last();
          }

          break;
        case 'Escape':
          e.preventDefault();
          close('escape');
          break;
        case 'Home':
          if (isOpen.value) {
            e.preventDefault();
            listNavigation.first();
          }

          break;
        case 'Tab':
          close();
          break;
      }
    }
    onMount(() => {
      onSlotChange('default', readOptions);
      // Ensure initial light-DOM <option>/<optgroup> content is available immediately.
      readOptions();
      mountLabelSyncStandalone(labelInsetRef, labelOutsideRef, props);

      if (triggerEl) {
        aria(triggerEl, {
          activedescendant: () => (focusedIndex.value >= 0 ? `${selectId}-opt-${focusedIndex.value}` : null),
          disabled: () => props.disabled.value,
          expanded: () => (isOpen.value ? 'true' : 'false'),
          invalid: () => !!props.error.value,
          labelledby: () => (hasLabel.value ? labelId : null),
        });
      }

      const removeOutsideClick = overlay.bindOutsideClick(document);

      return () => {
        positioner.destroy();
        removeOutsideClick();
      };
    });

    return html`<slot style="display:none"></slot>
      <div class="select-wrapper">
        <label class="label-outside" id="${labelId}" ref=${labelOutsideRef} hidden></label>
        <div
          class="field"
          ref=${(el: HTMLElement) => {
            triggerEl = el;
          }}
          role="combobox"
          tabindex=${() => (props.disabled.value ? '-1' : '0')}
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
            <div class="chips-row" ?hidden=${() => !showChips.value}>
              ${() =>
                selectedChipItems.value.map(
                  (item) => html`
                    <bit-chip
                      value=${item.value}
                      aria-label=${item.label}
                      mode="removable"
                      variant="flat"
                      size="sm"
                      color=${() => props.color.value}
                      @remove=${removeChip}>
                      ${item.label}
                    </bit-chip>
                  `,
                )}
            </div>
            <span
              class="trigger-value ${() => (displayLabel.value ? '' : 'trigger-placeholder')}"
              ?hidden=${() => showChips.value}
              >${() => triggerText.value}</span
            >
          </div>
          <span class="trigger-icon" aria-hidden="true">
            ${chevronDownIcon}
            <span class="loader" aria-label="Loading"></span>
          </span>
        </div>
        <div
          class="helper-text"
          aria-live="polite"
          ?hidden=${() => assistiveText.value.hidden}
          style=${() => (assistiveText.value.isError ? 'color: var(--color-error);' : '')}>
          ${() => assistiveText.value.text}
        </div>
      </div>
      <div
        class="dropdown"
        ?data-open=${() => isOpen.value}
        role="listbox"
        id="${listboxId}"
        aria-label="Options"
        ref=${(el: HTMLElement) => {
          dropdownEl = el;
        }}>
        <div class="dropdown-loading" ?hidden=${() => !isLoading.value}>Loading…</div>
        <div class="dropdown-empty" ?hidden=${() => isLoading.value || options.value.length > 0}>No options</div>
        <div class="options-list" ?hidden=${() => isLoading.value || options.value.length === 0}>
          ${() =>
            flatRows.value.map((row) =>
              row.type === 'group'
                ? html`<div class="optgroup-label" role="presentation">${row.label}</div>`
                : html`<div
                    class="option"
                    role="option"
                    id=${`${selectId}-opt-${row.idx}`}
                    data-option-index=${() => String(row.idx)}
                    data-option-value=${row.opt.value}
                    aria-selected=${() => String(selectedValues.value.includes(row.opt.value))}
                    aria-disabled=${() => String(row.opt.disabled)}
                    ?data-focused=${() => focusedIndex.value === row.idx}
                    ?data-selected=${() => selectedValues.value.includes(row.opt.value)}
                    ?data-disabled=${() => row.opt.disabled}
                    @click=${(e: MouseEvent) => {
                      e.stopPropagation();
                      selectOption(row.opt, e);
                    }}
                    @pointerenter=${() => {
                      focusedIndex.value = row.idx;
                    }}>
                    <span>${row.opt.label}</span>
                    <span class="option-check" aria-hidden="true">${checkIcon}</span>
                  </div>`,
            )}
        </div>
      </div>`;
  },
  shadow: { delegatesFocus: true },
  styles: [
    sizeVariantMixin(FIELD_SIZE_PRESET),
    ...formFieldMixins,
    disabledLoadingMixin(),
    forcedColorsFocusMixin('.field'),
    componentStyles,
  ],
  tag: 'bit-select',
});
