import { createPanGesture } from '@vielzeug/gesture';
import { type SpringHandle, spring } from '@vielzeug/necromancer';
import { bind, define, getHost, html, onCleanup, onMounted, prop, provide, useEmit } from '@vielzeug/ore';
import { computed, signal, untrack, watch } from '@vielzeug/ripple';
import {
  createChoiceField,
  createListControl,
  elementDirection,
  getLightChildrenByTag,
  lifecycleSignal,
} from '../../core';
import { getMotionMode } from '../../motion';
import { disablableBundle } from '../../shared';
import { projectFling } from '../../shared/fling';
import { CARD_PICKER_CTX } from './_card-picker-context';
import componentStyles from './card-picker.css?inline';
import './card-picker-item';

export { MEDIA_NAVIGATION_TAG } from '../../navigation/media-navigation/media-navigation';
export type { OreCardPickerItemProps } from './card-picker-item';
// Re-exporting the child tag keeps it registered when this is the only imported entry.
export { CARD_PICKER_ITEM_TAG } from './card-picker-item';

const CARD_PICKER_ITEM_NAME = 'ore-card-picker-item' as const;
export const CARD_PICKER_ORIENTATIONS = ['horizontal', 'vertical', 'auto'] as const;
export type CardPickerOrientation = (typeof CARD_PICKER_ORIENTATIONS)[number];
export type CardPickerControlPlacement = 'below' | 'inset';

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
  /** Navigation placement. `inset` floats the bar over the bottom of the card. */
  'controls-placement'?: CardPickerControlPlacement;
  /** Show previous/next buttons. */
  'show-controls'?: boolean;
  /** Show direct card indicators. */
  'show-indicators'?: boolean;
  /** Show the edges of the neighbouring cards at the stage's sides. */
  'show-neighbors'?: boolean;
  /** Maximum visible navigation indicators. */
  'max-indicators'?: number;
  /** Image/content layout. `auto` uses horizontal layout in wide picker containers. */
  orientation?: CardPickerOrientation;
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
  'a[href], button, input, select, textarea, [role="button"], [role="checkbox"], [part="details"], ore-drawer, [contenteditable=""], [contenteditable="true"], ore-button, ore-checkbox';

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
 * @attr {string} orientation - Card layout: 'vertical' (default), 'horizontal', or 'auto'
 * @attr {string} controls-placement - Navigation placement: 'below' (default) or 'inset'
 * @attr {boolean} show-controls - Show previous/next buttons (default true)
 * @attr {boolean} show-indicators - Show card indicators (default true)
 * @attr {boolean} show-neighbors - Show the neighbouring cards' edges at the stage's sides (default true)
 * @attr {number} max-indicators - Maximum visible navigation indicators (default 7)
 * @attr {string} values - Comma-separated selected item values
 *
 * @fires browse-change - Emitted when the active card changes. detail: { index: number; label: string | null; value: string | null }
 * @fires change - Emitted when selection changes. detail: { labels: string[]; originalEvent?: Event; value: string; values: string[] }
 *
 * @slot - Place `ore-card-picker-item` elements here
 *
 * @cssprop --card-picker-gap - Space between the card stage and navigation controls
 * @cssprop --card-picker-min-height - Optional minimum card stage height (default `0`)
 * @cssprop --card-picker-transition-duration - Non-drag preview transition duration (default `var(--duration-300)`; reduced to `0ms` for reduced motion)
 *
 * @part stage - Card browsing stage
 * @part controls - Previous/next button group
 * @cssprop --card-picker-media-max-height - Maximum artwork height (default 32dvh vertically, 70dvh horizontally)
 * @part navigation - Navigation bar
 * @part navigation-bar - Shared media navigation surface
 * @part indicators - Direct card indicator buttons
 * @part indicator - Individual indicator button
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
    'controls-placement': prop.oneOf(['below', 'inset'] as const, 'below'),
    label: prop.string('Card picker'),
    'max-indicators': prop.number(7),
    orientation: prop.oneOf(CARD_PICKER_ORIENTATIONS, 'vertical'),
    'show-controls': prop.bool(true),
    'show-indicators': prop.bool(true),
    'show-neighbors': prop.bool(true),
    values: { ...prop.string(), reflect: false },
  },

  setup(props) {
    const el = getHost();
    const emit = useEmit<OreCardPickerEvents>();
    const activeIndex = signal(Math.max(0, props['active-index'].value ?? 0));
    const itemCount = signal(0);
    const itemsVersion = signal(0);
    const selected = createChoiceField({
      multiple: signal(true),
      prefix: 'card-picker',
      signal: lifecycleSignal(onCleanup),
      value: props.values,
    });

    const getItems = (): HTMLElement[] => getLightChildrenByTag(el, CARD_PICKER_ITEM_NAME);
    const getValue = (item: HTMLElement | undefined): string | null => item?.getAttribute('value') ?? null;
    const getActiveLabel = (): string | null => {
      const items = getItems();
      const item = items[activeIndex.value];

      return item ? itemLabel(item) : null;
    };

    const syncItems = (): void => {
      const items = getItems();
      itemCount.value = items.length;

      const nextIndex = items.length ? Math.min(activeIndex.value, items.length - 1) : 0;

      if (nextIndex !== activeIndex.value) activeIndex.value = nextIndex;

      items.forEach((item, index) => {
        const active = index === activeIndex.value;
        const previous = index === activeIndex.value - 1;
        const next = index === activeIndex.value + 1;
        item.toggleAttribute('data-active', active);
        item.toggleAttribute('data-previous', previous);
        item.toggleAttribute('data-next', next);
        item.toggleAttribute('data-hidden', !active && !previous && !next);
        if (active) item.removeAttribute('aria-hidden');
        else item.setAttribute('aria-hidden', 'true');
        item.toggleAttribute('inert', !active);
      });

      el.toggleAttribute('data-empty', items.length === 0);
      itemsVersion.value++;
    };

    /**
     * Inset navigation floats over the active card's artwork rather than the whole stage: a
     * horizontal card puts its facts beside the image, so the stage's bottom edge sits well below
     * the media. The bar is anchored to the media wrapper's bottom-centre instead, re-derived
     * whenever the card, either box, or the placement changes. The swipe re-measures every frame,
     * which keeps the bar glued to the artwork as the card slides. Cards without media keep the
     * plain stage-bottom placement.
     */
    const syncNavigationAnchor = (): void => {
      untrack(() => {
        const bar = el.shadowRoot?.querySelector<HTMLElement>('[part="navigation"]');
        // The bar is absolutely positioned against the picker box, so the offsets are measured
        // against that same box rather than the stage.
        const host = el.shadowRoot?.querySelector<HTMLElement>('.picker');

        if (!bar) return;

        const media = getItems()[activeIndex.value]?.shadowRoot?.querySelector<HTMLElement>('[part="media"]');
        const mediaBox =
          host && props['controls-placement'].value === 'inset' && media && !media.hidden
            ? media.getBoundingClientRect()
            : null;

        if (!mediaBox || mediaBox.height === 0 || !host) {
          bar.style.removeProperty('--_navigation-inset-x');
          bar.style.removeProperty('--_navigation-inset-y');
          bar.style.removeProperty('--_navigation-inset-width');

          return;
        }

        const hostBox = host.getBoundingClientRect();
        bar.style.setProperty(
          '--_navigation-inset-x',
          `${mediaBox.left + mediaBox.width / 2 - (hostBox.left + hostBox.width / 2)}px`,
        );
        bar.style.setProperty('--_navigation-inset-y', `${hostBox.bottom - mediaBox.bottom}px`);
        bar.style.setProperty('--_navigation-inset-width', `${Math.round(mediaBox.width)}px`);
      });
    };

    let mediaObserver: ResizeObserver | undefined;
    let mediaObserverItem: HTMLElement | undefined;
    /** Follow the active card's media wrapper: the observed element changes with every browse. */
    const watchNavigationAnchor = (): void => {
      const item = getItems()[activeIndex.value];

      if (mediaObserverItem === item) return;

      mediaObserver?.disconnect();
      mediaObserverItem = item;

      if (!item || typeof ResizeObserver !== 'function') return;

      mediaObserver = new ResizeObserver(syncNavigationAnchor);

      const media = item.shadowRoot?.querySelector<HTMLElement>('[part="media"]');

      if (media) mediaObserver.observe(media);
      mediaObserver.observe(item);
    };

    onCleanup(() => mediaObserver?.disconnect());

    watch(props['controls-placement'], () => {
      watchNavigationAnchor();
      syncNavigationAnchor();
    });

    const setActiveIndex = (index: number, notify: boolean): void => {
      const count = getItems().length;
      const next = count ? Math.max(0, Math.min(index, count - 1)) : 0;

      if (next === activeIndex.value) return;

      activeIndex.value = next;
      syncItems();
      watchNavigationAnchor();
      syncNavigationAnchor();

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
      activeValue: computed(() => {
        void itemsVersion.value;
        return getValue(getItems()[activeIndex.value]);
      }),
      disabled: computed(() => Boolean(props.disabled.value)),
      orientation: computed(() => props.orientation.value ?? 'vertical'),
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
    const goTo = (index: number): void => {
      if (props.disabled.value) return;
      setActiveIndex(index, true);
      navigation.set(activeIndex.value);
    };
    const indicatorLabels = computed(() => {
      void itemsVersion.value;
      return getItems().map((item, index) => `Go to card ${index + 1}: ${itemLabel(item)}`);
    });

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
        'data-navigation-hidden': () =>
          itemCount.value === 0 || (!props['show-controls'].value && !props['show-indicators'].value) ? '' : null,
        // A false boolean prop removes its own attribute, so the previews' state needs a marker of
        // its own rather than a `:not([show-neighbors])` selector that would also match before the
        // element upgrades and the default reflects.
        'data-neighbors-hidden': () => (props['show-neighbors'].value ? null : ''),
        role: () => 'region',
        tabindex: () => (props.disabled.value ? '-1' : '0'),
        values: selected.formValue,
      },
      on: {
        keydown: handleKeydown,
      },
    });

    onMounted(() => {
      const stage = el.shadowRoot?.querySelector<HTMLElement>('[part="stage"]');
      const slot = el.shadowRoot?.querySelector<HTMLSlotElement>('slot');

      if (!stage || !slot) return;

      let suppressClick = false;
      let springHandle: SpringHandle | undefined;
      let dragOffset = 0;
      let dragOrigin = 0;
      // Every drag frame re-measures the inset anchor, so the navigation bar slides with the card
      // it belongs to rather than sitting still while the artwork moves.
      const applyDrag = (offset: number): void => {
        dragOffset = offset;
        stage.style.setProperty('--_drag-offset', `${offset}px`);
        // The inset bar belongs to the card's artwork, so it rides the swipe with it and settles
        // at the new card's media once the spring comes to rest.
        syncNavigationAnchor();
      };
      const resetDrag = (): void => {
        dragOffset = 0;
        stage.style.removeProperty('--_drag-offset');
        el.removeAttribute('data-dragging');
      };
      const settleDrag = (velocity: number): void => {
        springHandle?.dispose();
        const handle = spring(dragOffset, 0, applyDrag, {
          damping: 20,
          motion: getMotionMode(),
          stiffness: 210,
          velocity,
        });
        springHandle = handle;
        void handle.result.then((outcome) => {
          if (outcome.status !== 'finished' || springHandle !== handle) return;
          springHandle = undefined;
          resetDrag();
        });
      };
      const resetClick = (): void => {
        suppressClick = false;
      };
      const preventSwipeClick = (event: MouseEvent): void => {
        if (!suppressClick || event.detail === 0) return;

        suppressClick = false;
        event.preventDefault();
        event.stopImmediatePropagation();
      };
      // Native image dragging (starting on a card's artwork) would hijack the swipe, so a drag
      // begun inside an item is always the picker's own gesture instead.
      const handleDragStart = (event: DragEvent): void => {
        const items = getItems();
        if (event.composedPath().some((node) => node instanceof HTMLElement && items.includes(node))) {
          event.preventDefault();
        }
      };
      const pan = createPanGesture(stage, {
        axis: 'x',
        disabled: () => Boolean(props.disabled.value) || getItems().length < 2,
        onEnd: ({ distance, reason, velocity }) => {
          if (reason === 'release') {
            const projected = projectFling(distance, velocity);
            if (Math.abs(projected) >= 48) {
              const isRtl = elementDirection(el) === 'rtl';
              const offset = projected * (isRtl ? -1 : 1) < 0 ? 1 : -1;
              const arriving = getItems()[activeIndex.value + offset];
              if (arriving) {
                const before = arriving.getBoundingClientRect().x;
                move(offset);
                const after = arriving.getBoundingClientRect().x;
                applyDrag(dragOffset + before - after);
              }
            }
          } else suppressClick = false;
          settleDrag(reason === 'release' ? velocity : 0);
        },
        onMove: ({ distance }) => {
          const logicalDistance = distance * (elementDirection(el) === 'rtl' ? -1 : 1);
          const atBoundary = logicalDistance > 0 ? !canGoPrevious.value : !canGoNext.value;
          applyDrag(dragOrigin + (atBoundary ? distance * 0.3 : distance));
        },
        onStart: () => {
          springHandle?.dispose();
          springHandle = undefined;
          dragOrigin = dragOffset;
          el.setAttribute('data-dragging', '');
          suppressClick = true;
        },
        shouldStart: (event) =>
          !event.composedPath().some((node) => node instanceof Element && node.matches(INTERACTIVE_SELECTOR)),
      });
      const refreshItems = (): void => {
        springHandle?.dispose();
        springHandle = undefined;
        resetDrag();
        const count = getItems().length;
        setActiveIndex(Math.min(activeIndex.value, Math.max(0, count - 1)), false);
        syncItems();
        watchNavigationAnchor();
        syncNavigationAnchor();
        navigation.set(activeIndex.value);
      };

      slot.addEventListener('slotchange', refreshItems);
      stage.addEventListener('pointerdown', resetClick, true);
      stage.addEventListener('click', preventSwipeClick, true);
      el.addEventListener('dragstart', handleDragStart);
      refreshItems();

      return () => {
        pan.dispose();
        springHandle?.dispose();
        springHandle = undefined;
        resetDrag();
        slot.removeEventListener('slotchange', refreshItems);
        stage.removeEventListener('pointerdown', resetClick, true);
        stage.removeEventListener('click', preventSwipeClick, true);
        el.removeEventListener('dragstart', handleDragStart);
      };
    });

    onMounted(() => {
      watchNavigationAnchor();
      syncNavigationAnchor();

      // Clicking an indicator or arrow pages the card with a CSS transition, so the synchronous
      // measure in setActiveIndex catches the card mid-slide. The slide's transitionend bubbles
      // from the item to the host, which is the moment the resting geometry is finally correct.
      const handleSettled = (): void => syncNavigationAnchor();
      el.addEventListener('transitionend', handleSettled);

      if (typeof ResizeObserver !== 'function') {
        return () => el.removeEventListener('transitionend', handleSettled);
      }

      const host = el.shadowRoot?.querySelector<HTMLElement>('.picker');

      if (!host) {
        return () => el.removeEventListener('transitionend', handleSettled);
      }

      // The anchor is a pair of offsets against the picker box, so any resize of it or the host
      // (panel animations, viewport changes, fonts settling) has to re-derive them.
      const hostObserver = new ResizeObserver(syncNavigationAnchor);
      hostObserver.observe(host);
      hostObserver.observe(el);

      return () => {
        hostObserver.disconnect();
        el.removeEventListener('transitionend', handleSettled);
      };
    });

    return html`
      <div class="picker">
        <div class="stage" part="stage">
          <slot></slot>
        </div>
        <ore-media-navigation class="navigation" part="navigation" exportparts="bar:navigation-bar,controls,indicators,indicator,previous,next"
          label="Card navigation" indicator-label="Card indicators" previous-label="Previous card" next-label="Next card"
          count="${() => itemCount.value}" active-index="${() => activeIndex.value}" labels="${() => JSON.stringify(indicatorLabels.value)}"
          disabled="${() => String(Boolean(props.disabled.value))}"
          show-controls="${() => String(Boolean(props['show-controls'].value))}" show-indicators="${() => String(Boolean(props['show-indicators'].value))}"
          max-indicators="${props['max-indicators']}"
          @navigate="${(event: CustomEvent<{ index: number }>) => {
            event.stopPropagation();
            goTo(event.detail.index);
          }}"></ore-media-navigation>
        <span class="sr-only" aria-live="polite" aria-atomic="true">${status}</span>
      </div>
    `;
  },

  styles: [componentStyles],
});
