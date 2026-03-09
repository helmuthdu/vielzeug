import { createContext, css, define, defineProps, html, provide } from '@vielzeug/craftit';
import type { ComponentSize, ThemeColor, VisualVariant } from '../../types';

/** Context provided by bit-button-group to its bit-button children. */
export interface ButtonGroupContext {
  color: import('@vielzeug/craftit').ReadonlySignal<ThemeColor | undefined>;
  size: import('@vielzeug/craftit').ReadonlySignal<ComponentSize | undefined>;
  variant: import('@vielzeug/craftit').ReadonlySignal<Exclude<VisualVariant, 'glass'> | undefined>;
}
/** Injection key for the button-group context. */
export const BUTTON_GROUP_CTX = createContext<ButtonGroupContext>();

const styles = /* css */ css`
  @layer buildit.base {
    /* ========================================
       Base Styles
       ======================================== */

    :host {
      display: inline-flex;
      --group-gap: var(--size-2);
      --group-radius: var(--rounded-md);
    }

    .button-group {
      display: flex;
      flex-direction: row;
      gap: var(--group-gap);
    }
  }

  @layer buildit.variants {
    /* ========================================
       Orientation
       ======================================== */

    :host([orientation='vertical']) .button-group {
      flex-direction: column;
    }
  }

  @layer buildit.overrides {
    /* ========================================
       Full Width
       ======================================== */

    :host([fullwidth]) {
      display: flex;
      width: 100%;
    }

    :host([fullwidth]) .button-group {
      width: 100%;
    }

    :host([fullwidth]) ::slotted(bit-button) {
      flex: 1;
    }

    /* ========================================
       Attached Mode
       ======================================== */

    :host([attached]) .button-group {
      gap: 0;
    }

    /* Ensure attached buttons have proper z-index on hover/focus */
    :host([attached]) ::slotted(bit-button:hover),
    :host([attached]) ::slotted(bit-button:focus-within) {
      position: relative;
      z-index: 1;
    }

    /* Horizontal attached - remove inner borders and round corners */
    :host([attached]:not([orientation='vertical'])) ::slotted(bit-button) {
      --button-radius: 0;
      margin-inline-start: calc(-1 * var(--border));
    }

    :host([attached]:not([orientation='vertical'])) ::slotted(bit-button:first-child) {
      margin-inline-start: 0;
      --button-radius: var(--group-radius) 0 0 var(--group-radius);
    }

    :host([attached]:not([orientation='vertical'])) ::slotted(bit-button:last-child) {
      --button-radius: 0 var(--group-radius) var(--group-radius) 0;
    }

    /* Vertical attached - remove inner borders and round corners */
    :host([attached][orientation='vertical']) ::slotted(bit-button) {
      --button-radius: 0;
      margin-top: calc(-1 * var(--border));
    }

    :host([attached][orientation='vertical']) ::slotted(bit-button:first-child) {
      margin-top: 0;
      --button-radius: var(--group-radius) var(--group-radius) 0 0;
    }

    :host([attached][orientation='vertical']) ::slotted(bit-button:last-child) {
      --button-radius: 0 0 var(--group-radius) var(--group-radius);
    }
  }
`;

/** Button group component properties */
export interface ButtonGroupProps {
  /** Button size for all children (propagated) */
  size?: ComponentSize;
  /** Button variant for all children (propagated) */
  variant?: Exclude<VisualVariant, 'glass'>;
  /** Button color for all children (propagated) */
  color?: ThemeColor;
  /** Group orientation */
  orientation?: 'horizontal' | 'vertical';
  /** Attach buttons together (no gap, rounded only on edges) */
  attached?: boolean;
  /** Make all buttons full width */
  fullwidth?: boolean;
  /** Accessible group label */
  label?: string;
}

// -------------------- Component Definition --------------------
/**
 * A container for grouping buttons with coordinated styling and layout.
 *
 * @element bit-button-group
 *
 * @attr {string} size - Button size: 'sm' | 'md' | 'lg'
 * @attr {string} variant - Visual variant: 'solid' | 'flat' | 'bordered' | 'outline' | 'ghost' | 'frost'
 * @attr {string} color - Theme color: 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error'
 * @attr {string} orientation - Group orientation: 'horizontal' | 'vertical'
 * @attr {boolean} attached - Attach buttons together (no gap, rounded only on edges)
 * @attr {boolean} fullwidth - Make all buttons full width
 * @attr {string} label - Accessible group label
 *
 * @slot - Button elements (bit-button)
 *
 * @cssprop --group-gap - Gap between buttons
 * @cssprop --group-radius - Border radius for edge buttons
 *
 * @example
 * ```html
 * <bit-button-group><bit-button>First</bit-button><bit-button>Second</bit-button></bit-button-group>
 * ```
 */
export const TAG = define('bit-button-group', () => {
  const props = defineProps<ButtonGroupProps>({
    attached: { default: false },
    color: { default: undefined },
    fullwidth: { default: false },
    label: { default: undefined },
    orientation: { default: undefined },
    size: { default: undefined },
    variant: { default: undefined },
  });

  provide(BUTTON_GROUP_CTX, {
    color: props.color,
    size: props.size,
    variant: props.variant,
  });

  return {
    styles: [styles],
    template: html`
      <div
        class="button-group"
        part="group"
        role="group"
        :aria-label="${() => props.label.value ?? null}"
      >
        <slot></slot>
      </div>
    `,
  };
});

declare global {
  interface HTMLElementTagNameMap {
    'bit-button-group': HTMLElement & ButtonGroupProps;
  }
}
