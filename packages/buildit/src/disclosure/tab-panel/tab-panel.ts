import { css, define, defineProps, html } from '@vielzeug/craftit';

const styles = /* css */ css`
  @layer buildit.base {
    :host {
      display: none;
      width: 100%;
    }

    :host([active]) {
      display: block;
    }

    .panel {
      padding: var(--tab-panel-padding, var(--size-4));
      color: var(--text-color-body);
      font-size: var(--tab-panel-font-size, var(--text-sm));
      animation: tab-panel-in var(--transition-normal) var(--ease-out) both;
    }
  }

  @layer buildit.variants {
    @keyframes tab-panel-in {
      from {
        opacity: 0;
        translate: 0 4px;
      }
      to {
        opacity: 1;
        translate: 0 0;
      }
    }
  }
`;

export interface TabPanelProps {
  /** Must match the `value` of its corresponding bit-tab-item */
  value: string;
  /** Active state (managed by bit-tabs) */
  active?: boolean;
}

/**
 * Content panel for a tab. Shown when its `value` matches the selected tab.
 *
 * @element bit-tab-panel
 *
 * @attr {string} value - Must match the corresponding bit-tab-item value
 * @attr {boolean} active - Toggled by the parent bit-tabs
 *
 * @slot - Panel content
 *
 * @example
 * ```html
 * <bit-tab-panel value="overview"><p>Overview content here</p></bit-tab-panel>
 * ```
 */
define('bit-tab-panel', () => {
  const props = defineProps({
    value: { default: '' },
    active: { default: false },
  });

  return {
    styles: [styles],
    template: html`
      <div
        class="panel"
        part="panel"
        role="tabpanel"
        :aria-hidden=${() => String(!props.active.value)}
        tabindex="0"
      >
        <slot></slot>
      </div>
    `,
  };
});

export default {};
