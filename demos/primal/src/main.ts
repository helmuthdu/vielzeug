// Eager shell: the elements the app chrome, landing view and player bars render
// before any route loads. Every other component registers from the chunk that
// uses it (the import sits next to its <ore-*> tag), and fouc.css hides
// unupgraded elements until their chunk arrives.
import '@vielzeug/refine/fouc.css';
import '@vielzeug/refine/tokens.css';
import '@vielzeug/prism/theme';
import './styles/fonts.css';
import './styles/theme.css';
import '@vielzeug/refine/button';
import '@vielzeug/refine/cookie-banner';
import '@vielzeug/refine/dialog';
import '@vielzeug/refine/icon';
import '@vielzeug/refine/navbar';
import '@vielzeug/refine/popover';
import '@vielzeug/refine/sidebar';
import '@vielzeug/refine/text';
import { toast } from '@vielzeug/refine/toast';
import { effect } from '@vielzeug/ripple';
import { createApp } from 'vue';
import App from './App.vue';
import { bus, notify as emitNotice } from './app/events';
import './app/icons';
import { catalog } from './app/catalog';
import { i18n, t } from './app/i18n';
import { mountShortcuts } from './app/keymap';
import { logger } from './app/logger';
import { router } from './app/router';
import { hydratePrimalStore, settings } from './app/store';
import { hidePlayer, markPlayerShellReady, showPlayer } from './ui/composables/use-youtube-audio';

toast.configure({ position: 'bottom-left' });

/** Snackbars carry one comfortable line at the chip's width cap; longer reads keep the alert surface. */
const SNACKBAR_MAX_CHARS = 64;

bus.on('notify', (notice) => {
  // Notices travel the app as catalog keys; this is where they become words.
  // Toasts are transient, so they translate once at emit time instead of reactively.
  const message = i18n.translateDynamic(notice.key, {
    ...(notice.count === undefined ? undefined : { count: notice.count }),
    values: notice.values,
  });
  // Snackbars are the standard for the demo's transient confirmations: anything short, or
  // carrying an action. Warnings and errors keep the colour-coded alert surface even when
  // short (the colour is the signal), as do long reads without an action.
  const snackbar =
    (notice.variant === 'success' || notice.variant === 'info') &&
    ((notice.actions?.length ?? 0) > 0 || message.length <= SNACKBAR_MAX_CHARS);
  toast.add({
    actions: notice.actions?.map((action) => ({ label: t(action.key), onClick: action.onClick })),
    color: notice.variant,
    duration: notice.actions?.length ? 7000 : 3200,
    // Snackbars keep the action on the message row (Material's right-hand text action);
    // the regular toast stacks long-wrapped content above its actions.
    horizontal: snackbar,
    message,
    rounded: 'sm',
    snackbar,
    variant: 'bordered',
  });
  logger.info(message, { variant: notice.variant });
});

const colorScheme = window.matchMedia('(prefers-color-scheme: dark)');
const applyTheme = () => {
  document.documentElement.dataset.theme =
    settings.value.theme === 'system' ? (colorScheme.matches ? 'dark' : 'light') : settings.value.theme;
};
colorScheme.addEventListener('change', applyTheme);
effect(() => {
  document.documentElement.dataset.reducedMotion = String(settings.value.reducedMotion);
  applyTheme();
});

// A blocked database (private mode, denied storage) must not take the app down with it:
// the session continues in memory, nothing persists, and the player is told why.
try {
  await hydratePrimalStore();
} catch (error) {
  logger.error('Opening the local database failed', { error: String(error) });
  emitNotice('toasts.storageBlocked', 'error');
}
// The catalog stub loads its vault row and drains unpublishes an earlier session
// queued; blocked storage leaves it in memory and the queue retries next boot.
void catalog.hydrate().catch((error) => logger.warn('Opening the catalog failed', { error: String(error) }));
await router.ready;
// The player toggle lives in the UI layer, so the composition root registers it here :
// keymap itself stays free of UI imports.
mountShortcuts(document, [
  {
    handler: () => (document.querySelector('.audio-bar') ? hidePlayer() : showPlayer()),
    id: 'player',
    shortcut: 'g p',
  },
]);

// The stored theme is applied here: reveal the splash icon now, so it animates in once
// with the right theme's colors instead of flashing both (see index.html).
const splash = document.getElementById('splash');
const revealedAt = performance.now();
applyTheme();
splash?.setAttribute('data-ready', '');
const app = createApp(App);
// The last-resort boundary: an error thrown inside a view is logged and reported,
// never a blank screen. Saved games live outside the render tree and stay safe.
app.config.errorHandler = (error, _instance, info) => {
  logger.error('Unhandled error in a view', { error: String(error), info });
  emitNotice('toasts.renderError', 'error');
};
app.mount('#app');
// The player's video wrapper docks into shell nodes (#corner-dock, the video
// mount) that exist only from here on: background player construction waits
// for this mark so no iframe is ever moved (and reloaded) after creation.
markPlayerShellReady();

// Hand off from the first-paint splash (see index.html) to the app. Hold the entrance
// animation's rise (700ms) before fading, so the icon is never revealed and hidden at once.
if (splash) {
  const handoff = () => {
    splash.dataset.hide = '';
    splash.addEventListener('transitionend', () => splash.remove(), { once: true });
    // Reduced motion disables the transition, so transitionend never fires.
    setTimeout(() => splash.remove(), 600);
  };
  // Matches the splash CSS, which keys its animation off the media query.
  const remaining = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ? 0
    : 700 - (performance.now() - revealedAt);
  if (remaining > 0) setTimeout(handoff, remaining);
  else handoff();
}

// PWA: register the offline service worker in production builds (dev serves churn too fast to
// cache). The worker is copied verbatim from public/ and scoped to the deploy base. main.ts has
// top-level awaits, so the load event can fire before this point: attach only if it has not.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  const register = () => void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
  // First install claims the page mid-load, before any asset request was intercepted: reload
  // once so the whole shell goes through the worker and lands in the offline cache. Updates
  // activate only after every tab closes, so this never fires mid-session.
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!sessionStorage.getItem('primal-sw-bootstrapped')) {
      sessionStorage.setItem('primal-sw-bootstrapped', '1');
      location.reload();
    }
  });
}
