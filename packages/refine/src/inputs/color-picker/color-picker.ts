import { bind, createId, define, getHost, html, onCleanup, prop, useEmit, useField } from '@vielzeug/ore';
import { computed } from '@vielzeug/ripple';
import {
  type ChoiceChangeDetail,
  createErrorHelperState,
  createListControl,
  lifecycleSignal,
  syncedSignal,
} from '../../core';
import { disablableBundle, sizableBundle } from '../../shared';
import { sizeVariantMixin } from '../../styles';
import type { ComponentSize } from '../../types';
import { defineFieldValue } from '../shared/native-field-event';
import { renderHelperRegion } from '../shared/templates';
import componentStyles from './color-picker.css?inline';

/** One selectable color in a `ore-color-picker` palette. */
export type OreColorPickerOption = Readonly<{
  /** CSS color painted as the swatch (any valid CSS color value). */
  readonly color: string;
  /** Disable this swatch: rendered but not selectable. */
  readonly disabled?: boolean;
  /** Accessible name; falls back to `value`, then `color`. */
  readonly label?: string;
  /** Value reported on selection; defaults to `color`. */
  readonly value?: string;
}>;

/** Color picker props */
export type OreColorPickerProps = {
  /** Disable interaction */
  disabled?: boolean;
  /** Error message: marks the field as invalid (fallback when the `error` slot is empty) */
  error?: string;
  /** Helper text displayed below the swatches (fallback when the `helper` slot is empty) */
  helper?: string;
  /** Accessible group label, shown as the fieldset legend */
  label?: string;
  /** Form field name */
  name?: string;
  /** Selectable colors */
  options?: OreColorPickerOption[];
  /** Component size (swatch diameter) */
  size?: ComponentSize;
  /** Value of the selected option */
  value?: string;
};

/** Events emitted by the color-picker component */
export type OreColorPickerEvents = {
  /** Emitted when a color is selected */
  change: ChoiceChangeDetail;
};

const optionValue = (option: OreColorPickerOption): string => option.value ?? option.color;
const optionLabel = (option: OreColorPickerOption): string => option.label ?? optionValue(option);

/**
 * A palette of color swatches that allows users to pick a single color, like a
 * product paint configurator. Renders as a radiogroup: arrow keys move through
 * the swatches, and selection is form-associated.
 *
 * @element ore-color-picker
 *
 * @attr {string} value - Value of the selected option
 * @attr {string} label - Group label (also the accessible name)
 * @attr {string} name - Form field name
 * @attr {boolean} disabled - Disabled state
 * @attr {string} size - 'sm' | 'md' | 'lg'
 * @attr {string} helper - Helper text below the swatches
 * @attr {string} error - Error message below the swatches
 *
 * @fires change - Emitted when a color is selected. detail: { values: string[], labels: string[], originalEvent?: Event }
 *
 * @cssprop --color-picker-swatch-size - Swatch diameter (defaults to the size preset)
 * @cssprop --color-picker-swatch-radius - Swatch corner radius (defaults to a circle)
 * @cssprop --color-picker-gap - Gap between swatches
 *
 * @part swatches - Swatch container.
 * @part swatch - Swatch button element.
 * @part legend - Group label.
 * @part helper-text - The helper/error text element.
 * @example
 * ```html
 * <ore-color-picker
 *   label="Paint"
 *   value="midnight"
 *   options='[{ "value": "midnight", "color": "#19202b", "label": "Midnight Black" }, { "value": "pearl", "color": "#f2efe9", "label": "Pearl White" }]'>
 * </ore-color-picker>
 * ```
 */
export const COLOR_PICKER_TAG = 'ore-color-picker' as const;
define<OreColorPickerProps>(COLOR_PICKER_TAG, {
  formAssociated: true,
  props: {
    ...sizableBundle,
    ...disablableBundle,
    error: prop.string(),
    helper: prop.string(),
    label: prop.string(),
    name: prop.string(),
    options: prop.json<OreColorPickerOption[] | undefined>(undefined),
    // Not auto-reflected (`reflect: false`): the derived, interaction-updated
    // selection (`selectedValue`) is the single writer for this attribute via
    // `bind()` below; letting `prop.string()`'s own default reflection also
    // write the raw incoming value would leave two effects racing to set the
    // same attribute from different sources.
    value: { ...prop.string(), reflect: false },
  },
  setup(props) {
    const el = getHost();
    const emit = useEmit<OreColorPickerEvents>();

    const options = computed(() => props.options.value ?? []);
    const enabledOptions = computed(() => options.value.filter((option) => !option.disabled));

    // The selection is a local writable signal kept in sync with the `value`
    // prop by the shared helper, so an external change wins over an earlier
    // interaction. The bind below mirrors the selection back into the
    // attribute; the resulting prop change re-enters the sync with the value
    // the selection already holds, which is a no-op write.
    const selectedValue = syncedSignal(props.value, lifecycleSignal(onCleanup));

    const isDisabled = computed(() => Boolean(props.disabled.value));

    const assistiveId = createId('helper');
    const assistive = createErrorHelperState({ error: props.error, helper: props.helper });
    const errorText = computed(() => assistive.value.errorText);
    const helperText = computed(() => assistive.value.helperText);
    const ariaDescribedBy = computed(() => (errorText.value || helperText.value ? assistiveId : null));

    defineFieldValue(
      el,
      () => selectedValue.value ?? '',
      (value) => {
        el.setAttribute('value', value);
      },
    );

    useField({
      disabled: isDisabled,
      value: computed(() => selectedValue.value ?? ''),
    });

    const getSwatchButtons = () => [...(el.shadowRoot?.querySelectorAll<HTMLButtonElement>('[data-swatch]') ?? [])];

    const getEnabledButtons = (): HTMLButtonElement[] => {
      const enabled = new Set(enabledOptions.value.map(optionValue));

      return getSwatchButtons().filter((button) => !button.disabled && enabled.has(button.dataset.swatch ?? ''));
    };

    const listControl = createListControl<HTMLButtonElement>({
      getItems: getEnabledButtons,
      keys: { next: ['ArrowDown', 'ArrowRight'], prev: ['ArrowUp', 'ArrowLeft'] },
      loop: true,
      onNavigate: ({ event, item }) => {
        item.focus();
        select(item.dataset.swatch ?? '', event);
      },
      signal: lifecycleSignal(onCleanup),
    });

    // The roving tab stop. A radiogroup must always expose exactly one tab stop, and a native radio
    // group hands it to the first enabled radio when nothing is checked. Matching that matters here
    // because `value` is optional and may also name an option that does not exist (or a disabled
    // one): without a fallback every swatch would render tabindex="-1" and the control would be
    // unreachable by keyboard.
    const tabStopValue = computed(() => {
      const selected = selectedValue.value;

      if (selected && enabledOptions.value.some((option) => optionValue(option) === selected)) return selected;

      return enabledOptions.value[0] ? optionValue(enabledOptions.value[0]) : undefined;
    });

    function select(value: string, originalEvent?: Event): void {
      if (isDisabled.value) return;
      if (!options.value.some((option) => !option.disabled && optionValue(option) === value)) return;
      if (value === selectedValue.value) return;

      selectedValue.value = value;

      const option = options.value.find((candidate) => optionValue(candidate) === value);
      const labels = option ? [optionLabel(option)] : [];

      emit('change', { labels, originalEvent, values: [value] });
    }

    function handleKeydown(event: KeyboardEvent, value: string): void {
      if (event.defaultPrevented) return;

      const buttons = getEnabledButtons();
      const focused = buttons.findIndex((button) => button.dataset.swatch === value);

      if (focused === -1) return;

      listControl.set(focused);
      listControl.handleKeydown(event);
    }

    bind({ attr: { size: props.size, value: () => selectedValue.value ?? null } });

    const legendId = createId('color-picker-legend');

    return html`
      <fieldset
        part="root"
        aria-describedby="${ariaDescribedBy}"
        aria-disabled="${() => (isDisabled.value ? 'true' : null)}"
        aria-invalid="${() => (errorText.value ? 'true' : null)}"
        aria-label="${() => (props.label.value ? null : 'Color picker')}"
        role="radiogroup">
        <legend id="${legendId}" part="legend" ?hidden=${() => !props.label.value}>${props.label}</legend>
        <div class="swatches" part="swatches">
          ${() =>
            options.value.map(
              (option) => html`
                <button
                  class="swatch"
                  part="swatch"
                  type="button"
                  role="radio"
                  aria-checked="${() => String(optionValue(option) === selectedValue.value)}"
                  aria-label="${() => optionLabel(option)}"
                  data-swatch="${optionValue(option)}"
                  style=${() => `--_swatch-color: ${option.color}`}
                  tabindex="${() => (optionValue(option) === tabStopValue.value && !isDisabled.value ? '0' : '-1')}"
                  disabled="${() => (isDisabled.value || option.disabled ? true : null)}"
                  title="${() => optionLabel(option)}"
                  @click="${(event: Event) => select(optionValue(option), event)}"
                  @keydown="${(event: KeyboardEvent) => handleKeydown(event, optionValue(option))}"></button>
              `,
            )}
        </div>
        ${renderHelperRegion(assistiveId, errorText, helperText)}
      </fieldset>
    `;
  },
  // No touchTargetMixin: a swatch is its own target and its diameter is the
  // visual, so the 44px button target (and the coarse-pointer promotion that
  // would shrink --_size below the desktop tiers) does not apply. The tiers
  // below are the swatch diameters; `sm` sits on the 24px AA floor, `lg` on the
  // full 44px target.
  styles: [
    sizeVariantMixin({
      lg: { size: 'var(--size-11)' },
      md: { size: 'var(--size-8)' },
      sm: { size: 'var(--size-6)' },
    }),
    componentStyles,
  ],
});
