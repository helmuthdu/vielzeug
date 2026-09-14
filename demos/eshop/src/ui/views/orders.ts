import '@vielzeug/refine/async';
import '@vielzeug/refine/badge';
import '@vielzeug/refine/button';
import '@vielzeug/refine/chip';
import '@vielzeug/refine/dialog';
import '@vielzeug/refine/icon';
import '@vielzeug/refine/input';
import '@vielzeug/refine/select';
import '@vielzeug/refine/skeleton';
import '@vielzeug/refine/tab-item';
import '@vielzeug/refine/tabs';

import '../components/animated-price';
import '../components/order-timeline';

import { define, each, html, when } from '@vielzeug/ore';
import { computed, signal } from '@vielzeug/ripple';
import { currentUser } from '../../core/auth';
import { modelMap } from '../../core/catalog';
import { controlValue } from '../../core/control-value';
import { formatPrice } from '../../core/currency';
import { formatLongDate, formatOrderStatus, formatPaymentMethod } from '../../core/format';
import { t } from '../../core/i18n';
import { attemptCancelOrder, canCancelOrder } from '../../core/order-actions';
import { ordersLoading, ordersSignal } from '../../core/orders';
import { resolveConfiguration } from '../../core/pricing';
import { router } from '../../core/router';
import { DEALERS } from '../../core/seed-data';
import type { Order, OrderItem, OrderStatus } from '../../core/types';

const SKELETON_CARD_COUNT = 3;
const ACTIVE_STATUSES = new Set<OrderStatus>(['placed', 'processing', 'in-transit']);
const STATUS_COLOR: Record<OrderStatus, string> = {
  cancelled: 'secondary',
  delivered: 'success',
  'in-transit': 'primary',
  placed: 'info',
  processing: 'warning',
};
type OrderScope = 'active' | 'all' | 'past';
type OrderSort = 'newest' | 'oldest';
type DescribedItem = { colorName: string; item: OrderItem; trimName: string; wheelName: string };

function orderNumber(id: string): string {
  return `#${id.replace(/^order-/, '')}`;
}

function describeOrderItem(item: OrderItem): DescribedItem {
  const model = modelMap.value.get(item.modelId);
  if (!model) return { colorName: '', item, trimName: '', wheelName: '' };
  try {
    const { color, trim, wheel } = resolveConfiguration(model, item.configuration);
    return { colorName: color.name, item, trimName: trim.name, wheelName: wheel.name };
  } catch {
    return { colorName: '', item, trimName: '', wheelName: '' };
  }
}

function addressLabel(order: Order): string {
  if (order.deliveryMethod === 'pickup') {
    return DEALERS.find(({ id }) => id === order.dealerId)?.name ?? t('orders.details.dealerPickup');
  }
  const { city, country, postalCode, street } = order.shippingAddress;
  return `${street}, ${postalCode} ${city}, ${country}`;
}

function downloadOrderSummary(order: Order): void {
  const pricing = order.pricing;
  const lines = [
    'Vielzeug Motors — Order summary',
    `Order ${orderNumber(order.id)}`,
    `Placed: ${formatLongDate(order.placedAt)}`,
    `Status: ${formatOrderStatus(order.status)}`,
    '',
    ...order.items.map((item) => `${item.modelName} × ${item.quantity} — ${formatPrice(item.breakdown.subtotal)}`),
    '',
    `Subtotal: ${formatPrice(pricing.subtotal)}`,
    ...(Number(pricing.discount) > 0 ? [`Discount: -${formatPrice(pricing.discount)}`] : []),
    `Tax: ${formatPrice(pricing.tax)}`,
    ...(Number(pricing.tradeInCredit) > 0 ? [`Trade-in credit: -${formatPrice(pricing.tradeInCredit)}`] : []),
    `Total: ${formatPrice(pricing.total)}`,
    '',
    `Delivery: ${addressLabel(order)}`,
    `Payment: ${formatPaymentMethod(order.paymentMethod)}`,
  ];
  const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/plain' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `order-summary-${order.id}.txt`;
  link.click();
  URL.revokeObjectURL(url);
}

define('orders-view', {
  setup() {
    const cancelTarget = signal<Order | null>(null);
    const scope = signal<OrderScope>('active');
    const sort = signal<OrderSort>('newest');
    const query = signal('');
    const selectedOrderId = signal('');
    const activeOrders = computed(() => ordersSignal.value.filter(({ status }) => ACTIVE_STATUSES.has(status)));
    const pastOrders = computed(() => ordersSignal.value.filter(({ status }) => !ACTIVE_STATUSES.has(status)));
    const visibleOrders = computed(() => {
      const search = query.value.trim().toLocaleLowerCase();
      const pool =
        scope.value === 'active' ? activeOrders.value : scope.value === 'past' ? pastOrders.value : ordersSignal.value;
      return pool
        .filter(
          (order) =>
            !search ||
            `${order.id} ${order.items.map(({ modelName }) => modelName).join(' ')}`
              .toLocaleLowerCase()
              .includes(search),
        )
        .toSorted((left, right) =>
          sort.value === 'newest'
            ? right.placedAt.localeCompare(left.placedAt)
            : left.placedAt.localeCompare(right.placedAt),
        );
    });
    const selectedOrder = computed(
      () => visibleOrders.value.find(({ id }) => id === selectedOrderId.value) ?? visibleOrders.value[0] ?? null,
    );
    const selectedItems = computed(() => selectedOrder.value?.items.map(describeOrderItem) ?? []);

    const selectScope = (next: OrderScope): void => {
      scope.value = next;
      selectedOrderId.value = '';
    };

    const onCancelConfirm = (): void => {
      const order = cancelTarget.value;
      cancelTarget.value = null;
      if (order) void attemptCancelOrder(order);
    };

    return html`
      <header class="orders-view__header">
        <div>
          <span class="orders-view__eyebrow">${() => t('orders.eyebrow')}</span>
          <h1>${() => t('orders.title')}</h1>
          <p>
            ${() =>
              t(ordersSignal.value.length === 1 ? 'orders.orderCountSingle' : 'orders.orderCountPlural', {
                count: ordersSignal.value.length,
                name: currentUser.value.name,
              })}
          </p>
        </div>
        <ore-button variant="outline" @click=${() => void router.navigate({ name: 'catalog' })}>
          ${() => t('orders.browseModels')}
          <ore-icon slot="suffix" name="arrow-right" size="15" aria-hidden="true"></ore-icon>
        </ore-button>
      </header>

      ${when(
        () => ordersLoading.value && ordersSignal.value.length === 0,
        () => html`
          <ul class="orders-index__list" role="status" aria-live="polite" aria-label=${() => t('orders.loading')}>
            ${Array.from({ length: SKELETON_CARD_COUNT }).map(
              () => html`
                <li aria-hidden="true" class="orders-index__skeleton">
                  <ore-skeleton width="7rem" height="0.75rem"></ore-skeleton>
                  <ore-skeleton width="100%" height="2rem"></ore-skeleton>
                  <ore-skeleton width="70%" height="0.75rem"></ore-skeleton>
                </li>
              `,
            )}
          </ul>
        `,
        () => html`
          ${when(
            () => ordersSignal.value.length === 0,
            () => html`
              <section class="orders-view__empty" aria-labelledby="orders-empty-title">
                <span class="orders-view__empty-icon">
                  <ore-icon name="clipboard-list" size="28" aria-hidden="true"></ore-icon>
                </span>
                <h2 id="orders-empty-title">${() => t('orders.empty')}</h2>
                <p>${() => t('orders.emptyHint', { name: currentUser.value.name })}</p>
                <div class="orders-view__empty-actions">
                  <ore-button color="primary" @click=${() => void router.navigate({ name: 'catalog' })}>
                    ${() => t('orders.emptyCta')}
                  </ore-button>
                  <ore-button variant="outline" @click=${() => void router.navigate({ name: 'settings' })}>
                    ${() => t('orders.switchPersona')}
                  </ore-button>
                </div>
              </section>
            `,
            () => html`
              <section class="orders-controls" aria-label=${() => t('orders.controls')}>
                <ore-tabs
                  class="orders-controls__scopes"
                  variant="ghost"
                  label=${() => t('orders.filterStatus')}
                  value=${scope}
                  @change=${(event: CustomEvent<{ value: OrderScope }>) => selectScope(event.detail.value)}>
                  ${(['active', 'past', 'all'] as const).map(
                    (value) => html`
                      <ore-tab-item slot="tabs" value=${value} variant="ghost">
                        <span>${() => t(`orders.scope${value[0].toUpperCase()}${value.slice(1)}`)}</span>
                        <ore-chip class="orders-controls__count" size="sm" rounded="full" variant="flat">
                          ${() =>
                            value === 'active'
                              ? activeOrders.value.length
                              : value === 'past'
                                ? pastOrders.value.length
                                : ordersSignal.value.length}
                        </ore-chip>
                      </ore-tab-item>
                    `,
                  )}
                </ore-tabs>
                <div class="orders-controls__tools">
                  <ore-input
                    type="search"
                    aria-label=${() => t('orders.search')}
                    placeholder=${() => t('orders.search')}
                    value=${query}
                    @input=${(event: Event) => (query.value = controlValue(event) ?? '')}>
                    <ore-icon slot="prefix" name="search" size="14" aria-hidden="true"></ore-icon>
                  </ore-input>
                  <ore-select
                    hide-label
                    label=${() => t('orders.sort')}
                    value=${sort}
                    options=${() => [
                      { label: t('orders.sortNewest'), value: 'newest' },
                      { label: t('orders.sortOldest'), value: 'oldest' },
                    ]}
                    @change=${(event: Event) => (sort.value = controlValue(event) === 'oldest' ? 'oldest' : 'newest')}></ore-select>
                </div>
              </section>

              ${when(
                () => visibleOrders.value.length === 0,
                () => html`
                  <div class="orders-view__no-results">
                    <p>${() => t('orders.noResults')}</p>
                    <ore-button
                      variant="outline"
                      @click=${() => {
                        query.value = '';
                        selectScope('all');
                      }}>
                      ${() => t('orders.clearFilters')}
                    </ore-button>
                  </div>
                `,
                () => html`
                  <div class="orders-workspace">
                    <aside class="orders-index" aria-label=${() => t('orders.orderList')}>
                      <ul class="orders-index__list">
                        ${each(
                          visibleOrders,
                          (order) => order.id,
                          (order) => html`
                            <li>
                              <button
                                type="button"
                                class="orders-index__button"
                                aria-current=${() => (selectedOrder.value?.id === order.value.id ? 'true' : null)}
                                @click=${() => (selectedOrderId.value = order.value.id)}>
                                <span class="orders-index__topline">
                                  <span>${() => orderNumber(order.value.id)}</span>
                                  <ore-badge color=${() => STATUS_COLOR[order.value.status]} variant="flat">
                                    ${() => formatOrderStatus(order.value.status)}
                                  </ore-badge>
                                </span>
                                <strong>${() => order.value.items.map(({ modelName }) => modelName).join(', ')}</strong>
                                <span>
                                  ${() => t('orders.placedOn', { date: formatLongDate(order.value.placedAt) })}
                                </span>
                                <span class="orders-index__total">${() => formatPrice(order.value.pricing.total)}</span>
                              </button>
                            </li>
                          `,
                        )}
                      </ul>
                    </aside>

                    ${when(
                      () => selectedOrder.value !== null,
                      () => {
                        const order = selectedOrder;
                        return html`
                          <article class="order-detail" aria-labelledby="selected-order-title">
                            <header class="order-detail__overview">
                              <ore-skeleton striped aria-hidden="true"></ore-skeleton>
                              <div class="order-detail__intro">
                                <span class="orders-view__eyebrow">${() => t('orders.selectedOrder')}</span>
                                <div class="order-detail__title-row">
                                  <div>
                                    <h2 id="selected-order-title">
                                      ${() => order.value.items.map(({ modelName }) => modelName).join(', ')}
                                    </h2>
                                    <p>
                                      ${() => `${orderNumber(order.value.id)} · ${formatLongDate(order.value.placedAt)}`}
                                    </p>
                                  </div>
                                  <ore-badge color=${() => STATUS_COLOR[order.value.status]} variant="flat">
                                    ${() => formatOrderStatus(order.value.status)}
                                  </ore-badge>
                                </div>
                                <p class="order-detail__delivery-date">
                                  ${() => t('orders.current.estDelivery', { date: formatLongDate(order.value.estimatedDeliveryDate) })}
                                </p>
                              </div>
                            </header>

                            <section class="order-detail__status" aria-labelledby="order-status-title">
                              <h3 id="order-status-title">${() => t('orders.current.statusTitle')}</h3>
                              <order-timeline status=${() => order.value.status}></order-timeline>
                            </section>

                            <div class="order-detail__grid">
                              <div class="order-detail__main">
                                <section class="order-detail__panel" aria-labelledby="order-delivery-title">
                                  <header>
                                    <span><ore-icon name="map-pin" size="16" aria-hidden="true"></ore-icon></span>
                                    <h3 id="order-delivery-title">${() => t('orders.details.delivery')}</h3>
                                  </header>
                                  <dl>
                                    <dt>${() => t('orders.details.method')}</dt>
                                    <dd>
                                      ${() =>
                                        t(
                                          order.value.deliveryMethod === 'pickup'
                                            ? 'orders.details.dealerPickup'
                                            : 'orders.details.homeDelivery',
                                        )}
                                    </dd>
                                    <dt>${() => t('orders.details.destination')}</dt>
                                    <dd>${() => addressLabel(order.value)}</dd>
                                  </dl>
                                </section>

                                <section class="order-detail__panel" aria-labelledby="order-payment-title">
                                  <header>
                                    <span><ore-icon name="credit-card" size="16" aria-hidden="true"></ore-icon></span>
                                    <h3 id="order-payment-title">${() => t('orders.details.payment')}</h3>
                                  </header>
                                  <dl>
                                    <dt>${() => t('orders.details.paymentMethod')}</dt>
                                    <dd>${() => formatPaymentMethod(order.value.paymentMethod)}</dd>
                                    ${when(
                                      () => order.value.financing !== null,
                                      () => html`
                                        <dt>${() => t('orders.details.financing')}</dt>
                                        <dd>
                                          ${() =>
                                            t('orders.details.financingTerms', {
                                              apr: order.value.financing?.aprPercent ?? 0,
                                              months: order.value.financing?.termMonths ?? 0,
                                            })}
                                        </dd>
                                      `,
                                    )}
                                  </dl>
                                </section>

                                <section
                                  class="order-detail__panel order-detail__vehicles"
                                  aria-labelledby="order-config-title">
                                  <header>
                                    <span><ore-icon name="car-front" size="16" aria-hidden="true"></ore-icon></span>
                                    <h3 id="order-config-title">${() => t('orders.current.configTitle')}</h3>
                                  </header>
                                  <ul>
                                    ${() =>
                                      selectedItems.value.map(
                                        ({ colorName, item, trimName, wheelName }) => html`
                                          <li>
                                            <div class="order-detail__vehicle-identity">
                                              <strong>${`${item.modelName} × ${item.quantity}`}</strong>
                                              ${when(
                                                trimName !== '',
                                                () => html`
                                                  <span>${`${trimName} · ${colorName} · ${wheelName}`}</span>
                                                `,
                                              )}
                                            </div>
                                            <span>${formatPrice(item.breakdown.subtotal)}</span>
                                          </li>
                                        `,
                                      )}
                                  </ul>
                                </section>
                              </div>

                              <aside class="order-detail__pricing" aria-labelledby="order-pricing-title">
                                <h3 id="order-pricing-title">${() => t('orders.details.orderTotal')}</h3>
                                <dl>
                                  <dt>${() => t('common.subtotal')}</dt>
                                  <dd>${() => formatPrice(order.value.pricing.subtotal)}</dd>
                                  ${when(
                                    () => Number(order.value.pricing.discount) > 0,
                                    () => html`
                                      <dt class="discount">${() => t('cart.discount')}</dt>
                                      <dd class="discount">${() => `−${formatPrice(order.value.pricing.discount)}`}</dd>
                                    `,
                                  )}
                                  <dt>${() => t('cart.estimatedTax')}</dt>
                                  <dd>${() => formatPrice(order.value.pricing.tax)}</dd>
                                  ${when(
                                    () => Number(order.value.pricing.tradeInCredit) > 0,
                                    () => html`
                                      <dt class="discount">${() => t('orders.details.tradeInCredit')}</dt>
                                      <dd class="discount">
                                        ${() => `−${formatPrice(order.value.pricing.tradeInCredit)}`}
                                      </dd>
                                    `,
                                  )}
                                  <dt class="total">${() => t('common.total')}</dt>
                                  <dd class="total">${() => formatPrice(order.value.pricing.total)}</dd>
                                </dl>
                                ${when(
                                  () => order.value.pricing.promoCode !== null,
                                  () => html`
                                    <p class="order-detail__promo">
                                      ${() => t('orders.details.promoApplied', { code: order.value.pricing.promoCode ?? '' })}
                                    </p>
                                  `,
                                )}
                                <div class="order-detail__actions">
                                  <ore-button
                                    variant="outline"
                                    size="sm"
                                    @click=${() => downloadOrderSummary(order.value)}>
                                    <ore-icon slot="prefix" name="download" size="14" aria-hidden="true"></ore-icon>
                                    ${() => t('orders.downloadSummary')}
                                  </ore-button>
                                  ${when(
                                    () => canCancelOrder(order.value),
                                    () => html`
                                      <ore-button
                                        variant="ghost"
                                        size="sm"
                                        color="error"
                                        label=${() => t('orders.cancelNamed', { id: orderNumber(order.value.id) })}
                                        @click=${() => (cancelTarget.value = order.value)}>
                                        ${() => t('orders.cancel')}
                                      </ore-button>
                                    `,
                                  )}
                                </div>
                              </aside>
                            </div>
                          </article>
                        `;
                      },
                    )}
                  </div>
                `,
              )}
            `,
          )}
        `,
      )}

      <ore-dialog
        size="sm"
        dismissible
        label=${() => t('orders.cancelConfirmTitle')}
        ?open=${() => cancelTarget.value !== null}
        @close=${() => (cancelTarget.value = null)}>
        <p>
          ${() => t('orders.cancelConfirmBody', { id: cancelTarget.value ? orderNumber(cancelTarget.value.id) : '' })}
        </p>
        <div slot="footer">
          <ore-button variant="outline" @click=${() => (cancelTarget.value = null)}>
            ${() => t('orders.cancelConfirmKeep')}
          </ore-button>
          <ore-button color="error" @click=${onCancelConfirm}>${() => t('orders.cancelConfirmAction')}</ore-button>
        </div>
      </ore-dialog>
    `;
  },
  shadow: false,
});

export function createOrdersView(): HTMLElement {
  const element = document.createElement('orders-view');
  element.className = 'orders-view';
  return element;
}
