import '@vielzeug/refine/async';
import '@vielzeug/refine/badge';
import '@vielzeug/refine/button';
import '@vielzeug/refine/icon';
import '@vielzeug/refine/input';
import '@vielzeug/refine/number-input';
import '@vielzeug/refine/skeleton';

import '../components/animated-price';

import { define, each, html, onCleanup, when } from '@vielzeug/ore';
import { computed, signal } from '@vielzeug/ripple';
import { s } from '@vielzeug/spell';

import { buildConfigurationUrl } from '../../core/build-url';
import { appliedPromoCode, cartCount, cartLineBreakdowns, cartSummary } from '../../core/cart-store';
import { controlValue } from '../../core/control-value';
import { removeFromCart, restoreCartItem, setCartItemQuantity } from '../../core/history';
import { t } from '../../core/i18n';
import { canPlaceOrder } from '../../core/order-actions';
import { resolveConfiguration } from '../../core/pricing';
import { router } from '../../core/router';
import type { CartItem } from '../../core/types';

const PromoCodeSchema = s
  .string()
  .trim()
  .regex(/^VIELZEUG-\d{3,4}$/i, () => 'Format: VIELZEUG-1234');

type RemovedLine = { item: CartItem; modelName: string; promoCode: string };

define('cart-view', {
  setup() {
    const promoInput = signal(appliedPromoCode.value);
    const promoError = signal('');
    const removedLine = signal<RemovedLine | null>(null);
    const canCheckout = computed(canPlaceOrder);
    let removalTimer: ReturnType<typeof setTimeout> | null = null;

    const clearRemovalTimer = (): void => {
      if (!removalTimer) return;
      clearTimeout(removalTimer);
      removalTimer = null;
    };

    const applyPromo = (event: Event): void => {
      event.preventDefault();
      const result = PromoCodeSchema.safeParse(promoInput.value);
      if (!result.success) {
        promoError.value = t('cart.promoInvalid');
        return;
      }
      promoError.value = '';
      appliedPromoCode.value = result.data.toUpperCase();
      promoInput.value = appliedPromoCode.value;
    };

    const removePromo = (): void => {
      appliedPromoCode.value = '';
      promoInput.value = '';
      promoError.value = '';
    };

    const removeLine = (item: CartItem, modelName: string): void => {
      clearRemovalTimer();
      removedLine.value = { item, modelName, promoCode: appliedPromoCode.value };
      removeFromCart(item.id);
      removalTimer = setTimeout(() => {
        removedLine.value = null;
        removalTimer = null;
      }, 6000);
    };

    const undoRemoval = (): void => {
      const removed = removedLine.value;
      if (!removed) return;
      restoreCartItem(removed.item);
      appliedPromoCode.value = removed.promoCode;
      removedLine.value = null;
      clearRemovalTimer();
    };

    onCleanup(clearRemovalTimer);

    return html`
      <header class="cart-view__header">
        <div>
          <span class="cart-view__eyebrow">${() => t('cart.eyebrow')}</span>
          <h1>${() => t('cart.title')}</h1>
          <p>
            ${() =>
              t(cartCount.value === 1 ? 'cart.itemCountSingle' : 'cart.itemCountPlural', { count: cartCount.value })}
          </p>
        </div>
        ${when(
          () => cartLineBreakdowns.value.length > 0,
          () => html`
            <ore-button variant="outline" @click=${() => void router.navigate({ name: 'catalog' })}>
              <ore-icon slot="prefix" name="arrow-left" size="15" aria-hidden="true"></ore-icon>
              ${() => t('cart.continueShopping')}
            </ore-button>
          `,
        )}
      </header>

      ${when(
        () => cartLineBreakdowns.value.length === 0,
        () => html`
          <section class="cart-view__empty" aria-labelledby="empty-cart-title">
            <span class="cart-view__empty-icon">
              <ore-icon name="car-front" size="28" aria-hidden="true"></ore-icon>
            </span>
            <h2 id="empty-cart-title">${() => t('cart.empty')}</h2>
            <p>${() => t('cart.emptyHint')}</p>
            <ore-button color="primary" size="lg" @click=${() => void router.navigate({ name: 'catalog' })}>
              ${() => t('cart.emptyCta')}
              <ore-icon slot="suffix" name="arrow-right" size="16" aria-hidden="true"></ore-icon>
            </ore-button>
          </section>
        `,
        () => html`
          <div class="cart-workspace">
            <section class="cart-items" aria-label=${() => t('cart.items')}>
              <ul class="cart-view__lines">
                ${each(
                  cartLineBreakdowns,
                  (line) => line.item.id,
                  (line) => {
                    const resolved = () => resolveConfiguration(line.value.model, line.value.item.configuration);
                    const headingId = `cart-line-${line.value.item.id}`;

                    return html`
                      <li>
                        <article class="cart-line" aria-labelledby=${headingId}>
                          <ore-skeleton striped aria-hidden="true"></ore-skeleton>
                          <div class="cart-line__content">
                            <header class="cart-line__header">
                              <div>
                                <span class="cart-line__eyebrow">${() => line.value.model.segment}</span>
                                <h2 id=${headingId}>${() => line.value.model.name}</h2>
                              </div>
                              <div class="cart-line__subtotal">
                                <span class="cart-line__subtotal-label">${() => t('cart.vehicleSubtotal')}</span>
                                <strong>
                                  <animated-price
                                    value-usd=${() => line.value.priceBreakdown.subtotal}></animated-price>
                                </strong>
                              </div>
                            </header>

                            <dl class="cart-line__configuration">
                              <div>
                                <dt>${() => t('cart.trim')}</dt>
                                <dd>${() => resolved().trim.name}</dd>
                              </div>
                              <div>
                                <dt>${() => t('cart.paint')}</dt>
                                <dd>${() => resolved().color.name}</dd>
                              </div>
                              <div>
                                <dt>${() => t('cart.wheels')}</dt>
                                <dd>${() => resolved().wheel.name}</dd>
                              </div>
                              <div>
                                <dt>${() => t('cart.packages')}</dt>
                                <dd>
                                  ${() =>
                                    resolved().extraPackages.length
                                      ? resolved()
                                          .extraPackages.map(({ name }) => name)
                                          .join(', ')
                                      : t('cart.noExtraPackages')}
                                </dd>
                              </div>
                            </dl>

                            <div class="cart-line__actions">
                              <ore-number-input
                                label=${() => `${t('cart.quantity')}: ${line.value.model.name}`}
                                size="sm"
                                min="1"
                                max="5"
                                value=${() => line.value.item.quantity}
                                @input=${(event: Event) =>
                                  setCartItemQuantity(
                                    line.value.item.id,
                                    Number(controlValue(event)) || 1,
                                  )}></ore-number-input>
                              <div>
                                <ore-button
                                  href=${() => buildConfigurationUrl(line.value.model, line.value.item.configuration)}
                                  variant="ghost"
                                  size="sm">
                                  <ore-icon
                                    slot="prefix"
                                    name="sliders-horizontal"
                                    size="14"
                                    aria-hidden="true"></ore-icon>
                                  ${() => t('cart.editConfiguration')}
                                </ore-button>
                                <ore-button
                                  variant="ghost"
                                  size="sm"
                                  label=${() => t('cart.removeNamed', { name: line.value.model.name })}
                                  @click=${() => removeLine(line.value.item, line.value.model.name)}>
                                  <ore-icon slot="prefix" name="trash-2" size="14" aria-hidden="true"></ore-icon>
                                  ${() => t('cart.remove')}
                                </ore-button>
                              </div>
                            </div>
                          </div>
                        </article>
                      </li>
                    `;
                  },
                )}
              </ul>
            </section>

            <aside class="cart-summary" aria-labelledby="cart-summary-title">
              <header>
                <span class="cart-summary__icon">
                  <ore-icon name="receipt-text" size="17" aria-hidden="true"></ore-icon>
                </span>
                <h2 class="cart-summary__title" id="cart-summary-title">${() => t('cart.summary')}</h2>
              </header>

              <dl class="cart-summary__prices">
                <dt>${() => t('common.subtotal')}</dt>
                <dd><animated-price value-usd=${() => cartSummary.value.subtotal}></animated-price></dd>
                ${when(
                  () => Boolean(appliedPromoCode.value),
                  () => html`
                    <dt class="cart-summary__discount">${() => t('cart.discount')}</dt>
                    <dd class="cart-summary__discount">
                      −
                      <animated-price value-usd=${() => cartSummary.value.discount}></animated-price>
                    </dd>
                  `,
                )}
                <dt>${() => t('cart.estimatedTax')}</dt>
                <dd><animated-price value-usd=${() => cartSummary.value.tax}></animated-price></dd>
                <dt>${() => t('cart.delivery')}</dt>
                <dd>${() => t('cart.calculatedNext')}</dd>
                <dt class="total">${() => t('cart.estimatedTotal')}</dt>
                <dd class="total">
                  <animated-price aria-live="polite" value-usd=${() => cartSummary.value.total}></animated-price>
                </dd>
              </dl>

              <div class="cart-promo">
                ${when(
                  () => Boolean(appliedPromoCode.value),
                  () => html`
                    <div class="cart-promo__applied">
                      <span class="cart-promo__identity">
                        <ore-icon name="badge-check" size="16" aria-hidden="true"></ore-icon>
                        <span class="cart-promo__copy">
                          <strong>${() => appliedPromoCode.value}</strong>
                          <small>${() => t('cart.promoApplied', { percent: 10 })}</small>
                        </span>
                      </span>
                      <ore-button variant="ghost" size="sm" @click=${removePromo}>
                        ${() => t('cart.promoRemove')}
                      </ore-button>
                    </div>
                  `,
                  () => html`
                    <form class="cart-promo__form" @submit=${applyPromo}>
                      <ore-input
                        label-placement="outside"
                        label=${() => t('cart.promoLabel')}
                        value=${promoInput}
                        error=${promoError}
                        @input=${(event: Event) => {
                          promoInput.value = controlValue(event) ?? '';
                          promoError.value = '';
                        }}></ore-input>
                      <ore-button
                        type="submit"
                        variant="outline"
                        ?disabled=${() => promoInput.value.trim().length === 0}>
                        ${() => t('cart.promoApply')}
                      </ore-button>
                    </form>
                  `,
                )}
              </div>

              <p class="cart-summary__note">${() => t('cart.pricingNote')}</p>

              ${when(
                canCheckout,
                () => html`
                  <ore-button
                    class="cart-summary__checkout"
                    color="primary"
                    size="lg"
                    @click=${() => void router.navigate({ name: 'checkoutShipping' })}>
                    ${() => t('cart.checkout')}
                    <ore-icon slot="suffix" name="arrow-right" size="16" aria-hidden="true"></ore-icon>
                  </ore-button>
                `,
                () => html`
                  <div class="cart-summary__permission" role="note">
                    <ore-icon name="shield-alert" size="18" aria-hidden="true"></ore-icon>
                    <p>${() => t('cart.checkoutUnavailable')}</p>
                    <ore-button variant="outline" size="sm" @click=${() => void router.navigate({ name: 'settings' })}>
                      ${() => t('cart.switchPersona')}
                    </ore-button>
                  </div>
                `,
              )}

              <ul class="cart-summary__assurances">
                <li>
                  <ore-icon name="lock-keyhole" size="14" aria-hidden="true"></ore-icon>
                  ${() => t('cart.secureCheckout')}
                </li>
                <li>
                  <ore-icon name="save" size="14" aria-hidden="true"></ore-icon>
                  ${() => t('cart.configurationSaved')}
                </li>
              </ul>
            </aside>
          </div>
        `,
      )}
      ${when(
        () => removedLine.value !== null,
        () => html`
          <div class="cart-undo" role="status">
            <span>${() => t('cart.removedNamed', { name: removedLine.value?.modelName ?? '' })}</span>
            <ore-button variant="ghost" size="sm" @click=${undoRemoval}>${() => t('cart.undo')}</ore-button>
          </div>
        `,
      )}
    `;
  },
  shadow: false,
});

export function createCartView(): HTMLElement {
  const element = document.createElement('cart-view');
  element.className = 'cart-view';
  return element;
}
