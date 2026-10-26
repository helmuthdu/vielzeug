import '@vielzeug/refine/button';
import '@vielzeug/refine/icon';
import '@vielzeug/refine/keyboard-key';
import '@vielzeug/refine/separator';
import '@vielzeug/refine/tour';

import { define, html, onMounted, ref } from '@vielzeug/ore';
import type { OreTourElement } from '@vielzeug/refine/tour';
import { computed, effect, untrack } from '@vielzeug/ripple';

import { getOnboardingTour, onViewportChange, startOnboardingTour, tourHandle } from '../../core/onboarding';
import { activeRoute } from '../../core/router';

/** Session flag so the automatic first-visit offer fires at most once per load. */
const AUTOSTART_KEY = 'voyage-onboarding-autostarted';

/** Grace period before the tour offers itself, so the shell settles first. */
const AUTOSTART_DELAY_MS = 900;

const keyboardHints = [
  { keys: ['Esc'], text: 'Close' },
  { keys: ['\u2190', '\u2192'], text: 'Tour steps' },
];

/**
 * Sidebar widget: start / restart the product tour and a standing reminder of
 * the keyboard model. The tour itself is owned by `@vielzeug/beacon` (see
 * `core/onboarding.ts`); this widget only reads its status for the button label.
 */
define('voyage-onboarding', {
  setup() {
    // Create the handle now so the computed below only ever reads the signal
    // (a signal write inside a computed would be a cycle).
    getOnboardingTour();
    // Read the handle through the signal so a viewport-driven re-create swaps
    // in the new step list's status without remounting the widget.
    const activeTour = () => tourHandle.value ?? getOnboardingTour();
    const actionLabel = computed(() => {
      const tour = activeTour();
      switch (tour.status.value) {
        case 'active':
          return 'Running…';
        case 'paused':
          return 'Resume tour';
        case 'completed':
          return 'Replay tour';
        default:
          return 'Start tour';
      }
    });

    // Restart goes through getOnboardingTour, not the cached signal: that call
    // is what re-creates the handle when the viewport crossed the layout
    // breakpoint since the last tour.
    const restart = (): void => {
      const tour = getOnboardingTour();
      tour.reset();
      tour.start();
    };

    return html`
      <section class="onboarding" aria-label="Product tour and keyboard shortcuts">
        <div class="onboarding__actions">
          <ore-button
            class="onboarding__start"
            color="primary"
            variant="outline"
            @click=${startOnboardingTour}
            disabled=${() => activeTour().status.value === 'active'}>
            <ore-icon slot="prefix" name="play" size="14" aria-hidden="true"></ore-icon>
            ${actionLabel}
          </ore-button>
          <ore-button variant="outline" icon-only label="Restart tour" @click=${restart}>
            <ore-icon name="rotate-ccw" size="14" aria-hidden="true"></ore-icon>
          </ore-button>
        </div>

        <ore-separator></ore-separator>

        <h3 class="onboarding__keys-title">Keyboard</h3>
        <ul class="onboarding__keys">
          ${keyboardHints.map(
            (hint) => html`
              <li class="onboarding__key">
                <span class="onboarding__key-keys">
                  ${hint.keys.map(
                    (key) => html`
                      <ore-keyboard-key>${key}</ore-keyboard-key>
                    `,
                  )}
                </span>
                <span class="onboarding__key-text">${hint.text}</span>
              </li>
            `,
          )}
        </ul>
      </section>
    `;
  },
  shadow: false,
});

/**
 * Hosts the `ore-tour` step card and bridges it to the beacon handle with
 * `bind()`: the handle's snapshot renders into the card's props and the card's
 * next/back/skip/finish/dismiss actions drive the handle. The card's
 * `spotlight` prop dims the page around each anchored step.
 */
define('voyage-onboarding-tour', {
  setup() {
    const card = ref<OreTourElement>();

    onMounted(() => {
      const element = card.value;
      if (!element) return undefined;
      // Seed the handle signal before the effect runs, so the effect only ever
      // reads it (a signal write inside an effect that reads it is a cycle).
      getOnboardingTour();

      // Bind the card to the live handle. The effect tracks only the handle
      // signal, so when a viewport change re-creates it (desktop <-> narrow
      // step list) the old binding and autostart are torn down and the new
      // handle is bound. Everything else runs untracked: eligible/route reads
      // belong to the autostart logic, not this effect's dependencies.
      const stopBinding = effect(() => {
        const tour = tourHandle.value;
        if (!tour) return undefined;
        return untrack(() => {
          const unbind = element.bind(tour);

          // Offer the tour once per load, on the landing route, to users whose
          // stored record says they have not finished or dismissed it.
          let timer = 0;
          const maybeAutostart = (): void => {
            if (globalThis.sessionStorage.getItem(AUTOSTART_KEY) === 'true') return;
            if (!tour.eligible.value || activeRoute.value !== 'explore') return;
            globalThis.sessionStorage.setItem(AUTOSTART_KEY, 'true');
            timer = window.setTimeout(() => tour.start(), AUTOSTART_DELAY_MS);
          };
          const unsubscribe = tour.eligible.subscribe(maybeAutostart);
          maybeAutostart();

          return () => {
            window.clearTimeout(timer);
            unsubscribe();
            unbind();
          };
        });
      });

      // When the viewport crosses the layout breakpoint, swap to the matching
      // step list — but never yank a handle out from under a running tour.
      const stopViewport = onViewportChange(() => {
        const current = tourHandle.value;
        if (current && current.status.peek() === 'active') return;
        getOnboardingTour();
      });

      return () => {
        stopViewport?.();
        stopBinding.dispose();
      };
    });

    return html`
      <ore-tour spotlight ref=${card}></ore-tour>
    `;
  },
  shadow: false,
});
