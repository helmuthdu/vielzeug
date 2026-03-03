import type { ComponentSize, ThemeColor, VisualVariant } from '../../types';

const styles = /* css */ `
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
      margin-left: calc(-1 * var(--border));
    }

    :host([attached]:not([orientation='vertical'])) ::slotted(bit-button:first-child) {
      margin-left: 0;
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
}

// -------------------- Component Definition --------------------
/**
 * A container for grouping buttons with coordinated styling and layout.
 *
 * @element bit-button-group
 *
 * @attr {string} size - Button size: 'sm' | 'md' | 'lg' (propagated to children)
 * @attr {string} variant - Visual variant: 'solid' | 'flat' | 'bordered' | 'outline' | 'ghost' | 'frost' (propagated to children)
 * @attr {string} color - Theme color: 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error' | 'neutral' (propagated to children)
 * @attr {string} orientation - Group orientation: 'horizontal' | 'vertical'
 * @attr {boolean} attached - Attach buttons together (no gap, rounded only on edges)
 * @attr {boolean} fullwidth - Make all buttons full width
 *
 * @slot - Button elements (bit-button)
 *
 * @cssprop --group-gap - Gap between buttons
 * @cssprop --group-radius - Border radius for edge buttons
 *
 * @example
 * ```html
 * <bit-button-group><bit-button>First</bit-button><bit-button>Second</bit-button></bit-button-group>
 * <bit-button-group attached color="primary"><bit-button>Left</bit-button><bit-button>Right</bit-button></bit-button-group>
 * ```
 */
import { define, defineProps, handle, html, onMount, watch } from '@vielzeug/craftit';

define('bit-button-group', ({ host }) => {
  const props = defineProps({
    color: { default: undefined as ThemeColor | undefined },
    size: { default: undefined as ComponentSize | undefined },
    variant: { default: undefined as Exclude<VisualVariant, 'glass'> | undefined },
  });

  const applyToChildren = () => {
    const size = props.size.value;
    const variant = props.variant.value;
    const color = props.color.value;
    host.querySelectorAll('bit-button').forEach((btn) => {
      if (size) btn.setAttribute('size', size);
      if (variant) btn.setAttribute('variant', variant);
      if (color) btn.setAttribute('color', color);
    });
  };

  watch([props.size, props.variant, props.color], () => applyToChildren(), { immediate: true });

  onMount(() => {
    // slot is only queryable from shadow DOM after template render
    const slot = host.shadowRoot?.querySelector('slot') as HTMLSlotElement | null;
    if (slot) handle(slot, 'slotchange', applyToChildren);
  });

  return {
    styles: [styles],
    template: html`<div class="button-group" part="group" role="group"><slot></slot></div>`,
  };
});

export default {};
