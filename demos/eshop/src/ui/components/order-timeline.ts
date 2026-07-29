import '@vielzeug/refine/icon';
import { define, html, prop, when } from '@vielzeug/ore';

import type { OrderStatus } from '../../core/types';

import { formatOrderStatus } from '../../core/format';
import { t } from '../../core/i18n';

/**
 * The happy-path sequence a placed order moves through. The design brief's own timeline also
 * lists a distinct "Ready for Pickup" stage between shipping and delivered — this app's
 * `OrderStatus` (see `core/types.ts`) doesn't model that as its own state (no pickup-vs-delivery
 * status split exists in the mock order API), so it's folded into `in-transit` here rather than
 * inventing a status the rest of the app never sets. `cancelled` isn't a step on this line at
 * all — it's a terminal state that interrupts the sequence, rendered as its own note instead.
 */
const TIMELINE_STATUSES: OrderStatus[] = ['placed', 'processing', 'in-transit', 'delivered'];

export type OrderTimelineProps = { status: OrderStatus };

/**
 * `<order-timeline>` — light-DOM (`shadow: false`), styled via `styles/app.css`'s
 * `.order-timeline*` rules, which share their track/marker/label rules with
 * `ui/views/checkout.ts`'s `.checkout-stepper` (see that file's stepper for the in-progress
 * equivalent of this read-only, already-placed-order view).
 */
define<OrderTimelineProps>('order-timeline', {
  props: {
    status: prop.oneOf<OrderStatus>(['placed', 'processing', 'in-transit', 'delivered', 'cancelled'], 'placed'),
  },
  setup(props) {
    return html`
      ${when(
        () => props.status.value === 'cancelled',
        () => html`
          <p class="order-timeline__cancelled">${() => t('orders.timeline.cancelledNote')}</p>
        `,
        () => {
          const currentIndex = () => TIMELINE_STATUSES.indexOf(props.status.value);

          return html`
            <ol class="checkout-stepper order-timeline" aria-label=${() => t('orders.timeline.ariaLabel')}>
              ${TIMELINE_STATUSES.map((status, i) => {
                const state = () => (i < currentIndex() ? 'done' : i === currentIndex() ? 'active' : 'upcoming');

                return html`
                  <li class="checkout-stepper__step" data-state=${state}>
                    <span class="checkout-stepper__marker">
                      ${when(
                        () => state() === 'done',
                        () => html`
                          <ore-icon name="check" size="12" aria-hidden="true"></ore-icon>
                        `,
                        () => html`
                          ${i + 1}
                        `,
                      )}
                    </span>
                    <span class="checkout-stepper__label">${() => formatOrderStatus(status)}</span>
                  </li>
                `;
              })}
            </ol>
          `;
        },
      )}
    `;
  },
  shadow: false,
});
