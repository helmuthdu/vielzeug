import { define, html, prop } from '@vielzeug/ore';
import { computed } from '@vielzeug/ripple';
import { sizeVariantMixin, touchTargetMixin } from '../../styles';
import { LINK_TARGETS, type LinkTarget } from '../../types';
import { useLinkProps } from '../../utils';
import componentStyles from './app-store-button.css?inline';

/** Stores with a badge treatment. Logo path data is CC0 (see THIRD_PARTY_NOTICES); the store names and marks remain trademarks of their respective owners. */
export const APP_STORES = ['apple', 'google-play', 'huawei'] as const;
export type AppStore = (typeof APP_STORES)[number];

/** Visual treatment: a solid inverted slab, or a bordered `currentColor` outline. */
export const APP_STORE_BUTTON_VARIANTS = ['filled', 'outline'] as const;
export type AppStoreButtonVariant = (typeof APP_STORE_BUTTON_VARIANTS)[number];

/** The badge ships two sizes: `md` 40px and `lg` 44px, matching store-badge conventions. */
export const APP_STORE_BUTTON_SIZES = ['md', 'lg'] as const;
export type AppStoreButtonSize = (typeof APP_STORE_BUTTON_SIZES)[number];

type Badge = { eyebrow: string; label: string; logo: string; name: string };

// Badge lockups: eyebrow + store name + the accessible name matching the printed badge text.
// Logo paths are the simple-icons monochrome marks (viewBox 0 0 24 24).
const APP_STORE_BADGES: Record<AppStore, Badge> = {
  apple: {
    eyebrow: 'Download on the',
    label: 'Download on the App Store',
    logo: 'M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701',
    name: 'App Store',
  },
  'google-play': {
    eyebrow: 'Get it on',
    label: 'Get it on Google Play',
    logo: 'M22.018 13.298l-3.919 2.218-3.515-3.493 3.543-3.521 3.891 2.202a1.49 1.49 0 0 1 0 2.594zM1.337.924a1.486 1.486 0 0 0-.112.568v21.017c0 .217.045.419.124.6l11.155-11.087L1.337.924zm12.207 10.065l3.258-3.238L3.45.195a1.466 1.466 0 0 0-.946-.179l11.04 10.973zm0 2.067l-11 10.933c.298.036.612-.016.906-.183l13.324-7.54-3.23-3.21z',
    name: 'Google Play',
  },
  huawei: {
    eyebrow: 'Explore it on',
    label: 'Explore it on AppGallery',
    logo: 'M6.734 0C1.804 0 0 1.803 0 6.733v10.535C0 22.198 1.803 24 6.734 24h10.529C22.193 24 24 22.197 24 17.268V6.733C24 1.803 22.197 0 17.266 0zM8 4h.565A3.439 3.439 0 0 0 12 7.435 3.439 3.439 0 0 0 15.435 4H16c0 2.206-1.794 4-4 4S8 6.206 8 4zm6.468 8h.52l.713 2.16.696-2.158h.66l-1.092 3.14h-.532l-.714-2.063-.714 2.063h-.528l-1.095-3.14h.678l.694 2.158zm6.236 0h.629v3.138h-.629zM2.666 12h.638v1.267h1.439V12h.637v3.142h-.637v-1.276h-1.44v1.276h-.637zm5.668 0h.637v1.772c0 .9-.496 1.417-1.36 1.417-.856 0-1.347-.507-1.347-1.39v-1.797H6.9v1.775c0 .524.255.805.719.805.46 0 .714-.273.714-.784zm2.344 0h.563l1.378 3.14h-.668l-.282-.654H10.23l-.286.654h-.651zm6.893.002h2.312v.572H18.2v.643h1.16v.573H18.2v.777h1.744v.573H17.57zm-6.623.793-.48 1.124h.964z',
    name: 'AppGallery',
  },
};

/** App store download badge component properties. */
export type OreAppStoreButtonProps = {
  /** Store listing URL: with it the badge renders as an `<a>`; without it, as an image badge. */
  href?: string;
  /** Accessible label override: defaults to the store's badge text. */
  label?: string;
  /** Link rel attribute (requires href; `noopener noreferrer` is added automatically for `target="_blank"`). */
  rel?: string;
  /** Badge size: 'md' (40px) | 'lg' (44px) */
  size?: AppStoreButtonSize;
  /** Which store badge to render */
  store?: AppStore;
  /** Link target (requires href) */
  target?: LinkTarget;
  /** Visual variant: 'filled' (inverted slab) | 'outline' (bordered, currentColor) */
  variant?: AppStoreButtonVariant;
};

/**
 * An app-store download badge: store logo plus the "Download on the / App Store"
 * lockup, linking to a store listing. `filled` renders the classic inverted slab
 * from theme contrast tokens (dark ink in the light appearance, light slab in
 * the dark one); `outline` renders a bordered badge drawn with `currentColor`.
 * With `href` the badge is a real anchor (safe-`rel` merge included); without
 * one it is an `img`-role badge so assistive tech still reads the printed text.
 *
 * @element ore-app-store-button
 *
 * @attr {string} store - Store badge: 'apple' | 'google-play' | 'huawei' (default: 'apple')
 * @attr {string} variant - Visual variant: 'filled' | 'outline' (default: 'filled')
 * @attr {string} size - Badge size: 'md' | 'lg' (default: 'md')
 * @attr {string} href - Store listing URL; renders an anchor when set
 * @attr {string} rel - Anchor rel attribute
 * @attr {string} target - Anchor browsing context
 * @attr {string} label - Accessible label override (defaults to the badge text)
 *
 * @part link - The anchor (href set) or image-role span rendering the badge
 * @part logo - The store logo wrapper
 * @part labels - The two-line text lockup wrapper
 * @part eyebrow - The small uppercase line ("Download on the")
 * @part store - The store name line ("App Store")
 *
 * @cssprop --app-store-button-filled-bg - Background of the filled badge (default: `--color-contrast-900`)
 * @cssprop --app-store-button-filled-color - Foreground of the filled badge (default: `--color-contrast-50`)
 * @cssprop --app-store-button-filled-hover-bg - Filled badge background on hover (default: `--color-contrast-800`)
 * @cssprop --app-store-button-outline-color - Foreground of the outline badge (default: `--text-color-heading`)
 * @cssprop --app-store-button-outline-border-color - Outline badge border color (default: `--color-neutral-border`)
 * @cssprop --app-store-button-outline-hover-bg - Outline badge background on hover (default: `--color-neutral-backdrop`)
 * @cssprop --app-store-button-radius - Badge corner radius (default: `--rounded-lg`)
 * @cssprop --app-store-button-eyebrow-opacity - Opacity of the small eyebrow line (default: 0.85)
 *
 * @example
 * ```html
 * <ore-app-store-button store="apple" href="https://apps.apple.com/app/id000000000"></ore-app-store-button>
 * <ore-app-store-button store="google-play" variant="outline" size="lg"
 *   href="https://play.google.com/store/apps/details?id=com.example"></ore-app-store-button>
 * ```
 */
export const APP_STORE_BUTTON_TAG = 'ore-app-store-button' as const;
define<OreAppStoreButtonProps>(APP_STORE_BUTTON_TAG, {
  props: {
    href: prop.string(),
    label: prop.string(),
    rel: prop.string(),
    size: prop.oneOf(APP_STORE_BUTTON_SIZES),
    store: prop.oneOf(APP_STORES, 'apple'),
    target: prop.oneOf(LINK_TARGETS),
    variant: prop.oneOf(APP_STORE_BUTTON_VARIANTS),
  },
  setup(props) {
    const badge = computed(() => APP_STORE_BADGES[props.store.value ?? 'apple']);
    const accessibleName = computed(() => props.label.value ?? badge.value.label);

    // Same safe-rel contract every refine anchor uses: `noopener noreferrer` is
    // merged in whenever target="_blank", so a store link can't reach back.
    const { effectiveRel } = useLinkProps(props.href, props.rel, props.target);
    const isLink = computed(() => !!props.href.value);

    // A factory, not a shared result: the anchor/image switch re-renders when
    // `href` arrives or is removed at runtime, and ore templates consume a
    // result's fragment children on first embed.
    const badgeLockup = () => html`
      <span class="logo" part="logo" aria-hidden="true">
        <svg viewBox="0 0 24 24" focusable="false"><path d="${() => badge.value.logo}"></path></svg>
      </span>
      <span class="labels" part="labels" aria-hidden="true">
        <span class="eyebrow" part="eyebrow">${() => badge.value.eyebrow}</span>
        <span class="store" part="store">${() => badge.value.name}</span>
      </span>
    `;

    return html`
      ${() =>
        isLink.value
          ? html`
              <a
                class="badge"
                part="link"
                aria-label="${accessibleName}"
                href="${props.href}"
                rel="${effectiveRel}"
                target="${props.target}">
                ${badgeLockup()}
              </a>
            `
          : html`
              <span class="badge" part="link" role="img" aria-label="${accessibleName}">${badgeLockup()}</span>
            `}
    `;
  },
  styles: [
    sizeVariantMixin({
      lg: {
        fontSize: 'var(--text-lg)',
        gap: 'var(--size-2-5)',
        height: 'var(--size-11)',
        iconSize: 'var(--size-7)',
        lineHeight: 'var(--leading-none)',
        padding: 'var(--size-2-5) var(--size-5)',
      },
      md: {
        fontSize: 'var(--text-base)',
        gap: 'var(--size-2)',
        height: 'var(--size-10)',
        iconSize: 'var(--size-6)',
        lineHeight: 'var(--leading-none)',
        padding: 'var(--size-2) var(--size-4)',
      },
    }),
    // Must come after `sizeVariantMixin` (see `ore-input`'s ordering note).
    touchTargetMixin,
    componentStyles,
  ],
});
