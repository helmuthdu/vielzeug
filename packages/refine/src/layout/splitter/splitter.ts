import { createDragGesture, type DragGesture } from '@vielzeug/gesture';
import { createKeymap } from '@vielzeug/keymap';
import { define, getHost, html, onMounted, prop, ref, useEmit, watchEffect } from '@vielzeug/ore';
import { computed } from '@vielzeug/ripple';
import { warn } from '../../_dev';
import styles from './splitter.css?inline';

export { ICON_TAG } from '../../content/icon/icon';

export type OreSplitterEvents = {
  change: { value: number };
  input: { value: number };
};

/** Properties of a two-pane resizable layout. */
export type OreSplitterProps = {
  /** Accessible label for the primary pane and separator. */
  label?: string;
  /** Accessible name of the decrease button. */
  'decrease-label'?: string;
  /** Disable resizing. */
  disabled?: boolean;
  /** Accessible name of the increase button. */
  'increase-label'?: string;
  /** Maximum primary-pane percentage, between 0 and 100. */
  max?: number;
  /** Minimum primary-pane percentage, between 0 and 100. */
  min?: number;
  /** Horizontal panes are side by side; vertical panes are stacked. */
  orientation?: 'horizontal' | 'vertical';
  /** Show buttons for resizing without dragging. */
  'show-buttons'?: boolean;
  /** Percentage increment for keyboard and buttons. */
  step?: number;
  /** Primary-pane percentage. */
  value?: number;
};

const numeric = (defaultValue: number) => ({
  default: defaultValue,
  parse: (value: string | null) => (value === null ? defaultValue : Number(value)),
  reflect: true,
});

/**
 * Two resizable panes with keyboard, pointer, and non-drag controls.
 *
 * @element ore-splitter
 * @attr {string} label - Accessible label for the primary pane
 * @attr {string} decrease-label - Label for the decrease button
 * @attr {string} increase-label - Label for the increase button
 * @attr {boolean} disabled - Disable resizing
 * @attr {number} min - Minimum percentage (default 10)
 * @attr {number} max - Maximum percentage (default 90)
 * @attr {number} step - Button and keyboard increment (default 5)
 * @attr {number} value - Primary-pane percentage (default 50)
 * @attr {string} orientation - horizontal (default) or vertical
 * @attr {boolean} show-buttons - Show non-drag resize buttons (default false)
 * @fires input - User changed the value: detail `{ value }`
 * @fires change - User committed a change: detail `{ value }`
 * @slot primary - Primary pane content
 * @slot secondary - Secondary pane content
 * @part primary - Primary pane wrapper
 * @part secondary - Secondary pane wrapper
 * @part separator - Focusable draggable separator
 * @part decrease - Decrease button
 * @part increase - Increase button
 * @cssprop --splitter-divider-size - Divider width or height
 * @example
 * ```html
 * <ore-splitter label="Files" value="35">
 *   <nav slot="primary">Files</nav>
 *   <main slot="secondary">Editor</main>
 * </ore-splitter>
 * ```
 */
export const SPLITTER_TAG = 'ore-splitter' as const;

define<OreSplitterProps>(SPLITTER_TAG, {
  props: {
    'decrease-label': prop.string('Decrease primary pane size'),
    disabled: prop.bool(false),
    'increase-label': prop.string('Increase primary pane size'),
    label: prop.string('Primary pane'),
    max: numeric(90),
    min: numeric(10),
    orientation: prop.oneOf(['horizontal', 'vertical'] as const, 'horizontal'),
    'show-buttons': prop.bool(false),
    step: numeric(5),
    value: numeric(50),
  },
  setup(props) {
    const host = getHost();
    const emit = useEmit<OreSplitterEvents>();
    const separator = ref<HTMLElement>();
    const divider = ref<HTMLElement>();
    const min = () => props.min.value ?? Number.NaN;
    const max = () => props.max.value ?? Number.NaN;
    const increment = () => props.step.value ?? Number.NaN;
    const requestedValue = () => props.value.value ?? Number.NaN;
    const valid = computed(() => {
      return (
        Number.isFinite(min()) &&
        Number.isFinite(max()) &&
        Number.isFinite(increment()) &&
        Number.isFinite(requestedValue()) &&
        min() >= 0 &&
        max() <= 100 &&
        min() <= max() &&
        increment() > 0
      );
    });
    const disabled = computed(() => Boolean(props.disabled.value) || !valid.value);
    const value = computed(() => (valid.value ? Math.min(max(), Math.max(min(), requestedValue())) : 50));
    const horizontal = () => props.orientation.value !== 'vertical';
    const rtl = () => getComputedStyle(host).direction === 'rtl';
    let gesture: DragGesture | undefined;
    let dragStart = 0;

    watchEffect(() => {
      if (!valid.value) {
        warn('ore-splitter requires finite values, 0 <= min <= max <= 100, and step > 0.');
        gesture?.cancel();
      } else if (requestedValue() !== value.value) {
        host.setAttribute('value', String(value.value));
      }
      if (props.disabled.value) gesture?.cancel();
    });

    const update = (next: number): boolean => {
      if (disabled.value) return false;
      const bounded = Math.min(max(), Math.max(min(), next));
      const rounded = Math.round(bounded * 10000) / 10000;

      if (rounded === value.value) return false;
      host.setAttribute('value', String(rounded));
      emit('input', { value: rounded });

      return true;
    };
    const commit = (next: number) => {
      if (update(next)) emit('change', { value: value.value });
    };
    const step = (direction: number) => commit(value.value + direction * increment());

    onMounted(() => {
      const control = separator.value;
      const bar = divider.value;

      if (!control || !bar) return;
      const keys = createKeymap(
        [
          { handler: () => step(rtl() ? 1 : -1), id: 'left', shortcut: 'left', when: horizontal },
          { handler: () => step(rtl() ? -1 : 1), id: 'right', shortcut: 'right', when: horizontal },
          { handler: () => step(-1), id: 'up', shortcut: 'up', when: () => !horizontal() },
          { handler: () => step(1), id: 'down', shortcut: 'down', when: () => !horizontal() },
          { handler: () => commit(min()), id: 'home', shortcut: 'home' },
          { handler: () => commit(max()), id: 'end', shortcut: 'end' },
        ],
        { when: () => !disabled.value },
      );

      keys.mount(control);
      gesture = createDragGesture(control, {
        disabled: () => disabled.value,
        onEnd: ({ reason }) => {
          if (reason === 'cancel') update(dragStart);
          else if (value.value !== dragStart) emit('change', { value: value.value });
        },
        onMove: ({ delta }) => {
          const hostSize = horizontal() ? host.clientWidth : host.clientHeight;
          const barSize = horizontal() ? bar.offsetWidth : bar.offsetHeight;
          const available = hostSize - barSize;

          if (available <= 0) return;
          const offset = horizontal() ? delta.x * (rtl() ? -1 : 1) : delta.y;

          update(dragStart + (offset / available) * 100);
        },
        onStart: () => {
          dragStart = value.value;
        },
      });

      return () => {
        keys.dispose();
        gesture?.dispose();
        gesture = undefined;
      };
    });

    return html`
      <div class="panes" data-orientation="${props.orientation}"
        style="${() =>
          horizontal()
            ? `grid-template-columns: minmax(0, ${value.value}fr) var(--_splitter-divider-size) minmax(0, ${100 - value.value}fr)`
            : `grid-template-rows: minmax(0, ${value.value}fr) var(--_splitter-divider-size) minmax(0, ${100 - value.value}fr)`}">
        <div class="pane" part="primary" id="primary" role="region" aria-label="${props.label}"><slot name="primary"></slot></div>
        <div class="divider" ref="${divider}">
          <button type="button" part="decrease" aria-label="${props['decrease-label']}" ?hidden="${() =>
            !props['show-buttons'].value}" ?disabled="${() =>
            disabled.value || value.value <= min()}" @click="${() => step(-1)}">
            <ore-icon name="${() => (horizontal() ? (rtl() ? 'chevron-right' : 'chevron-left') : 'chevron-up')}" size="16" aria-hidden="true"></ore-icon>
          </button>
          <div class="separator" part="separator" ref="${separator}" role="separator"
            tabindex="${() => (disabled.value ? '-1' : '0')}"
            aria-label="${props.label}" aria-controls="primary"
            aria-orientation="${() => (horizontal() ? 'vertical' : 'horizontal')}"
            aria-disabled="${() => String(disabled.value)}"
            aria-valuemin="${() => (valid.value ? String(min()) : null)}"
            aria-valuemax="${() => (valid.value ? String(max()) : null)}"
            aria-valuenow="${() => (valid.value ? String(value.value) : null)}">
            <span class="grip" aria-hidden="true"></span>
          </div>
          <button type="button" part="increase" aria-label="${props['increase-label']}" ?hidden="${() =>
            !props['show-buttons'].value}" ?disabled="${() =>
            disabled.value || value.value >= max()}" @click="${() => step(1)}">
            <ore-icon name="${() => (horizontal() ? (rtl() ? 'chevron-left' : 'chevron-right') : 'chevron-down')}" size="16" aria-hidden="true"></ore-icon>
          </button>
        </div>
        <div class="pane" part="secondary"><slot name="secondary"></slot></div>
      </div>
    `;
  },
  styles: [styles],
});
