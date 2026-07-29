import { define, getHost, html, onCleanup, onMounted, prop } from '@vielzeug/ore';
import { effect } from '@vielzeug/ripple';

import { formatPrice } from '../../core/currency';
import { prefersReducedMotion } from '../../core/motion';

const TWEEN_DURATION_MS = 400;

/** `easeOutQuart` — fast start, soft landing, no overshoot; matches refine's own `--ease-spring` family. */
function easeOutQuart(t: number): number {
  return 1 - (1 - t) ** 4;
}

export type AnimatedPriceProps = { valueUsd: string };

/**
 * Tweens a USD-denominated price between values instead of snapping — the configurator's price
 * breakdown and the cart's total change on every option pick, and a static number reads as inert;
 * a brief, mechanical-feeling count communicates "this is a live calculation," matching the
 * `impeccable` motion pass's ask for state-conveying, not decorative, animation. Light-DOM
 * (`shadow: false`) and manages its own text content directly — a formatted currency string
 * (with the locale's grouping separators and symbol) isn't something a plain reactive template
 * binding can interpolate frame-by-frame without re-parsing on every tick, so this owns the
 * `requestAnimationFrame` loop itself rather than going through `html`'s bindings.
 */
define<AnimatedPriceProps>('animated-price', {
  props: {
    valueUsd: prop.string<string>('0.00'),
  },
  setup(props) {
    const host = getHost();

    let raf = 0;
    let displayed: number | null = null;

    function render(amount: number): void {
      host.textContent = formatPrice(amount.toFixed(2));
    }

    // Deferred to `onMounted` rather than created inline: `def.setup()` runs *before* ore mounts
    // this component's (empty, `html``\``) light-DOM template onto `host` — an `effect()` created
    // here would fire its first synchronous run during setup, writing `host.textContent`, only
    // for that write to be wiped a moment later when the empty template's `replaceChildren()`
    // mounts. `onMounted` callbacks run after the template is already in the DOM, so the first
    // render sticks — this was the source of every never-changed price rendering blank on load.
    onMounted(() => {
      effect(() => {
        const target = Number.parseFloat(props.valueUsd.value) || 0;

        cancelAnimationFrame(raf);

        if (displayed === null || prefersReducedMotion()) {
          displayed = target;
          render(target);

          return;
        }

        const start = displayed;
        const startTime = performance.now();

        const tick = (now: number): void => {
          const t = Math.min(1, (now - startTime) / TWEEN_DURATION_MS);
          const current = start + (target - start) * easeOutQuart(t);

          render(current);

          if (t < 1) {
            raf = requestAnimationFrame(tick);
          } else {
            displayed = target;
          }
        };

        raf = requestAnimationFrame(tick);
      });
    });

    onCleanup(() => cancelAnimationFrame(raf));

    return html``;
  },
  shadow: false,
});
