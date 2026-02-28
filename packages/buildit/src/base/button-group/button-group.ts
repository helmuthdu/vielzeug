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
class BitButtonGroup extends HTMLElement {
  static observedAttributes = ['size', 'variant', 'color', 'orientation', 'attached', 'fullwidth'] as const;

  private applyToChildren: () => void;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    // Helper to apply attributes to child buttons
    this.applyToChildren = () => {
      const size = this.getAttribute('size');
      const variant = this.getAttribute('variant');
      const color = this.getAttribute('color');

      const buttons = this.querySelectorAll('bit-button');
      buttons.forEach((button) => {
        if (size) button.setAttribute('size', size);
        if (variant) button.setAttribute('variant', variant);
        if (color) button.setAttribute('color', color);
      });
    };
  }

  connectedCallback() {
    this.render();

    // Initial propagation to existing children
    this.applyToChildren();

    // Re-apply when slotted children change
    const slot = this.shadowRoot?.querySelector('slot');
    if (slot) {
      slot.addEventListener('slotchange', this.applyToChildren);
    }
  }

  attributeChangedCallback(name: string) {
    if (name === 'size' || name === 'variant' || name === 'color') {
      this.applyToChildren();
    }
  }

  render() {
    this.shadowRoot!.innerHTML = /* html */ `
      <style>${styles}</style>
      <div class="button-group" part="group" role="group">
        <slot></slot>
      </div>
    `;
  }
}

if (!customElements.get('bit-button-group')) {
  customElements.define('bit-button-group', BitButtonGroup);
}

export default {};
