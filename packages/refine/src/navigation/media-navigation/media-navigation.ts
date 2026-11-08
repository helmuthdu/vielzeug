import { bind, define, each, getHost, html, onCleanup, prop, useEmit } from '@vielzeug/ore';
import { computed, signal, watch } from '@vielzeug/ripple';
import { createListControl, elementDirection } from '../../core';
import { THEME_COLORS, type ThemeColor } from '../../types';
import componentStyles from './media-navigation.css?inline';

export { ICON_TAG } from '../../content/icon/icon';
export { PROGRESS_TAG } from '../../feedback/progress/progress';
export { BUTTON_TAG } from '../../inputs/button/button';

export type MediaNavigationOrientation = 'horizontal' | 'vertical';
export type MediaNavigationNavigateDetail = { index: number };
export type OreMediaNavigationEvents = { navigate: MediaNavigationNavigateDetail };
export type OreMediaNavigationProps = {
  'active-index'?: number;
  color?: ThemeColor;
  count?: number;
  disabled?: boolean;
  'indicator-label'?: string;
  label?: string;
  /** Optional accessible names for individual indicators. */
  labels?: readonly string[];
  /** Maximum visible indicators. Navigation still covers every item. */
  'max-indicators'?: number;
  loop?: boolean;
  'next-label'?: string;
  orientation?: MediaNavigationOrientation;
  'previous-label'?: string;
  /** Visual progress duration in milliseconds. Does not advance the active index. */
  'progress-duration'?: number;
  'show-controls'?: boolean;
  'show-indicators'?: boolean;
};

/**
 * Controlled media navigation shared by carousels and card pickers.
 * The owner updates `active-index` in response to `navigate`.
 *
 * @element ore-media-navigation
 * @attr {number} active-index - Current item index (default 0)
 * @attr {number} count - Number of items (default 0)
 * @attr {string} color - Theme color for arrows and progress
 * @attr {boolean} disabled - Disable navigation (default false)
 * @attr {string} label - Navigation group name (default Media navigation)
 * @attr {string} labels - JSON array of accessible indicator names
 * @attr {string} indicator-label - Indicator group name (default Media indicators)
 * @attr {number} max-indicators - Maximum visible indicator buttons (default 7)
 * @attr {boolean} loop - Wrap navigation at the ends (default false)
 * @attr {string} orientation - horizontal (default) or vertical
 * @attr {string} previous-label - Previous button name (default Previous item)
 * @attr {string} next-label - Next button name (default Next item)
 * @attr {number} progress-duration - Active indicator progress duration in milliseconds (default 0)
 * @attr {boolean} show-controls - Show arrows (default true)
 * @attr {boolean} show-indicators - Show indicators (default true)
 * @fires navigate - Requests a new index. detail: { index: number }
 * @part bar - Shared navigation surface
 * @part controls - Arrow button group
 * @part indicators - Indicator group
 * @part indicator - Individual indicator button
 * @part previous - Previous button
 * @part next - Next button
 * @cssprop --media-navigation-bg - Navigation surface background
 * @cssprop --media-navigation-dot-bg - Inactive track color
 */
export const MEDIA_NAVIGATION_TAG = 'ore-media-navigation' as const;

define<OreMediaNavigationProps>(MEDIA_NAVIGATION_TAG, {
  props: {
    'active-index': prop.number(0),
    color: prop.oneOf(THEME_COLORS),
    count: prop.number(0),
    disabled: prop.bool(false),
    'indicator-label': prop.string('Media indicators'),
    label: prop.string('Media navigation'),
    labels: prop.json<readonly string[]>([]),
    loop: prop.bool(false),
    'max-indicators': prop.number(7),
    'next-label': prop.string('Next item'),
    orientation: prop.oneOf(['horizontal', 'vertical'] as const, 'horizontal'),
    'previous-label': prop.string('Previous item'),
    'progress-duration': prop.number(0),
    'show-controls': prop.bool(true),
    'show-indicators': prop.bool(true),
  },
  setup(props) {
    const el = getHost();
    const emit = useEmit<OreMediaNavigationEvents>();
    const count = computed(() =>
      Number.isFinite(props.count.value) ? Math.max(0, Math.trunc(props.count.value ?? 0)) : 0,
    );
    const index = computed(() => {
      const value = props['active-index'].value ?? 0;
      return Math.min(Math.max(0, count.value - 1), Math.max(0, Number.isFinite(value) ? Math.trunc(value) : 0));
    });
    const showIndicators = computed(() => Boolean(props['show-indicators'].value) && count.value > 1);
    const indicatorLimit = computed(() => {
      const value = props['max-indicators'].value ?? 7;
      return Number.isFinite(value) && value > 0 ? Math.max(1, Math.trunc(value)) : 7;
    });
    const windowStart = computed(() =>
      Math.max(0, Math.min(index.value - Math.floor(indicatorLimit.value / 2), count.value - indicatorLimit.value)),
    );
    const visibleIndices = computed(() =>
      Array.from({ length: Math.min(count.value, indicatorLimit.value) }, (_, offset) => windowStart.value + offset),
    );
    const duration = computed(() =>
      Number.isFinite(props['progress-duration'].value) ? Math.max(0, props['progress-duration'].value ?? 0) : 0,
    );
    const previousDisabled = computed(
      () => Boolean(props.disabled.value) || count.value < 2 || (!props.loop.value && index.value === 0),
    );
    const nextDisabled = computed(
      () => Boolean(props.disabled.value) || count.value < 2 || (!props.loop.value && index.value === count.value - 1),
    );
    const request = (requested: number): void => {
      if (props.disabled.value || count.value < 1) return;
      const next = props.loop.value
        ? (requested + count.value) % count.value
        : Math.max(0, Math.min(requested, count.value - 1));
      if (next !== index.value) emit('navigate', { index: next });
    };
    const indicatorName = (value: number): string => {
      const label = Array.isArray(props.labels.value) ? props.labels.value[value] : undefined;
      return typeof label === 'string' && label.trim() ? label : `Go to item ${value + 1}`;
    };
    // Controlled component: the owner moves `active-index` in reaction to `navigate`, which may
    // slide the focused indicator out of the visible window. Follow focus to the target after the
    // keyed list has reconciled; when the node persists, focusing it again is a no-op.
    let focusFollow: number | undefined;
    const followIndicatorFocus = (target: number): void => {
      focusFollow = target;
      queueMicrotask(() => {
        if (focusFollow !== target) return;
        focusFollow = undefined;
        if (!showIndicators.value) return;
        el.shadowRoot?.querySelector<HTMLElement>(`.indicator[data-index="${target}"]`)?.focus();
      });
    };
    // Reads the pre-render active element: watches run before the template effects re-flush.
    const keepIndicatorFocus = (): void => {
      const focused = el.shadowRoot?.activeElement;
      if (focused instanceof HTMLElement && focused.classList.contains('indicator')) {
        followIndicatorFocus(index.value);
      }
    };
    const requestIndicator = (requested: number): void => {
      if (props.disabled.value) return;
      request(requested);
      followIndicatorFocus(requested);
    };
    // Forward moves lead with the new pill growing rightward, which matches the travel
    // direction. Backward moves must instead lead with the old pill collapsing leftward and
    // only widen the new slot afterwards; this flag drives that mirrored CSS staging.
    const movingBack = signal(false);
    // Backward moves restage BOTH pills with keyframes (see the CSS): a backward window slide
    // re-inserts every indicator node, and transitions never run on a (re)mounted element.
    // The previous index is tracked explicitly so the leaving pill is identifiable after remount.
    const leavingIndex = signal<number | undefined>(undefined);
    // Seed with the mounted index: watch never runs for the initial value, so the first
    // navigation after mount must still compare against it.
    let previousIndex: number = index.value;
    let backReset: ReturnType<typeof setTimeout> | undefined;
    watch(index, (value) => {
      if (value < previousIndex) {
        movingBack.value = true;
        leavingIndex.value = previousIndex;
        clearTimeout(backReset);
        backReset = setTimeout(() => {
          movingBack.value = false;
          leavingIndex.value = undefined;
        }, 700);
      } else if (value > previousIndex) {
        movingBack.value = false;
        leavingIndex.value = undefined;
        clearTimeout(backReset);
      }
      previousIndex = value;
    });
    onCleanup(() => clearTimeout(backReset));
    watch(index, (value) => {
      if (focusFollow !== undefined && focusFollow !== value) focusFollow = undefined;
      keepIndicatorFocus();
    });
    watch(visibleIndices, keepIndicatorFocus);
    const navigation = createListControl<number>({
      direction: () => elementDirection(el),
      getItems: () => Array.from({ length: count.value }, (_, value) => value),
      loop: () => Boolean(props.loop.value),
      onNavigate: ({ index: next }) => {
        requestIndicator(next);
      },
      orientation: () => props.orientation.value ?? 'horizontal',
    });
    onCleanup(() => navigation.dispose());
    const edgeOf = (value: number): string | null => {
      const start = windowStart.value;
      if (value === start && value > 0) return 'before';
      if (value === start + visibleIndices.value.length - 1 && value < count.value - 1) return 'after';
      return null;
    };
    const arrow = (next: boolean): string => {
      if (props.orientation.value === 'vertical') return next ? 'chevron-down' : 'chevron-up';
      return next !== (elementDirection(el) === 'rtl') ? 'chevron-right' : 'chevron-left';
    };
    bind({
      attr: {
        'aria-label': props.label,
        hidden: () =>
          count.value === 0 || (!props['show-controls'].value && !props['show-indicators'].value) ? '' : null,
        role: 'group',
      },
      on: {
        keydown: (event: KeyboardEvent) => {
          if (props.disabled.value || event.defaultPrevented) return;
          const indicator = event
            .composedPath()
            .find((node): node is HTMLElement => node instanceof HTMLElement && node.matches('.indicator'));
          navigation.set(indicator ? Number(indicator.dataset.index) : index.value);
          navigation.handleKeydown(event);
          const keys =
            props.orientation.value === 'vertical'
              ? ['ArrowUp', 'ArrowDown', 'Home', 'End']
              : ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
          if (keys.includes(event.key)) event.stopPropagation();
        },
      },
    });

    return html`
      <div class="${() => `media-navigation${showIndicators.value ? '' : ' controls-only'}${movingBack.value ? ' indicator-moving-back' : ''}`}" part="bar"
        style="${() => `--_media-progress-duration:${duration.value}ms;--_media-progress-animation:${duration.value > 0 ? (props.orientation.value === 'vertical' ? 'media-navigation-fill-v' : 'media-navigation-fill') : 'none'};`}">
        <div class="indicator-list" part="indicators" role="group" aria-label="${props['indicator-label']}" ?hidden="${() => !showIndicators.value}">
          ${each(
            visibleIndices,
            (value) => value,
            (item) => {
              const value = item.value;
              return html`
            <button class="${() => `indicator${value === index.value ? ' indicator-active' : ''}${value === leavingIndex.value ? ' indicator-leaving' : ''}`}" part="indicator" type="button" data-index="${value}"
              data-edge="${() => edgeOf(value)}"
              aria-label="${() => indicatorName(value)}"
              aria-current="${() => (value === index.value ? 'true' : null)}" tabindex="${() => (value === index.value ? '0' : '-1')}"
              ?disabled="${() => Boolean(props.disabled.value)}" @click="${() => requestIndicator(value)}">
              <ore-progress aria-hidden="true" tabindex="-1" color="${props.color}" type="${() => (props.orientation.value === 'vertical' ? 'vertical' : 'linear')}" value="${() => (value === index.value ? 100 : 0)}"></ore-progress>
            </button>
          `;
            },
          )}
        </div>
        <div class="controls" part="controls" ?hidden="${() => !props['show-controls'].value}">
          <ore-button class="nav-btn" part="previous" variant="ghost" color="${props.color}" rounded="full" icon-only label="${props['previous-label']}"
            ?disabled="${() => previousDisabled.value}" @click="${() => request(index.value - 1)}"><ore-icon name="${() => arrow(false)}" size="16" stroke-width="2" aria-hidden="true"></ore-icon></ore-button>
          <ore-button class="nav-btn" part="next" variant="ghost" color="${props.color}" rounded="full" icon-only label="${props['next-label']}"
            ?disabled="${() => nextDisabled.value}" @click="${() => request(index.value + 1)}"><ore-icon name="${() => arrow(true)}" size="16" stroke-width="2" aria-hidden="true"></ore-icon></ore-button>
        </div>
      </div>
    `;
  },
  styles: [componentStyles],
});
