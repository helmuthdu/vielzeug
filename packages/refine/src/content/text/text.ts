import { bind, define, getHost, html, prop, useEmit, watchEffect } from '@vielzeug/ore';
import { computed, signal, watch } from '@vielzeug/ripple';
import { warn } from '../../_dev';
import { applyTruncationReveal, createInteraction, parseOptionalBool } from '../../core';
import styles from './text.css?inline';

const TEXT_ALIGNMENTS = ['left', 'center', 'right', 'justify'] as const;
const TEXT_ELEMENTS = ['span', 'p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'label', 'code'] as const;
const TEXT_COLORS = [
  'primary',
  'secondary',
  'info',
  'success',
  'warning',
  'error',
  'heading',
  'body',
  'muted',
  'tertiary',
  'disabled',
  'contrast',
] as const;
const TEXT_SIZES = ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] as const;
const TEXT_VARIANTS = ['body', 'heading', 'label', 'caption', 'overline', 'code'] as const;
const TEXT_WEIGHTS = ['normal', 'medium', 'semibold', 'bold'] as const;

/** Text component events */
export type OreTextEvents = {
  'expand-change': { expanded: boolean };
};

/** Text component properties */
export type OreTextProps = {
  /** Text alignment */
  align?: (typeof TEXT_ALIGNMENTS)[number];
  /** Semantic HTML element to render as: sets the correct ARIA role/level on the host */
  as?: (typeof TEXT_ELEMENTS)[number];
  /** Text color (semantic + theme colors) */
  color?: (typeof TEXT_COLORS)[number];
  /** Initial uncontrolled expanded state. Ignored when `expanded` is set. */
  'default-expanded'?: boolean;
  /** Let the reader tap/click to reveal text clipped by `truncate` or `lines`. */
  expandable?: boolean;
  /** Controlled expanded state. When set, the component shows this and only emits `expand-change`. */
  expanded?: boolean;
  /** Italic text style */
  italic?: boolean;
  /** Clamp text to N lines with an ellipsis (multi-line truncation) */
  lines?: number;
  /** Text size: maps to --text-* tokens for body variants and --heading-* tokens for the heading variant */
  size?: (typeof TEXT_SIZES)[number];
  /** Enable single-line text truncation with ellipsis */
  truncate?: boolean;
  /** Text semantic variant */
  variant?: (typeof TEXT_VARIANTS)[number];
  /** Font weight */
  weight?: (typeof TEXT_WEIGHTS)[number];
};

/**
 * A typography component with semantic variants and responsive sizing.
 *
 * @element ore-text
 *
 * @attr {string} variant - Text variant: 'body' | 'heading' | 'label' | 'caption' | 'overline' | 'code'
 * @attr {string} size - Font size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'. Maps to --text-* tokens for body variants and --heading-* tokens for the heading variant.
 * @attr {string} weight - Font weight: 'normal' | 'medium' | 'semibold' | 'bold'
 * @attr {string} color - Text color: 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error' | 'heading' | 'body' | 'muted' | 'tertiary' | 'disabled' | 'contrast'
 * @attr {string} align - Text alignment: 'left' | 'center' | 'right' | 'justify'
 * @attr {boolean} truncate - Truncate text with ellipsis when it overflows (single-line)
 * @attr {number} lines - Clamp to N lines with ellipsis (multi-line truncation)
 * @attr {boolean} expandable - Reveal clipped text on click/tap (pairs with `truncate` or `lines`)
 * @attr {boolean} expanded - Controlled expanded state for an `expandable` text
 * @attr {boolean} default-expanded - Initial uncontrolled expanded state
 * @attr {boolean} italic - Italic text style
 * @attr {string} as - Semantic HTML element: 'span' | 'p' | 'div' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'label' | 'code'
 *
 * @slot - Text content
 *
 * @fires expand-change - Fired when an `expandable` text is toggled. detail: { expanded: boolean }
 *
 * @cssprop --text-size - Font size
 * @cssprop --text-weight - Font weight
 * @cssprop --text-color - Text color
 * @cssprop --text-line-height - Line height
 * @cssprop --text-letter-spacing - Letter spacing
 *
 * @example
 * ```html
 * <ore-text variant="heading" size="2xl" weight="bold">Welcome</ore-text>
 * <ore-text as="h2" variant="heading" size="xl">Section title</ore-text>
 * <ore-text color="primary" weight="semibold">Important notice</ore-text>
 * <ore-text variant="code">npm install</ore-text>
 * <ore-text lines="2">Long paragraph that clamps at two lines…</ore-text>
 *
 * <!-- Clamp and let the reader expand -->
 * <ore-text lines="2" expandable>Long paragraph, tap to read the rest…</ore-text>
 * ```
 */

export const TEXT_TAG = 'ore-text' as const;
define<OreTextProps>(TEXT_TAG, {
  props: {
    align: prop.oneOf(TEXT_ALIGNMENTS),
    as: prop.oneOf(TEXT_ELEMENTS),
    color: prop.oneOf(TEXT_COLORS),
    'default-expanded': prop.bool(false),
    expandable: prop.bool(false),
    expanded: { default: undefined as boolean | undefined, parse: parseOptionalBool, reflect: false },
    italic: prop.bool(),
    lines: prop.number(),
    size: prop.oneOf(TEXT_SIZES),
    truncate: prop.bool(),
    variant: prop.oneOf(TEXT_VARIANTS),
    weight: prop.oneOf(TEXT_WEIGHTS),
  },
  setup(props) {
    const el = getHost();
    const emit = useEmit<OreTextEvents>();

    // Controlled/uncontrolled disclosure: `expanded` (when present) is the source of
    // truth and only `expand-change` is emitted; otherwise a local signal owns the state.
    const isControlled = () => props.expanded.value !== undefined;
    const expandedState = signal(props['default-expanded'].value);
    const isExpanded = computed(() => (isControlled() ? (props.expanded.value ?? false) : expandedState.value));

    watch(props.expanded, (value) => {
      if (value === undefined) return;

      expandedState.value = value;
    });

    const isTruncating = computed(() => Boolean(props.truncate.value) || props.lines.value != null);

    const pressControl = createInteraction({
      disabled: computed(() => !props.expandable.value),
      onPress: () => {
        const next = !isExpanded.value;

        if (!isControlled()) expandedState.value = next;

        emit('expand-change', { expanded: next });
      },
    });

    if (props.expandable.value && !isTruncating.value) {
      warn('ore-text: "expandable" has nothing to expand without "truncate" or "lines".');
    }

    bind({
      attr: {
        'aria-expanded': () => (props.expandable.value ? String(isExpanded.value) : null),
        'aria-level': () => {
          // aria-level is only valid alongside role="heading"; when `expandable`
          // overrides the role to "button", emitting it would be invalid ARIA.
          if (props.expandable.value) return null;

          const match = /^h([1-6])$/.exec((props.as.value as string) ?? '');

          return match ? match[1] : null;
        },
        // Distinct from the `expanded` prop (which is reflect:false): this drives the
        // CSS that lifts the clamp, and keeps the controlled prop a clean input.
        'data-expanded': () => (props.expandable.value && isExpanded.value ? true : undefined),
        role: () => {
          if (props.expandable.value) return 'button';

          return /^h([1-6])$/.test((props.as.value as string) ?? '') ? 'heading' : null;
        },
        tabindex: () => (props.expandable.value ? '0' : null),
      },
      on: {
        click: (e) => pressControl.handleClick(e as MouseEvent),
        keydown: (e) => pressControl.handleKeydown(e as KeyboardEvent),
      },
      style: {
        '--_lines': () => (props.lines.value != null ? String(props.lines.value) : null),
      },
    });

    // HIG truncation reveal: while the text is actually clamped, mirror the full text
    // into `title` so a pointer user can read what the ellipsis hid. Expanding changes
    // the box size, so the helper's observer clears the title on its own.
    watchEffect(() => {
      if (!isTruncating.value) return;

      return applyTruncationReveal(el, { bothAxes: props.lines.value != null }).detach;
    });

    return html`
      <slot></slot>
    `;
  },
  styles: [styles],
});
