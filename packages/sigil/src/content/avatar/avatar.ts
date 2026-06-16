import { define, html, prop } from '@vielzeug/craft';
import { computed, signal, watch } from '@vielzeug/ripple';

import type { ComponentSize, RoundedSize, ThemeColor } from '../../types';

import '../icon/icon';
import { roundableBundle, sizableBundle, themableBundle } from '../../shared';
import { colorThemeMixin, roundedVariantMixin, sizeVariantMixin } from '../../styles';
import groupStyles from './avatar-group.css?inline';
import componentStyles from './avatar.css?inline';

export type AvatarStatus = 'online' | 'offline' | 'busy' | 'away';

const STATUS_LABELS: Record<AvatarStatus, string> = {
  away: 'Away',
  busy: 'Busy',
  offline: 'Offline',
  online: 'Online',
};

/** Avatar component properties */
export type SgAvatarProps = {
  /** Alt text for the image; also used to derive initials when no `initials` prop is given */
  alt?: string;
  /** Theme color (used for initials background) */
  color?: ThemeColor;
  /** Explicit initials to display when no image is available (e.g. "JD") */
  initials?: string;
  /** Border radius */
  rounded?: RoundedSize | '';
  /** Component size */
  size?: ComponentSize;
  /** Image source URL */
  src?: string;
  /** Online presence indicator */
  status?: AvatarStatus;
};

// ============================================
// Component
// ============================================

/**
 * Displays a user avatar: image → initials → generic fallback icon, in that priority order.
 *
 * @element sg-avatar
 *
 * @attr {string} src - Image source URL
 * @attr {string} alt - Image alt text (also used to derive initials)
 * @attr {string} initials - Explicit initials (up to 2 chars)
 * @attr {string} color - Theme color for initials background: 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error'
 * @attr {string} size - 'sm' | 'md' | 'lg'
 * @attr {string} rounded - Border radius: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full'
 * @attr {string} status - 'online' | 'offline' | 'busy' | 'away'
 *
 * @slot - Fallback content shown when image and initials are unavailable.
 * @cssprop --avatar-size - Diameter of the avatar
 * @cssprop --avatar-bg - Background color
 * @cssprop --avatar-color - Text/icon color
 * @cssprop --avatar-radius - Border radius
 * @cssprop --avatar-border - Border shorthand
 * @cssprop --avatar-border-color - Border color (also controls status dot border)
 *
 * @part avatar - Avatar root container.
 * @part img - Image element.
 * @part initials - Initials fallback element.
 * @part fallback - Shadow part for the `fallback` element.
 * @part status - Status indicator element.
 * @part overflow - Overflow indicator element.
 * @example
 * ```html
 * <sg-avatar src="/jane.jpg" alt="Jane Doe"></sg-avatar>
 * <sg-avatar initials="JD" color="primary"></sg-avatar>
 * <sg-avatar alt="John Smith" status="online"></sg-avatar>
 * ```
 */
export const AVATAR_TAG = 'sg-avatar' as const;
define<SgAvatarProps>(AVATAR_TAG, {
  props: {
    ...themableBundle,
    ...sizableBundle,
    ...roundableBundle,
    alt: prop.string(),
    initials: prop.string(),
    src: prop.string(),
    status: prop.string<AvatarStatus>(),
  },
  setup(props) {
    const imgFailed = signal(false);

    // Reset stale error state whenever src changes
    watch(props.src, () => {
      imgFailed.value = false;
    });

    // Attach load/error listeners reactively when the img element mounts
    const attachImgListeners = (el: HTMLImageElement | null) => {
      if (!el) return;

      el.addEventListener('error', () => {
        imgFailed.value = true;
      });
      el.addEventListener('load', () => {
        imgFailed.value = false;
      });
    };
    const derivedInitials = computed(() => {
      if (props.initials.value) return props.initials.value.slice(0, 2);

      const alt = props.alt.value;

      if (!alt) return '';

      const parts = alt.trim().split(/\s+/);

      if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();

      return parts[0].slice(0, 2).toUpperCase();
    });
    const showImage = computed(() => !!props.src.value && !imgFailed.value);
    const showInitials = computed(() => !showImage.value && !!derivedInitials.value);
    const showFallback = computed(() => !showImage.value && !showInitials.value);
    const avatarLabel = () => {
      const name = (props.alt.value as string | undefined) || null;
      const statusKey = props.status.value as AvatarStatus | undefined;
      const status = statusKey ? STATUS_LABELS[statusKey] : null;

      if (!name && !status) return null;

      if (!name) return `Status: ${status}`;

      if (!status) return name;

      return `${name}, ${status}`;
    };
    const avatarRole = () => (avatarLabel() ? 'img' : null);

    return html`
      <span class="avatar" part="avatar" :aria-label="${avatarLabel}" :role="${avatarRole}">
        ${() =>
          props.src.value
            ? html`<img
                ref="${attachImgListeners}"
                part="img"
                :src="${props.src}"
                :alt="${props.alt}"
                ?hidden="${() => !showImage.value}"
                aria-hidden="true" />`
            : ''}
        ${() =>
          showInitials.value
            ? html`<span class="initials" part="initials" aria-hidden="true">${derivedInitials}</span>`
            : ''}
        ${() =>
          showFallback.value
            ? html`<sg-icon class="icon-fallback" part="fallback" name="user" size="50%"></sg-icon>`
            : ''}
      </span>
      ${() =>
        props.status.value
          ? html`<span class="status" part="status" :data-status="${props.status}" aria-hidden="true"></span>`
          : ''}
    `;
  },
  styles: [
    colorThemeMixin,
    roundedVariantMixin,
    sizeVariantMixin({
      lg: { fontSize: 'var(--avatar-font-size, var(--text-base))', size: 'var(--avatar-size, var(--size-14))' },
      md: { fontSize: 'var(--avatar-font-size, var(--text-sm))', size: 'var(--avatar-size, var(--size-10))' },
      sm: { fontSize: 'var(--avatar-font-size, var(--text-xs))', size: 'var(--avatar-size, var(--size-7))' },
    }),
    componentStyles,
  ],
});

// ============================================
// AvatarGroup
// ============================================

/** AvatarGroup component properties */
export type SgAvatarGroupProps = {
  /** Maximum number of avatars to show before showing a +N badge */
  max?: number;
  /** Total count shown in the overflow badge (defaults to the actual hidden count) */
  total?: number;
};

/**
 * Groups multiple `sg-avatar` elements in a stacked, overlapping row.
 *
 * @element sg-avatar-group
 *
 * @attr {number} max - Max visible avatars before overflow badge (default: 5)
 * @attr {number} total - Override the total count displayed in the badge
 *
 * @slot - `sg-avatar` elements
 *
 * @cssprop --avatar-group-overlap - Negative margin creating the overlap (default: -0.75rem)
 *
 * @part overflow - Overflow count badge shown when avatars exceed `max`.
 *
 * @example
 * ```html
 * <sg-avatar-group max="3">
 *   <sg-avatar src="/a.jpg" alt="Alice"></sg-avatar>
 *   <sg-avatar src="/b.jpg" alt="Bob"></sg-avatar>
 *   <sg-avatar src="/c.jpg" alt="Carol"></sg-avatar>
 *   <sg-avatar src="/d.jpg" alt="Dave"></sg-avatar>
 * </sg-avatar-group>
 * ```
 */
export const AVATAR_GROUP_TAG = 'sg-avatar-group' as const;
define<SgAvatarGroupProps>(AVATAR_GROUP_TAG, {
  props: {
    max: prop.number(5),
    total: prop.json(undefined as number | undefined),
  },
  setup(props, { el, slots, watch }) {
    const overflowCount = signal(0);

    const updateVisibility = () => {
      const avatars = [...el.querySelectorAll('sg-avatar')];
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
          ? html`<span class="overflow-badge" part="overflow" aria-label="${overflowLabel}"> ${overflowText} </span>`
          : ''}
    `;
  },
  styles: [groupStyles],
});
