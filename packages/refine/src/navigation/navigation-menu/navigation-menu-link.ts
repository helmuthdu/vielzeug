import { define, html, prop } from '@vielzeug/ore';

import linkStyles from './navigation-menu-link.css?inline';

export type OreNavigationMenuLinkProps = {
  active?: boolean;
  href?: string;
  rel?: string;
  target?: string;
};

/**
 * A styled anchor for navigation menu panels.
 *
 * @element ore-navigation-menu-link
 *
 * @attr {boolean} active - Marks the destination as the current page
 * @attr {string} href - Link destination
 * @attr {string} rel - Relationship between the current page and destination
 * @attr {string} target - Browsing context for the destination
 *
 * @slot - Link label and optional content
 *
 * @part link - The native anchor element
 */
export const NAVIGATION_MENU_LINK_TAG = 'ore-navigation-menu-link' as const;
define<OreNavigationMenuLinkProps>(NAVIGATION_MENU_LINK_TAG, {
  props: {
    active: prop.bool(false),
    href: prop.string(),
    rel: prop.string(),
    target: prop.string(),
  },
  setup(props) {
    return html`
      <a
        class="link"
        href="${() => props.href.value || null}"
        target="${() => props.target.value || null}"
        rel="${() => props.rel.value || null}"
        aria-current="${() => (props.active.value ? 'page' : null)}"
        part="link">
        <slot></slot>
      </a>
    `;
  },
  styles: [linkStyles],
});
