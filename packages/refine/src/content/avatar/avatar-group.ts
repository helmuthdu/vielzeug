import { define, getHost, html, prop, useSlots, watchEffect } from '@vielzeug/ore';
import { signal } from '@vielzeug/ripple';

import componentStyles from './avatar-group.css?inline';

/** AvatarGroup component properties */
export type OreAvatarGroupProps = {
  /** Maximum number of avatars to show before showing a +N badge */
  max?: number;
  /** Total count shown in the overflow badge (defaults to the actual hidden count) */
  total?: number;
};

/**
 * Groups multiple `ore-avatar` elements in a stacked, overlapping row.
 *
 * @element ore-avatar-group
 *
 * @attr {number} max - Max visible avatars before overflow badge (default: 5)
 * @attr {number} total - Override the total count displayed in the badge
 *
 * @slot - `ore-avatar` elements
 *
 * @cssprop --avatar-group-overlap - Negative margin creating the overlap (default: -0.75rem)
 *
 * @part overflow - Overflow count badge shown when avatars exceed `max`.
 *
 * @example
 * ```html
 * <ore-avatar-group max="3">
 *   <ore-avatar src="/a.jpg" alt="Alice"></ore-avatar>
 *   <ore-avatar src="/b.jpg" alt="Bob"></ore-avatar>
 *   <ore-avatar src="/c.jpg" alt="Carol"></ore-avatar>
 *   <ore-avatar src="/d.jpg" alt="Dave"></ore-avatar>
 * </ore-avatar-group>
 * ```
 */
export const AVATAR_GROUP_TAG = 'ore-avatar-group' as const;
define<OreAvatarGroupProps>(AVATAR_GROUP_TAG, {
  props: {
    max: prop.number(5),
    total: prop.number(),
  },
  setup(props) {
    const el = getHost();
    const slots = useSlots();
    const watch = watchEffect;

    const overflowCount = signal(0);

    const updateVisibility = () => {
      const avatars = [...el.querySelectorAll('ore-avatar')];
      const max = Number(props.max.value) || 5;
      const hidden = Math.max(0, avatars.length - max);

      overflowCount.value = props.total.value != null ? Number(props.total.value) - max : hidden;
      avatars.forEach((a, i) => {
        if (i >= max) a.setAttribute('data-avatar-group-hidden', '');
        else a.removeAttribute('data-avatar-group-hidden');
      });
    };

    watch(() => {
      void slots.elements().value;
      updateVisibility();
    });

    const overflowLabel = () => `+${overflowCount.value} more`;
    const overflowText = () => `+${overflowCount.value}`;

    return html`
      <slot></slot>
      ${() =>
        overflowCount.value > 0
          ? html`
              <span class="overflow-badge" part="overflow" aria-label="${overflowLabel}">${overflowText}</span>
            `
          : ''}
    `;
  },
  styles: [componentStyles],
});
