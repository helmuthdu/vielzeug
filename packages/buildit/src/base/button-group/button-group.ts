import { css, defineElement, html } from '@vielzeug/craftit';

/**
 * bit-button-group - A container for grouping buttons together
 *
 * @element bit-button-group
 *
 * @attr {string} orientation - Group orientation: 'horizontal' | 'vertical'
 * @attr {string} size - Button size for all children: 'sm' | 'md' | 'lg'
 * @attr {string} variant - Button variant for all children
 * @attr {string} color - Button color for all children
 * @attr {boolean} attached - Remove spacing between buttons
 * @attr {boolean} fullwidth - Buttons take full width
 *
 * @slot - Button elements to group
 *
 * @cssprop --group-gap - Gap between buttons (default: var(--size-2))
 * @cssprop --group-radius - Border radius for attached mode (default: var(--rounded-md))
 *
 * @example
 * <bit-button-group>
 *   <bit-button variant="bordered">Day</bit-button>
 *   <bit-button variant="solid">Week</bit-button>
 *   <bit-button variant="bordered">Month</bit-button>
 * </bit-button-group>
 */

// -------------------- Styles --------------------
const styles = css`
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

  /* ========================================
     Orientation
     ======================================== */

  :host([orientation='vertical']) .button-group {
    flex-direction: column;
  }

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
`;

// -------------------- Types --------------------
export type ButtonGroupProps = {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'solid' | 'flat' | 'bordered' | 'outline' | 'ghost' | 'text' | 'glass' | 'frost';
  color?: 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error';
  orientation?: 'horizontal' | 'vertical';
  attached?: boolean;
  'fullwidth'?: boolean;
};

// -------------------- Component Definition --------------------
defineElement<HTMLDivElement, ButtonGroupProps>('bit-button-group', {
  observedAttributes: ['size', 'variant', 'color', 'orientation', 'attached', 'fullwidth'] as const,

  onAttributeChanged(name, _oldValue, _newValue, el) {
    if (name === 'size' || name === 'variant' || name === 'color') {
      const host = el as unknown as HTMLElement;
      // Reuse the applyToChildren logic stored on the element
      const applyFn = (host as any).__applyToChildren;
      if (applyFn) applyFn();
    }
  },

  onConnected(el) {
    const host = el as unknown as HTMLElement;

    // Helper to apply attributes to child buttons
    const applyToChildren = () => {
      const size = host.getAttribute('size');
      const variant = host.getAttribute('variant');
      const color = host.getAttribute('color');

      const buttons = host.querySelectorAll('bit-button');
      buttons.forEach((button) => {
        if (size) button.setAttribute('size', size);
        if (variant) button.setAttribute('variant', variant);
        if (color) button.setAttribute('color', color);
      });
    };

    // Store for use in onAttributeChanged
    (host as any).__applyToChildren = applyToChildren;

    // Initial propagation to existing children
    applyToChildren();

    // Re-apply when slotted children change
    const slot = host.shadowRoot?.querySelector('slot');
    if (slot) {
      slot.addEventListener('slotchange', applyToChildren);
    }
  },

  styles: [styles],

  template: () => html`
    <div class="button-group" role="group">
      <slot></slot>
    </div>
  `,
});

export default {};
