import {
  bind,
  createContext,
  define,
  getHost,
  html,
  onCleanup,
  prop,
  provide,
  useEmit,
  useSlots,
  watchEffect,
} from '@vielzeug/ore';
import { computed, type Readable, signal, watch } from '@vielzeug/ripple';
import {
  type ChoiceChangeDetail,
  createListControl,
  elementDirection,
  getChoiceLabel,
  lifecycleSignal,
} from '../../core';
import {
  type ComponentSize,
  type RoundedSize,
  roundableBundle,
  sizableBundle,
  type ThemeColor,
  themableBundle,
  VISUAL_VARIANTS,
} from '../../shared';
import { roundedVariantMixin } from '../../styles';
import type { ButtonVariant } from '../button/button';
import componentStyles from './button-group.css?inline';

/** Button group properties */
export type OreButtonGroupProps = {
  /** Join buttons together into a single unit */
  attached?: boolean;
  /** Theme color tint for all child buttons */
  color?: ThemeColor;
  /** Group children span full width */
  fullwidth?: boolean;
  /** Label for screen readers */
  label?: string;
  /** Layout direction */
  orientation?: 'horizontal' | 'vertical';
  /** Corner radius of the group container (and its attached-mode end buttons) */
  rounded?: RoundedSize | '';
  /** Shared size for all child buttons */
  size?: ComponentSize;
  /**
   * Value of the currently selected button. Setting it (attribute or property)
   * moves the selection; omitting it leaves the group a plain container with no
   * selection semantics.
   */
  value?: string;
  /** Shared visual variant for all child buttons */
  variant?: ButtonVariant;
};

/** Events emitted by `ore-button-group` when it carries a selection. */
export type OreButtonGroupEvents = {
  /** Emitted when the selected button changes. */
  change: ChoiceChangeDetail;
};

/**
 * Shared context propagated from ore-button-group to child ore-button elements.
 *
 * `value`/`segmented` are what turn a valued child button into a segment: the
 * button binds its own `role="radio"`, `aria-checked`, and roving `tabindex`
 * from them, so the group never reaches into a child's attribute list (the same
 * division `ore-radio-group`/`ore-tabs` keep). `segmented` is separate from
 * `value` because the group can be segmented with a selection that is not this
 * button's.
 */
export type ButtonGroupContext = {
  color: Readable<ThemeColor | undefined>;
  segmented: Readable<boolean>;
  size: Readable<ComponentSize | undefined>;
  value: Readable<string | undefined>;
  variant: Readable<ButtonVariant | undefined>;
};

export const BUTTON_GROUP_CTX = createContext<ButtonGroupContext | undefined>('OreButtonGroup');

const BUTTON_GROUP_ORIENTATIONS = ['horizontal', 'vertical'] as const;

/**
 * A container for grouping related buttons.
 * Child `ore-button` components automatically inherit the group's color, size, and variant.
 *
 * With a `value`, the group becomes a segmented control (the web equivalent of
 * Apple's HIG Segmented Control): child buttons carry `value`, the group owns the
 * single selection, and the container takes `role="radiogroup"` while each valued
 * button becomes a `radio` (`aria-checked` plus a roving tabindex, both bound by
 * `ore-button` itself from the group's context). Arrow keys move and select (HIG:
 * a segmented control always has a selection, so arrowing commits it), Home/End
 * jump to the ends, and `change` reports the new value. A button without `value`
 * stays a plain action inside the group and is skipped by the selection. Without
 * `value` the group remains a plain container: no roles, no selection.
 *
 * @element ore-button-group
 *
 * @attr {boolean} attached - Join buttons together into a unit
 * @attr {string} color - Shared color tint: 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error'
 * @attr {boolean} fullwidth - Group spans full width
 * @attr {string} label - Accessible label
 * @attr {string} orientation - 'horizontal' | 'vertical'
 * @attr {string} rounded - Corner radius: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full' (bare attribute defaults to 'full')
 * @attr {string} size - Shared size: 'sm' | 'md' | 'lg'
 * @attr {string} value - Value of the currently selected button (enables segmented selection)
 * @attr {string} variant - Shared visual variant: 'solid' | 'flat' | 'bordered' | 'outline' | 'ghost' | 'frost'
 *
 * @fires change - Emitted when the selected button changes. detail: { values: string[], labels: string[], originalEvent?: Event }
 *
 * @slot - Place ore-button elements here
 *
 * @cssprop --group-gap - Gap between buttons (non-attached mode)
 * @cssprop --group-radius - Border radius of the group container, defaults to the `rounded` attribute's token
 * @cssprop --button-radius - Passed through to child buttons to control corner radius
 * @cssprop --button-border-start - Passed through to suppress start borders in attached mode
 * @cssprop --button-border-top - Passed through to suppress top borders in vertical attached mode
 * @part group - Group container.
 * @example
 * ```html
 * <ore-button-group attached rounded="full">
 *   <ore-button variant="solid" color="primary">Save</ore-button>
 *   <ore-button variant="solid" color="primary">Save &amp; Continue</ore-button>
 * </ore-button-group>
 * <ore-button-group attached value="list" label="View mode" color="primary">
 *   <ore-button value="list">List</ore-button>
 *   <ore-button value="grid">Grid</ore-button>
 * </ore-button-group>
 * <ore-button-group orientation="vertical" size="sm">
 *   <ore-button>Top</ore-button>
 *   <ore-button>Middle</ore-button>
 *   <ore-button>Bottom</ore-button>
 * </ore-button-group>
 * ```
 */
export const BUTTON_GROUP_TAG = 'ore-button-group' as const;
define<OreButtonGroupProps>(BUTTON_GROUP_TAG, {
  props: {
    ...themableBundle,
    ...sizableBundle,
    ...roundableBundle,
    attached: prop.bool(false),
    fullwidth: prop.bool(false),
    label: prop.string(),
    orientation: prop.oneOf(BUTTON_GROUP_ORIENTATIONS),
    // Not auto-reflected (`reflect: false`), the same reason ore-radio-group
    // documents: the derived selection (`selectedValue`) is the single writer of
    // this attribute via `bind()` below, and letting the prop's own reflection
    // also write it would leave two effects racing to set one attribute.
    value: { ...prop.string(), reflect: false },
    variant: prop.oneOf(VISUAL_VARIANTS),
  },
  setup(props) {
    const el = getHost();
    const emit = useEmit<OreButtonGroupEvents>();
    const slots = useSlots();

    // The group owns the selection: `value` seeds it, every selection path
    // (click, arrow, attribute write) lands in the same signal, and the
    // attribute reflects what the user sees so markup stays inspectable.
    const selectedValue = signal<string | undefined>(props.value.value);
    const segmented = computed(() => selectedValue.value !== undefined);

    // Direct children only: the same set the stylesheet's `::slotted(ore-button)`
    // rules reach, so the selection can never claim a button the group does not
    // visually own (a nested group's buttons stay its own).
    const getButtons = (): HTMLElement[] => Array.from(el.querySelectorAll<HTMLElement>(':scope > ore-button'));
    const getSelectableButtons = (): HTMLElement[] =>
      getButtons().filter((button) => button.getAttribute('value') !== null && !button.hasAttribute('disabled'));

    const select = (value: string, originalEvent?: Event): void => {
      if (selectedValue.value === value) return;

      selectedValue.value = value;

      const labels = [getChoiceLabel(getButtons(), value)];

      emit('change', { labels, originalEvent, values: [value] });
    };

    provide(BUTTON_GROUP_CTX, {
      color: props.color!,
      segmented,
      size: props.size!,
      value: selectedValue,
      variant: props.variant!,
    });

    bind({
      attr: {
        value: () => selectedValue.value ?? null,
      },
    });

    // The group never writes a child's attributes: `ore-button` reads this
    // context and binds its own `role`/`aria-checked`/`tabindex`, the same
    // division `ore-radio-group` and `ore-tabs` keep. What the group does own is
    // that a selection always exists once the group is segmented: a `value` that
    // names no usable button falls back to the first selectable one, because a
    // radiogroup with nothing checked is not a valid state. With no valued button
    // yet (late slot bindings, async children) the selection defers rather than
    // overwriting a value the consumer already chose — `ore-tabs` documents the
    // same race.
    const ensureSelection = (): void => {
      // Only maintains an existing selection: a group that was never given a
      // `value` stays a plain container, it does not invent a selection of its
      // own (that is what `value` is for).
      if (selectedValue.value === undefined) return;

      const usable = getSelectableButtons();

      if (usable.length > 0) {
        const current = selectedValue.value;

        if (current && usable.some((button) => button.getAttribute('value') === current)) return;

        selectedValue.value = usable[0]?.getAttribute('value') ?? undefined;

        return;
      }

      // No selectable option. With children present that is definitive: a `value`
      // on a group of plain buttons is a stray attribute, and honouring it would
      // advertise `role="radiogroup"` over children that are not radios. With an
      // empty slot the children simply have not arrived yet, so the selection
      // defers rather than discarding a value the consumer already chose —
      // `ore-tabs` documents the same race.
      if (slots.elements().value.length > 0) selectedValue.value = undefined;
    };

    // Attribute/property writes drive the signal (controlled `value`), the same
    // loop ore-tabs runs: the group's own reflection re-enters here as an
    // already-equal write, which the signal ignores.
    watch(props.value, (value) => {
      selectedValue.value = value;
      ensureSelection();
    });

    // Late slot bindings and asynchronously created buttons land after mount, so
    // the selection is re-derived whenever the slotted set changes.
    watchEffect(() => {
      void slots.elements().value;
      ensureSelection();
    });

    // Arrow keys move *and* select (a segmented control always has a selection),
    // re-seeded from the event path so pointer focus and the control's index
    // agree - the same pattern ore-radio-group uses.
    const listControl = createListControl<HTMLElement>({
      direction: () => elementDirection(el),
      getItems: getSelectableButtons,
      keys: { next: ['ArrowDown', 'ArrowRight'], prev: ['ArrowUp', 'ArrowLeft'] },
      loop: true,
      onNavigate: ({ event, item }) => {
        item.focus();
        select(item.getAttribute('value') ?? '', event);
      },
      signal: lifecycleSignal(onCleanup),
    });

    bind({
      on: {
        click: (event: MouseEvent) => {
          const button = event
            .composedPath()
            .find((node): node is HTMLElement => node instanceof HTMLElement && node.localName === 'ore-button');

          if (!button || button.closest('ore-button-group') !== el) return;

          const value = button.getAttribute('value');

          if (value === null || button.hasAttribute('disabled') || selectedValue.value === undefined) return;

          select(value, event);
        },
        keydown: (event: KeyboardEvent) => {
          if (event.defaultPrevented || selectedValue.value === undefined) return;

          const buttons = getSelectableButtons();

          if (buttons.length === 0) return;

          const path = event.composedPath();
          const focusedIndex = buttons.findIndex((button) => path.includes(button));

          if (focusedIndex === -1) return;

          listControl.set(focusedIndex);
          listControl.handleKeydown(event);
        },
      },
    });

    return html`
      <div
        class="button-group"
        part="group"
        role="${() => (segmented.value ? 'radiogroup' : 'group')}"
        aria-label="${props.label}">
        <slot></slot>
      </div>
    `;
  },
  styles: [roundedVariantMixin, componentStyles],
});
