import { createPanGesture } from '@vielzeug/gesture';
import { bind, define, getHost, html, onCleanup, onMounted, prop, provide, useEmit } from '@vielzeug/ore';
import { computed, signal, watch } from '@vielzeug/ripple';
import {
  createChoiceField,
  createListControl,
  elementDirection,
  getLightChildrenByTag,
  lifecycleSignal,
} from '../../core';
import { disablableBundle } from '../../shared';
import { projectFling } from '../../shared/fling';
import { CARD_PICKER_CTX } from './_card-picker-context';
import componentStyles from './card-picker.css?inline';
import { CARD_PICKER_ITEM_TAG } from './card-picker-item';

export { BUTTON_TAG } from '../../inputs/button/button';
export { ICON_TAG } from '../icon/icon';
// Re-exporting the child tag keeps it registered when this is the only imported entry.
export { CARD_PICKER_ITEM_TAG } from './card-picker-item';

export type CardPickerChangeDetail = {
  labels: string[];
  originalEvent?: Event;
  value: string;
  values: string[];
};

export type CardPickerBrowseChangeDetail = {
  index: number;
  label: string | null;
  value: string | null;
};

export type OreCardPickerEvents = {
  'browse-change': CardPickerBrowseChangeDetail;
  change: CardPickerChangeDetail;
};

export type OreCardPickerProps = {
  /** Active card index. Browsing does not change `values`. */
  'active-index'?: number;
  /** Accessible name for the card browsing region. */
  label?: string;
  /** Disable browsing and selection controls. */
  disabled?: boolean;
  /** Comma-separated selected item values. */
  values?: string;
};

const INTERACTIVE_SELECTOR =
  'a[href], button, input, select, textarea, [role="button"], [role="checkbox"], [contenteditable=""], [contenteditable="true"], ore-button, ore-checkbox';

const itemLabel = (item: HTMLElement): string =>
  item.getAttribute('label')?.trim() || item.getAttribute('value')?.trim() || 'Card';

/**
 * A horizontally browsable set of rich cards with independent multi-selection.
 * Browsing changes only the active card; each item owns an explicit checkbox control.
 *
 * @element ore-card-picker
 * @element ore-card-picker-item - Child element for each card
 *
 * @attr {number} active-index - Active card index (zero-based)
 * @attr {boolean} disabled - Disable browsing and selection
 * @attr {string} label - Accessible name for the card browsing region
 * @attr {string} values - Comma-separated selected item values
 *
 * @fires browse-change - Emitted when the active card changes. detail: { index: number; label: string | null; value: string | null }
 * @fires change - Emitted when selection changes. detail: { labels: string[]; originalEvent?: Event; value: string; values: string[] }
 *
 * @slot - Place `ore-card-picker-item` elements here
 *
 * @cssprop --card-picker-gap - Space between the card stage and navigation controls
 * @cssprop --card-picker-min-height - Minimum card stage height (default `var(--size-80)`)
 * @cssprop --card-picker-transition-duration - Preview transition duration (default `var(--duration-300)`; reduced to `0ms` for reduced motion)
 *
 * @part stage - Card browsing stage
 * @part controls - Previous/next controls and current position
 * @part previous - Previous card button
 * @part next - Next card button
 *
 * @example
 * ```html
 * <ore-card-picker label="Choose action cards">
 *   <ore-card-picker-item value="swift-strike" label="Swift Strike">
 *     <img slot="media" src="/cards/swift-strike.webp" alt="" />
 *     <p>Deal damage, then move one space.</p>
 *   </ore-card-picker-item>
 * </ore-card-picker>
 * ```
 */
export const CARD_PICKER_TAG = 'ore-card-picker' as const;

define<OreCardPickerProps>(CARD_PICKER_TAG, {
  props: {
    ...disablableBundle,
    'active-index': prop.number(0),
    label: prop.string('Card picker'),
    values: { ...prop.string(), reflect: false },
  },

  setup(props) {
    const el = getHost();
    const emit = useEmit<OreCardPickerEvents>();
    const activeIndex = signal(Math.max(0, props['active-index'].value ?? 0));
    const itemCount = signal(0);
    const selected = createChoiceField({
      multiple: signal(true),
      prefix: 'card-picker',
      signal: lifecycleSignal(onCleanup),
      value: props.values,
    });

    const getItems = (): HTMLElement[] => getLightChildrenByTag(el, CARD_PICKER_ITEM_TAG);
    const getValue = (item: HTMLElement | undefined): string | null => item?.getAttribute('value') ?? null;
    const getActiveLabel = (): string | null => {
      const items = getItems();
      const item = items[activeIndex.value];

      return item ? itemLabel(item) : null;
    };

    const syncItems = (): void => {
      const items = getItems();
      const selectedValues = new Set(selected.selectedValues.value);
      itemCount.value = items.length;

      const nextIndex = items.length ? Math.min(activeIndex.value, items.length - 1) : 0;

      if (nextIndex !== activeIndex.value) activeIndex.value = nextIndex;

      items.forEach((item, index) => {
        const active = index === activeIndex.value;
        const previous = index === activeIndex.value - 1;
        const next = index === activeIndex.value + 1;
        const value = item.getAttribute('value') ?? '';

        item.toggleAttribute('picker-managed', true);
        item.toggleAttribute('picker-disabled', Boolean(props.disabled.value));
        item.toggleAttribute('selected', selectedValues.has(value));
        item.toggleAttribute('data-active', active);
        item.toggleAttribute('data-previous', previous);
        item.toggleAttribute('data-next', next);
        item.toggleAttribute('data-hidden', !active && !previous && !next);
        if (active) item.removeAttribute('aria-hidden');
        else item.setAttribute('aria-hidden', 'true');
        item.toggleAttribute('inert', !active);
      });

      el.toggleAttribute('data-empty', items.length === 0);
    };

    watch(
      computed(() => `${Boolean(props.disabled.value)}:${selected.selectedValues.value.join('\u0000')}`),
      syncItems,
      { immediate: true },
    );

    const setActiveIndex = (index: number, notify: boolean): void => {
      const count = getItems().length;
      const next = count ? Math.max(0, Math.min(index, count - 1)) : 0;

      if (next === activeIndex.value) return;

      activeIndex.value = next;
      syncItems();

      if (!notify) return;

      const item = getItems()[next];
      const label = item ? itemLabel(item) : null;
      const value = getValue(item);

      emit('browse-change', { index: next, label, value });
    };

    const toggleValue = (value: string, originalEvent?: Event): void => {
      if (props.disabled.value || !value) return;

      const item = getItems().find((candidate) => candidate.getAttribute('value') === value);
      if (!item || item.hasAttribute('disabled')) return;

      selected.toggleValue(value);
      const values = [...selected.selectedValues.value];
      const labels = values.map((entry) => {
        const selectedItem = getItems().find((candidate) => candidate.getAttribute('value') === entry);

        return selectedItem ? itemLabel(selectedItem) : entry;
      });

      emit('change', { labels, originalEvent, value, values });
    };

    const handleSelectionRequest = (event: Event): void => {
      const item = event
        .composedPath()
        .find((node): node is HTMLElement => node instanceof HTMLElement && node.localName === CARD_PICKER_ITEM_TAG);
      const value = item?.getAttribute('value');

      if (!item || !value) return;

      event.stopPropagation();
      const detail = (event as CustomEvent<{ originalEvent?: Event }>).detail;
      toggleValue(value, detail?.originalEvent ?? event);
    };

    const navigation = createListControl<HTMLElement>({
      direction: () => elementDirection(el),
      getItems,
      loop: false,
      onNavigate: ({ index }) => setActiveIndex(index, true),
      orientation: 'horizontal',
      signal: lifecycleSignal(onCleanup),
    });

    watch(props['active-index'], (index) => {
      setActiveIndex(index ?? 0, false);
      navigation.set(activeIndex.value);
    });

    provide(CARD_PICKER_CTX, {
      disabled: computed(() => Boolean(props.disabled.value)),
      selectedValues: selected.selectedValues,
      toggle: toggleValue,
    });

    const canGoPrevious = computed(() => !props.disabled.value && activeIndex.value > 0);
    const canGoNext = computed(() => !props.disabled.value && activeIndex.value < itemCount.value - 1);
    const position = computed(() => (itemCount.value ? `${activeIndex.value + 1} of ${itemCount.value}` : 'No cards'));
    const status = computed(() => {
      const label = getActiveLabel();

      return label ? `${label}, ${position.value}` : position.value;
    });

    const move = (offset: number): void => {
      if (props.disabled.value) return;

      setActiveIndex(activeIndex.value + offset, true);
      navigation.set(activeIndex.value);
    };

    const handleKeydown = (event: KeyboardEvent): void => {
      if (props.disabled.value || event.defaultPrevented) return;

      const interactiveTarget = event
        .composedPath()
        .some((node) => node instanceof HTMLElement && (node.matches(INTERACTIVE_SELECTOR) || node.isContentEditable));
      if (interactiveTarget) return;

      navigation.set(activeIndex.value);
      navigation.handleKeydown(event);
    };

    bind({
      attr: {
        'active-index': () => activeIndex.value,
        'aria-disabled': () => (props.disabled.value ? 'true' : null),
        'aria-label': props.label,
        'aria-roledescription': () => 'card picker',
        role: () => 'region',
        tabindex: () => (props.disabled.value ? '-1' : '0'),
        values: selected.formValue,
      },
      on: {
        'card-picker-toggle': handleSelectionRequest,
        keydown: handleKeydown,
      },
    });

    onMounted(() => {
      const stage = el.shadowRoot?.querySelector<HTMLElement>('[part="stage"]');
      const slot = el.shadowRoot?.querySelector<HTMLSlotElement>('slot');

      if (!stage || !slot) return;

      let suppressClick = false;
      const resetClick = (): void => {
        suppressClick = false;
      };
      const preventSwipeClick = (event: MouseEvent): void => {
        if (!suppressClick || event.detail === 0) return;

        suppressClick = false;
        event.preventDefault();
        event.stopImmediatePropagation();
      };
      const pan = createPanGesture(stage, {
        axis: 'x',
        disabled: () => Boolean(props.disabled.value) || getItems().length < 2,
        onEnd: ({ distance, reason, velocity }) => {
          if (reason !== 'release') return;

          const projected = projectFling(distance, velocity);
          if (Math.abs(projected) < 48) return;

          const isRtl = elementDirection(el) === 'rtl';
          move(projected * (isRtl ? -1 : 1) < 0 ? 1 : -1);
        },
        onStart: () => {
          suppressClick = true;
        },
        shouldStart: (event) =>
          !event.composedPath().some((node) => node instanceof Element && node.matches(INTERACTIVE_SELECTOR)),
      });
      const refreshItems = (): void => {
        const count = getItems().length;
        setActiveIndex(Math.min(activeIndex.value, Math.max(0, count - 1)), false);
        syncItems();
        navigation.set(activeIndex.value);
      };

      slot.addEventListener('slotchange', refreshItems);
      stage.addEventListener('pointerdown', resetClick, true);
      stage.addEventListener('click', preventSwipeClick, true);
      refreshItems();

      return () => {
        pan.dispose();
        slot.removeEventListener('slotchange', refreshItems);
        stage.removeEventListener('pointerdown', resetClick, true);
        stage.removeEventListener('click', preventSwipeClick, true);
      };
    });

    return html`
      <div class="picker">
        <div class="stage" part="stage">
          <slot></slot>
        </div>
        <div class="controls" part="controls">
          <ore-button
            class="nav-button"
            part="previous"
            icon-only
            rounded="full"
            variant="ghost"
            ?disabled="${() => !canGoPrevious.value}"
            label="${() => 'Previous card'}"
            @click="${() => move(-1)}">
            <ore-icon name="chevron-left" aria-hidden="true"></ore-icon>
          </ore-button>
          <span class="status" aria-live="polite" aria-atomic="true">${status}</span>
          <ore-button
            class="nav-button"
            part="next"
            icon-only
            rounded="full"
            variant="ghost"
            ?disabled="${() => !canGoNext.value}"
            label="${() => 'Next card'}"
            @click="${() => move(1)}">
            <ore-icon name="chevron-right" aria-hidden="true"></ore-icon>
          </ore-button>
        </div>
      </div>
    `;
  },

  styles: [componentStyles],
});
