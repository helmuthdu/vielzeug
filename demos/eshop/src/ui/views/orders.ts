import '@vielzeug/refine/async';
import '@vielzeug/refine/badge';
import '@vielzeug/refine/button';
import '@vielzeug/refine/card';
import '@vielzeug/refine/dialog';
import '@vielzeug/refine/icon';
import '@vielzeug/refine/skeleton';

import '../components/animated-price';
import '../components/car-silhouette';
import '../components/order-timeline';

import { define, each, html, when } from '@vielzeug/ore';
import { computed, type Readable, signal } from '@vielzeug/ripple';

import type { Order, OrderItem, OrderStatus } from '../../core/types';

import { modelMap } from '../../core/catalog';
import { formatPrice } from '../../core/currency';
import { formatLongDate, formatOrderStatus } from '../../core/format';
import { t } from '../../core/i18n';
import { attemptCancelOrder, canCancelOrder } from '../../core/order-actions';
import { ordersLoading, ordersSignal } from '../../core/orders';
import { combineBreakdowns, resolveConfiguration } from '../../core/pricing';
import { router } from '../../core/router';

/** Placeholder card count for the loading skeleton — enough to plausibly fill the grid without
 * implying a specific real order count. */
const SKELETON_CARD_COUNT = 3;

const STATUS_COLOR: Record<OrderStatus, string> = {
  cancelled: 'secondary',
  delivered: 'success',
  'in-transit': 'primary',
  placed: 'info',
  processing: 'warning',
};

/** Celebratory/status-appropriate spotlight headline per `OrderStatus` — `cancelled` is only
 * ever reached here if it's the shopper's *only* order (see `pickCurrentOrder` below), since an
 * active order otherwise always wins the spotlight over a cancelled one. */
const SPOTLIGHT_HEADLINE_KEYS: Record<OrderStatus, string> = {
  cancelled: 'orders.current.headlineCancelled',
  delivered: 'orders.current.headlineDelivered',
  'in-transit': 'orders.current.headlineInTransit',
  placed: 'orders.current.headlinePlaced',
  processing: 'orders.current.headlineProcessing',
};

/** The order the spotlight hero highlights — the most recently placed order that isn't
 * cancelled (an order still moving through its lifecycle is more relevant than history), falling
 * back to the most recent order overall if every order has been cancelled. ISO timestamps sort
 * lexicographically the same as chronologically, so a plain string comparison is enough. */
function pickCurrentOrder(orders: Order[]): Order | null {
  if (orders.length === 0) return null;

  const active = orders.filter((order) => order.status !== 'cancelled');
  const pool = active.length > 0 ? active : orders;

  return pool.reduce((latest, order) => (order.placedAt > latest.placedAt ? order : latest));
}

type SpotlightItem = { colorName: string; item: OrderItem; trimName: string; wheelName: string };

/** Resolves an order item's configuration ids against the live catalog for display — falls back
 * to blank option names rather than throwing, since a model/option discontinued after purchase
 * shouldn't break the order page for an order already placed. */
function describeSpotlightItem(item: OrderItem): SpotlightItem {
  const model = modelMap.value.get(item.modelId);

  if (!model) return { colorName: '', item, trimName: '', wheelName: '' };

  try {
    const { color, trim, wheel } = resolveConfiguration(model, item.configuration);

    return { colorName: color.name, item, trimName: trim.name, wheelName: wheel.name };
  } catch {
    return { colorName: '', item, trimName: '', wheelName: '' };
  }
}

/** Builds a plain-text invoice client-side and triggers a browser download — this demo has no
 * PDF generation or invoicing backend, so a readable text summary stands in for the design
 * brief's "Download Invoice" document action rather than a fake link to nowhere. */
function downloadInvoice(order: Order): void {
  const lines = [
    'Vielzeug Motors — Invoice',
    `Order ${order.id}`,
    `Placed: ${formatLongDate(order.placedAt)}`,
    '',
    ...order.items.map((i) => `${i.modelName} × ${i.quantity} — ${formatPrice(i.breakdown.total)}`),
    '',
    `Total: ${formatPrice(order.totalAmount)}`,
  ];

  const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/plain' }));
  const link = document.createElement('a');

  link.href = url;
  link.download = `invoice-${order.id}.txt`;
  link.click();
  URL.revokeObjectURL(url);
}

define('orders-view', {
  setup() {
    const cancelTarget = signal<Order | null>(null);

    const currentOrder = computed<Order | null>(() => pickCurrentOrder(ordersSignal.value));
    const previousOrders = computed<Order[]>(() => {
      const current = currentOrder.value;

      return current ? ordersSignal.value.filter((order) => order.id !== current.id) : ordersSignal.value;
    });

    function onCancelConfirm(): void {
      const order = cancelTarget.value;

      cancelTarget.value = null;

      if (order) void attemptCancelOrder(order);
    }

    return html`
      <h1>${() => t('orders.title')}</h1>
      ${when(
        // Only the *initial* load has no data to show yet — a background revalidation
        // (courier refetch) keeps rendering the already-fetched list instead of replacing it
        // with skeletons, so the loading state never flashes over content the user already has.
        () => ordersLoading.value && ordersSignal.value.length === 0,
        () => html`
          <ul class="orders-view__list" role="status" aria-live="polite" aria-label=${() => t('orders.loading')}>
            ${Array.from({ length: SKELETON_CARD_COUNT }).map(
              () => html`
                <li aria-hidden="true">
                  <ore-card class="order-card__surface" elevation="1">
                    <div slot="header" class="order-card__header">
                      <ore-skeleton width="7rem" height="0.75rem"></ore-skeleton>
                      <ore-skeleton width="4.5rem" height="1.5rem" radius="999px"></ore-skeleton>
                    </div>
                    <div class="order-card__body">
                      <ore-skeleton width="10rem" height="0.75rem"></ore-skeleton>
                      <ore-skeleton height="2.5rem"></ore-skeleton>
                      <ore-skeleton variant="text" lines="2" width="70%"></ore-skeleton>
                    </div>
                    <ore-skeleton slot="footer" width="4rem" height="1.25rem"></ore-skeleton>
                    <ore-skeleton slot="actions" width="9rem" height="2rem"></ore-skeleton>
                  </ore-card>
                </li>
              `,
            )}
          </ul>
        `,
        // Nested when()'s two branches only ever swap once `ordersLoading` has already resolved
        // — wrapped in its own html`` so the outer when() receives a mountable HTMLResult rather
        // than a raw DirectiveResult.
        () => html`
          ${when(
            () => ordersSignal.value.length === 0,
            () => html`
              <div class="orders-view__empty">
                <ore-async status="empty" empty-label=${() => t('orders.empty')}></ore-async>
                <ore-button variant="solid" @click=${() => void router.navigate({ name: 'catalog' })}>
                  ${() => t('orders.emptyCta')}
                </ore-button>
              </div>
            `,
            () => html`
              ${when(
                // The spotlight is a single optional entity, not a list — `when()` here (keyed
                // only on the null/non-null transition) instead of a single-element `each()`
                // avoids a real `each()` reconciliation defect where its enclosing branch being
                // torn down and remounted (as happens once during the initial orders load, see
                // `core/orders.ts`'s two-step `sync()` writes) can hand a freshly-created
                // `<ore-button>` the *same* underlying DOM node an earlier pass already called
                // `attachInternals()` on, which throws (`ElementInternals` can only ever be
                // attached once per element, even across a logical unmount/remount). All the
                // fields below stay reactive to `currentOrder.value` via nested `computed()`s so
                // a *different* non-null order — e.g. Settings' user switcher — still updates
                // this section correctly without needing a DOM remount.
                () => currentOrder.value !== null,
                () => {
                  const order = currentOrder as Readable<Order>;
                  const spotlightItems = computed(() => order.value.items.map(describeSpotlightItem));
                  const heroModel = computed(() => {
                    const hero = spotlightItems.value[0];

                    return hero ? modelMap.value.get(hero.item.modelId) : undefined;
                  });
                  const heroColor = computed(() =>
                    heroModel.value?.colors.find((c) => c.id === spotlightItems.value[0]?.item.configuration.colorId),
                  );
                  const pricing = computed(() => combineBreakdowns(order.value.items.map((i) => i.breakdown)));

                  return html`
                    <section class="order-spotlight">
                      <div class="order-spotlight__hero">
                        <car-silhouette
                          :body-type=${() => heroModel.value?.bodyType ?? 'sedan'}
                          :color-hex=${() => heroColor.value?.hex ?? '#c7ccd1'}
                          :color-name=${() => heroColor.value?.name ?? ''}
                          :hero-hue=${() => heroModel.value?.heroHue ?? 220}></car-silhouette>
                        <div class="order-spotlight__intro">
                          <p class="order-spotlight__eyebrow">${() => t('orders.current.sectionEyebrow')}</p>
                          <h2 class="order-spotlight__headline">
                            ${() => t(SPOTLIGHT_HEADLINE_KEYS[order.value.status])}
                          </h2>
                          <p class="order-spotlight__subline">${() => formatOrderStatus(order.value.status)}</p>
                          <p class="order-spotlight__meta">
                            <span>${() => t('orders.current.orderNumber', { id: order.value.id })}</span>
                            <span>
                              ${() =>
                                t('orders.current.estDelivery', {
                                  date: formatLongDate(order.value.estimatedDeliveryDate),
                                })}
                            </span>
                          </p>
                        </div>
                      </div>
                      <div class="order-spotlight__grid">
                        <div class="order-spotlight__panels">
                          <div class="order-spotlight__panel">
                            <h3>${() => t('orders.current.statusTitle')}</h3>
                            <order-timeline :status=${() => order.value.status}></order-timeline>
                          </div>
                          <div class="order-spotlight__panel">
                            <h3>${() => t('orders.current.configTitle')}</h3>
                            <ul class="order-spotlight__items">
                              ${() =>
                                spotlightItems.value.map(
                                  ({ colorName, item, trimName, wheelName }) => html`
                                    <li class="order-spotlight__item">
                                      <div>
                                        <p class="order-spotlight__item-name">
                                          ${`${item.modelName} × ${item.quantity}`}
                                        </p>
                                        ${when(
                                          trimName !== '',
                                          () => html`
                                            <p class="order-spotlight__item-config">
                                              ${`${trimName} · ${colorName} · ${wheelName}`}
                                            </p>
                                          `,
                                        )}
                                      </div>
                                      <strong>${formatPrice(item.breakdown.total)}</strong>
                                    </li>
                                  `,
                                )}
                            </ul>
                          </div>
                        </div>
                        <div class="configurator__breakdown order-spotlight__pricing">
                          <h3>${() => t('model.priceBreakdown')}</h3>
                          <dl>
                            <dt>${() => t('model.base')}</dt>
                            <dd><animated-price value-usd=${() => pricing.value.base}></animated-price></dd>
                            <dt>${() => t('model.selectTrim')}</dt>
                            <dd><animated-price value-usd=${() => pricing.value.trim}></animated-price></dd>
                            <dt>${() => t('model.selectColor')}</dt>
                            <dd><animated-price value-usd=${() => pricing.value.color}></animated-price></dd>
                            <dt>${() => t('model.selectWheels')}</dt>
                            <dd><animated-price value-usd=${() => pricing.value.wheels}></animated-price></dd>
                            <dt>${() => t('model.packages')}</dt>
                            <dd><animated-price value-usd=${() => pricing.value.packages}></animated-price></dd>
                            <dt>${() => t('common.subtotal')}</dt>
                            <dd><animated-price value-usd=${() => pricing.value.subtotal}></animated-price></dd>
                            <dt>${() => t('common.tax')}</dt>
                            <dd><animated-price value-usd=${() => pricing.value.tax}></animated-price></dd>
                            <dt class="total">${() => t('common.total')}</dt>
                            <dd class="total">
                              <animated-price value-usd=${() => order.value.totalAmount}></animated-price>
                            </dd>
                          </dl>
                          <div class="order-spotlight__actions">
                            <ore-button
                              rounded
                              variant="bordered"
                              size="sm"
                              @click=${() => downloadInvoice(order.value)}>
                              <ore-icon name="download" size="14" aria-hidden="true" slot="prefix"></ore-icon>
                              ${() => t('orders.downloadInvoice')}
                            </ore-button>
                            ${when(
                              () => canCancelOrder(order.value),
                              () => html`
                                <ore-button
                                  rounded
                                  variant="bordered"
                                  size="sm"
                                  color="error"
                                  @click=${() => (cancelTarget.value = order.value)}>
                                  <ore-icon name="x-circle" size="14" aria-hidden="true" slot="prefix"></ore-icon>
                                  ${() => t('orders.cancel')}
                                </ore-button>
                              `,
                            )}
                          </div>
                        </div>
                      </div>
                    </section>
                  `;
                },
              )}
              ${when(
                () => previousOrders.value.length > 0,
                () => html`
                  <section class="orders-view__previous">
                    <h2>${() => t('orders.current.previousTitle')}</h2>
                    <ul class="orders-view__list">
                      ${each(
                        previousOrders,
                        (o) => o.id,
                        (o) => html`
                          <li>
                            <ore-card class="order-card__surface" elevation="1">
                              <div slot="header" class="order-card__header">
                                <h3 class="order-card__id">${() => o.value.id}</h3>
                                <ore-badge color=${() => STATUS_COLOR[o.value.status]} variant="flat">
                                  ${() => formatOrderStatus(o.value.status)}
                                </ore-badge>
                              </div>
                              <div class="order-card__body">
                                <p class="order-card__meta">
                                  ${() => t('orders.placedOn', { date: formatLongDate(o.value.placedAt) })}
                                </p>
                                <ul class="order-card__items">
                                  ${o.value.items.map(
                                    (i) => html`
                                      <li>${() => `${i.modelName} × ${i.quantity}`}</li>
                                    `,
                                  )}
                                </ul>
                              </div>
                              <strong slot="footer" class="order-card__price">
                                ${() => formatPrice(o.value.totalAmount)}
                              </strong>
                              <div slot="actions" class="order-card__actions">
                                <ore-button rounded variant="ghost" size="sm" @click=${() => downloadInvoice(o.value)}>
                                  <ore-icon name="download" size="14" aria-hidden="true" slot="prefix"></ore-icon>
                                  ${() => t('orders.downloadInvoice')}
                                </ore-button>
                                ${when(
                                  () => canCancelOrder(o.value),
                                  () => html`
                                    <ore-button
                                      rounded
                                      variant="ghost"
                                      size="sm"
                                      color="error"
                                      @click=${() => (cancelTarget.value = o.value)}>
                                      <ore-icon name="x-circle" size="14" aria-hidden="true" slot="prefix"></ore-icon>
                                      ${() => t('orders.cancel')}
                                    </ore-button>
                                  `,
                                )}
                              </div>
                            </ore-card>
                          </li>
                        `,
                      )}
                    </ul>
                  </section>
                `,
              )}
            `,
          )}
        `,
      )}
      <ore-dialog
        size="sm"
        dismissible
        :label=${() => t('orders.cancelConfirmTitle')}
        ?open=${() => cancelTarget.value !== null}
        @close=${() => (cancelTarget.value = null)}>
        <p>${() => t('orders.cancelConfirmBody')}</p>
        <div slot="footer">
          <ore-button rounded variant="bordered" @click=${() => (cancelTarget.value = null)}>
            ${() => t('orders.cancelConfirmKeep')}
          </ore-button>
          <ore-button rounded variant="solid" color="error" @click=${onCancelConfirm}>
            ${() => t('orders.cancelConfirmAction')}
          </ore-button>
        </div>
      </ore-dialog>
    `;
  },
  shadow: false,
});

export function createOrdersView(): HTMLElement {
  const el = document.createElement('orders-view');

  el.className = 'orders-view';

  return el;
}
