import { createId, define, each, getHost, html, prop, useEmit, when } from '@vielzeug/ore';
import { signal, watch } from '@vielzeug/ripple';

import { reducedMotionMixin } from '../../styles';

// The child components this banner renders. The bare-import form is not enough:
// the per-entry library build drops side-effect-only imports between entry
// modules, so these re-export the tags as bindings — the bundler keeps the
// module link, and importing `@vielzeug/refine/cookie-banner` registers
// ore-button and ore-checkbox on its own.

import { eventFieldChecked } from '../../inputs/shared/native-field-event';
import componentStyles from './cookie-banner.css?inline';

export { BUTTON_TAG } from '../../inputs/button/button';
export { CHECKBOX_TAG } from '../../inputs/checkbox/checkbox';
/** A consent category offered as an opt-in checkbox. `id` is the key the `decide` detail is built from. */
export type OreCookieBannerCategory = { description?: string; id: string; label: string };

/** All rendered labels, each with an English default — pass translated strings for other locales. */
export type OreCookieBannerLabels = Partial<{
  acceptAll: string;
  essential: string;
  essentialNote: string;
  heading: string;
  reject: string;
  save: string;
}>;

/** The consent record emitted by `decide`: every category id plus `essential`, always true. */
export type CookieConsentRecord = Record<string, boolean>;

/** Element interface exposing the imperative API for `ore-cookie-banner`. */
export interface CookieBannerElement extends HTMLElement, OreCookieBannerProps {
  /** Hides the banner without emitting anything — persistence stays with the consumer. */
  hide(): void;
  /** Shows the banner again, for example from a "Cookie settings" link after a decision. */
  show(): void;
}

export type OreCookieBannerEvents = {
  /** A decision was made. `detail.consent` holds every category id; persist it and gate embeds on it. */
  decide: { consent: CookieConsentRecord };
};

export type OreCookieBannerProps = {
  /** Optional categories rendered as checkboxes; "Essential" is always shown as always-on. */
  categories?: OreCookieBannerCategory[];
  /** Current consent record, used to seed the checkboxes when the banner is shown again. */
  consent?: CookieConsentRecord;
  /** Hides the banner automatically after `decide` fires (default true). Set false to keep it open. */
  hideOnDecide?: boolean;
  /** All rendered labels, each with an English default. */
  labels?: OreCookieBannerLabels;
  /** Viewport edge the banner docks to. */
  position?: 'bottom' | 'top';
};

const DEFAULT_LABELS = {
  acceptAll: 'Accept all',
  essential: 'Essential',
  essentialNote: 'Required for the site to work',
  heading: 'Your privacy',
  reject: 'Reject non-essential',
  save: 'Save choices',
} as const;

/**
 * A fixed-position consent banner for cookie/tracker opt-in: a short policy text
 * (default slot, links included), optional per-category opt-in checkboxes with
 * descriptions, and accept-all / reject / save actions.
 *
 * The layout is a single column — heading, policy text, a scrollable category
 * panel, and actions — that scales linearly from one to many categories. Each
 * category renders as a checkbox row; its optional `description` passes through
 * the checkbox's `helper` mechanism, so it is both visible below the label and
 * linked to the control via `aria-describedby`. The category panel scrolls
 * internally when it exceeds `--cookie-banner-categories-max-height`, so the
 * banner itself never grows past the viewport.
 *
 * The banner owns presentation only. It never stores anything: listen for `decide`,
 * persist the emitted record yourself (localStorage, a CMP, your own backend), and
 * gate third-party embeds on it. The banner hides itself after `decide` unless
 * `hide-on-decide` is set to false. Call `show()` again to let the user revise
 * their choice.
 *
 * The banner is a non-modal `role="dialog"`: screen readers announce it when it
 * appears, focus moves to the dialog card itself on `show()` — a neutral target,
 * so no action is preselected for keyboard users — and returns to the previously
 * focused element on `hide()`. A banner that is simply present at page load (never
 * shown via `show()`) does not steal focus and is not announced; consumers that
 * want a load-time announcement should call `show()` from a user gesture.
 *
 * The `decide` record contains exactly the currently configured category ids
 * (plus `essential`, always true). Replace — do not merge — the stored record
 * with it, so categories removed between sessions drop their stale keys.
 *
 * @element ore-cookie-banner
 *
 * @attr {string} position - Viewport edge: 'bottom' (default) | 'top'
 * @attr {boolean} hide-on-decide - Hides the banner after `decide` (default true)
 *
 * @fires decide - A decision was made. detail: { consent } — every category id plus `essential`, always true.
 *
 * @slot - Policy text, including links to the privacy policy and imprint
 *
 * @cssprop --cookie-banner-width - Maximum width of the banner card (default min(560px, viewport-fit))
 * @cssprop --cookie-banner-inset - Distance from the viewport edges (default --size-4)
 * @cssprop --cookie-banner-z-index - Stacking order (default --z-modal)
 * @cssprop --cookie-banner-categories-max-height - Category panel scroll threshold (default 16rem)
 *
 * @part banner - The banner card
 * @part text - The slot wrapper for the policy text
 * @part categories - The scrollable category panel
 * @part actions - The action buttons
 *
 * @example
 * ```html
 * <ore-cookie-banner>
 *   We use cookies to keep you logged in and, with your consent, to embed music
 *   from YouTube. <a href="/privacy">Privacy policy</a>.
 * </ore-cookie-banner>
 * <script type="module">
 *   import '@vielzeug/refine/cookie-banner';
 *
 *   const banner = document.querySelector('ore-cookie-banner');
 *   banner.categories = [
 *     { id: 'music', label: 'Music embeds', description: 'Embed music from YouTube' },
 *     { id: 'stats', label: 'Statistics', description: 'Anonymous usage analytics' },
 *   ];
 *   banner.addEventListener('decide', (event) => {
 *     localStorage.setItem('consent', JSON.stringify(event.detail.consent));
 *   });
 * </script>
 * ```
 */
export const COOKIE_BANNER_TAG = 'ore-cookie-banner' as const;
define<OreCookieBannerProps>(COOKIE_BANNER_TAG, {
  props: {
    categories: prop.data<OreCookieBannerCategory[]>([]),
    consent: prop.data<CookieConsentRecord>({}),
    hideOnDecide: prop.bool(true),
    labels: prop.data<Partial<OreCookieBannerLabels>>({}),
    position: prop.string<'bottom' | 'top'>(),
  },
  setup(props) {
    const host = getHost() as CookieBannerElement;
    const emit = useEmit<OreCookieBannerEvents>();
    const headingId = createId('cookie-banner-heading');
    const textId = createId('cookie-banner-text');

    // Working copy of the checkbox state while the banner is open; seeded from
    // `consent` whenever the banner is (re)shown.
    const draft = signal<CookieConsentRecord>({});

    const seedDraft = (): void => {
      const base = props.consent.value ?? {};
      draft.value = Object.fromEntries(
        (props.categories.value ?? []).map((category) => [category.id, base[category.id] === true]),
      );
    };
    watch(() => props.consent.value, seedDraft);
    watch(() => props.categories.value, seedDraft);
    seedDraft();

    const label = (key: keyof typeof DEFAULT_LABELS): string => props.labels.value?.[key] ?? DEFAULT_LABELS[key];

    // The element that had focus before the banner opened; `hide()` returns to it.
    let restoreFocusTo: HTMLElement | null = null;

    // Focus lands on the dialog card itself — a neutral target, so no action is
    // preselected for keyboard users. Screen readers announce the dialog's name
    // when focus enters it.
    const focusCard = (): void => {
      const card = host.shadowRoot?.querySelector<HTMLElement>('.banner');
      (card ?? host).focus();
    };

    const decide = (consent: CookieConsentRecord): void => {
      emit('decide', { consent: { ...consent, essential: true } });
      if (props.hideOnDecide.value !== false) host.hide();
    };

    const acceptAll = (): void => {
      decide(Object.fromEntries((props.categories.value ?? []).map((category) => [category.id, true])));
    };

    const reject = (): void => {
      decide(Object.fromEntries((props.categories.value ?? []).map((category) => [category.id, false])));
    };

    const save = (): void => {
      decide({ ...draft.value });
    };

    const setCategory = (id: string, checked: boolean): void => {
      draft.value = { ...draft.value, [id]: checked };
    };

    host.show = (): void => {
      if (!host.hidden) return;
      restoreFocusTo = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      seedDraft();
      host.hidden = false;
      focusCard();
    };
    host.hide = (): void => {
      host.hidden = true;
      restoreFocusTo?.focus();
      restoreFocusTo = null;
    };

    const categories = (): OreCookieBannerCategory[] => props.categories.value ?? [];

    return html`
      <div
        class="banner"
        part="banner"
        role="dialog"
        aria-modal="false"
        aria-labelledby="${headingId}"
        aria-describedby="${textId}"
        tabindex="-1">
        <h2 class="heading" part="heading" id="${headingId}">${() => label('heading')}</h2>
        <div class="text" part="text" id="${textId}">
          <slot></slot>
        </div>
        ${when(
          () => categories().length > 0,
          () => html`
            <div class="categories" part="categories">
              <div class="category-row">
                <ore-checkbox checked disabled helper="${() => label('essentialNote')}">
                  ${() => label('essential')}
                </ore-checkbox>
              </div>
              ${each(
                categories,
                (category) => category.id,
                (category) => html`
                  <div class="category-row">
                    <ore-checkbox
                      checked="${() => draft.value[category.value.id] === true}"
                      helper="${() => category.value.description ?? ''}"
                      @change="${(event: Event) => setCategory(category.value.id, eventFieldChecked(event))}">
                      ${() => category.value.label}
                    </ore-checkbox>
                  </div>
                `,
              )}
            </div>
          `,
        )}
        <div class="actions" part="actions">
          <ore-button size="sm" variant="ghost" @click="${reject}">${() => label('reject')}</ore-button>
          ${when(
            () => categories().length > 0,
            () => html`<ore-button size="sm" variant="bordered" @click="${save}">${() => label('save')}</ore-button>`,
          )}
          <ore-button color="primary" size="sm" @click="${acceptAll}">${() => label('acceptAll')}</ore-button>
        </div>
      </div>
    `;
  },
  styles: [reducedMotionMixin, componentStyles],
});
