import '@vielzeug/refine/input';
import '@vielzeug/refine/select';
import '@vielzeug/refine/radio-group';
import '@vielzeug/refine/radio';
import '@vielzeug/refine/number-input';
import '@vielzeug/refine/otp-input';
import '@vielzeug/refine/button';
import '@vielzeug/refine/alert';
import '@vielzeug/refine/chip';
import '@vielzeug/refine/icon';

import '../components/share-build-dialog';

import { createForm } from '@vielzeug/forge';
import { define, html, when } from '@vielzeug/ore';
import { signal } from '@vielzeug/ripple';

import type { CheckoutStep } from '../../core/checkout-machine';
import type { RouteNames } from '../../core/router';
import type { Address, DeliveryMethod, FinancingTerms, Order, PaymentMethod, TradeIn } from '../../core/types';

import { currentUser } from '../../core/auth';
import { cartItems, cartLineBreakdowns, cartTotal } from '../../core/cart-store';
import { modelMap } from '../../core/catalog';
import { checkoutMachine } from '../../core/checkout-machine';
import { formatPrice } from '../../core/currency';
import { bus } from '../../core/events';
import { estimateDeliveryDate, formatLongDate, formatPaymentMethod } from '../../core/format';
import { t } from '../../core/i18n';
import { logger } from '../../core/logger';
import { attemptPlaceOrder } from '../../core/order-actions';
import { applyTradeInCredit, resolveConfiguration } from '../../core/pricing';
import { activeRouteParams, router } from '../../core/router';
import { DEALERS } from '../../core/seed-data';
import { openShareBuildDialog } from '../components/share-build-dialog';

// ---------------------------------------------------------------------------
// Module-scoped checkout session state — committed step data persists across step
// navigations within one checkout flow, mirroring `checkoutMachine`'s own module-level
// singleton (core/checkout-machine.ts). Deliberately NOT ripple signals: each step is a
// fresh render on every navigation (see ui/app-shell.ts's `renderView()`), so plain reads
// at construction time are all that's needed — no cross-render reactivity required.
// ---------------------------------------------------------------------------

let committedShipping: Address | null = null;
let committedDelivery: { dealerId: string | null; method: DeliveryMethod } | null = null;
let committedPayment: { financing: FinancingTerms | null; method: PaymentMethod } | null = null;
let committedTradeIn: TradeIn | null = null;
let lastPlacedOrder: Order | null = null;

const shippingForm = createForm<Address>({
  initialValues: { city: '', country: '', fullName: '', phone: '', postalCode: '', street: '' },
  validate: (value) => ({
    fields: {
      city: value.city.trim() ? undefined : 'City is required',
      country: value.country.trim() ? undefined : 'Country is required',
      fullName: value.fullName.trim() ? undefined : 'Full name is required',
      phone: value.phone.trim() ? undefined : 'Phone is required',
      postalCode: value.postalCode.trim() ? undefined : 'Postal code is required',
      street: value.street.trim() ? undefined : 'Street is required',
    },
  }),
});

/**
 * Wayfinder's `navigate()` is typed as a discriminated union keyed by the literal route name so
 * each route's own param shape is checked at the call site — exactly what every direct
 * `router.navigate({ name: 'modelDetail', params: { slug } })` call elsewhere in this app relies
 * on. This helper deliberately takes the general `RouteNames` union (so every checkout step can
 * share one `goto()`), which the discriminated union can't narrow from — the cast documents that
 * trade-off instead of silently widening `router.navigate`'s own public signature.
 */
function goto(name: RouteNames, params?: Record<string, string>): void {
  void router.navigate((params ? { name, params } : { name }) as Parameters<typeof router.navigate>[0]);
}

function notifyAndRedirect(messageKey: string, target: RouteNames): false {
  bus.emit('toast:show', { message: t(messageKey), variant: 'error' });
  goto(target);

  return false;
}

/**
 * Step-entry guards — each checkout step calls the ones it depends on at the very top of its own
 * `setup()`, before reading any committed data. Without these, loading a step directly (a
 * bookmark, browser back/forward, or a mid-flow refresh) rendered a step with silently-missing
 * data instead of explaining what happened; see the app's own critique notes on this flow.
 */
function ensureCartNotEmpty(): boolean {
  return cartLineBreakdowns.value.length > 0 || notifyAndRedirect('checkout.errors.emptyCart', 'cart');
}

function ensureShippingCommitted(): boolean {
  return committedShipping !== null || notifyAndRedirect('checkout.errors.missingShipping', 'checkoutShipping');
}

function ensurePaymentCommitted(): boolean {
  return committedPayment !== null || notifyAndRedirect('checkout.errors.missingPayment', 'checkoutPayment');
}

/** Resolves a trade-in-adjusted grand total — reads `committedTradeIn` (a plain module var, not a
 * signal) alongside the reactive `cartTotal`, so every call site stays reactive to cart changes
 * while the trade-in credit itself is a fixed value for the rest of this checkout session. */
function displayTotal(): string {
  return committedTradeIn
    ? applyTradeInCredit(cartTotal.value.total, committedTradeIn.estimatedValueUsd)
    : cartTotal.value.total;
}

// ── Progress stepper — shared by all four steps below ───────────────────────

const STEP_ORDER: CheckoutStep[] = ['shipping', 'payment', 'review', 'confirmed'];
const STEP_LABEL_KEYS: Record<CheckoutStep, string> = {
  confirmed: 'checkout.steps.confirmation',
  payment: 'checkout.steps.payment',
  review: 'checkout.steps.review',
  shipping: 'checkout.steps.shipping',
};

/**
 * A "Vehicle" node is prepended and always rendered `done` — every step below only renders once
 * `ensureCartNotEmpty()` has already passed, so the cart is never actually empty by the time a
 * shopper sees this. Plain, non-reactive markup: like the rest of this checkout flow, each step
 * is a fresh render per navigation (see the module comment above), so there's no need for this to
 * update in place.
 */
function checkoutStepper(current: CheckoutStep) {
  const currentIndex = STEP_ORDER.indexOf(current);

  return html`
    <ol class="checkout-stepper" aria-label=${() => t('checkout.steps.ariaLabel')}>
      <li class="checkout-stepper__step" data-state="done">
        <span class="checkout-stepper__marker"><ore-icon name="check" size="12" aria-hidden="true"></ore-icon></span>
        <span class="checkout-stepper__label">${() => t('checkout.steps.vehicle')}</span>
      </li>
      ${STEP_ORDER.map((step, i) => {
        const state = i < currentIndex ? 'done' : i === currentIndex ? 'active' : 'upcoming';

        return html`
          <li class="checkout-stepper__step" data-state=${state}>
            <span class="checkout-stepper__marker">
              ${
                state === 'done'
                  ? html`
                      <ore-icon name="check" size="12" aria-hidden="true"></ore-icon>
                    `
                  : `${i + 2}`
              }
            </span>
            <span class="checkout-stepper__label">${() => t(STEP_LABEL_KEYS[step])}</span>
          </li>
        `;
      })}
    </ol>
  `;
}

// ── Step: Shipping ───────────────────────────────────────────────────────────

const DEALER_OPTIONS = DEALERS.map((d) => ({ label: `${d.name} — ${d.city}`, value: d.id }));

define('checkout-shipping', {
  setup() {
    if (!ensureCartNotEmpty()) return html``;

    const errors = signal<Partial<Record<keyof Address, string>>>({});
    const deliveryMethod = signal<DeliveryMethod>(committedDelivery?.method ?? 'delivery');
    const dealerId = signal<string | null>(committedDelivery?.dealerId ?? null);
    const dealerError = signal('');

    function onDeliveryMethodChange(e: Event): void {
      deliveryMethod.value = (e.currentTarget as HTMLElementTagNameMap['ore-select']).value as DeliveryMethod;
      dealerError.value = '';
    }

    function onDealerChange(e: Event): void {
      dealerId.value = (e.currentTarget as HTMLElementTagNameMap['ore-select']).value || null;
      dealerError.value = '';
    }

    async function onContinue(): Promise<void> {
      const validation = await shippingForm.validate();

      if (validation.status !== 'valid') {
        errors.value = validation.status === 'invalid' ? (validation.errors ?? {}) : {};

        return;
      }

      errors.value = {};

      if (deliveryMethod.value === 'pickup' && !dealerId.value) {
        dealerError.value = t('checkout.errors.missingDealer');

        return;
      }

      committedShipping = shippingForm.value;
      committedDelivery = {
        dealerId: deliveryMethod.value === 'pickup' ? dealerId.value : null,
        method: deliveryMethod.value,
      };

      const sent = checkoutMachine.send({ type: 'NEXT' });

      if (sent.status !== 'transitioned') logger.warn(`Unexpected checkout transition from shipping: ${sent.status}`);

      goto('checkoutPayment');
    }

    const field = (name: keyof Address, label: string) => html`
      <ore-input
        label=${label}
        required
        value=${() => shippingForm.field(name).value}
        error=${() => errors.value[name] ?? ''}
        @input=${(e: Event) => shippingForm.field(name).set((e.currentTarget as HTMLElementTagNameMap['ore-input']).value ?? '')}
        @blur=${() => shippingForm.field(name).touch()}></ore-input>
    `;

    return html`
      ${checkoutStepper('shipping')}
      <h1>${() => t('checkout.shipping.title')}</h1>
      <div class="checkout-form">
        ${field('fullName', t('checkout.shipping.fullName'))} ${field('street', t('checkout.shipping.street'))}
        <div class="checkout-form__row">
          ${field('city', t('checkout.shipping.city'))} ${field('postalCode', t('checkout.shipping.postalCode'))}
        </div>
        <div class="checkout-form__row">
          ${field('country', t('checkout.shipping.country'))} ${field('phone', t('checkout.shipping.phone'))}
        </div>
      </div>

      <section class="checkout-delivery">
        <h2>${() => t('checkout.delivery.title')}</h2>
        <ore-radio-group
          label=${() => t('checkout.delivery.methodLabel')}
          value=${() => deliveryMethod.value}
          @change=${onDeliveryMethodChange}>
          <ore-radio value="delivery">${() => t('checkout.delivery.methodDelivery')}</ore-radio>
          <ore-radio value="pickup">${() => t('checkout.delivery.methodPickup')}</ore-radio>
        </ore-radio-group>
        ${when(
          () => deliveryMethod.value === 'pickup',
          () => html`
            <ore-select
              label=${() => t('checkout.delivery.dealerLabel')}
              options=${DEALER_OPTIONS}
              value=${() => dealerId.value ?? ''}
              error=${() => dealerError.value}
              @change=${onDealerChange}></ore-select>
          `,
        )}
      </section>

      <div class="checkout-actions">
        <ore-button rounded variant="bordered" @click=${() => goto('cart')}>
          ${() => t('checkout.backToCart')}
        </ore-button>
        <ore-button rounded variant="solid" color="primary" @click=${() => void onContinue()}>
          ${() => t('checkout.shipping.continue')}
        </ore-button>
      </div>
    `;
  },
  shadow: false,
});

// ── Step: Payment ─────────────────────────────────────────────────────────────

const DEMO_VERIFICATION_CODE = '123456';
const TERM_MONTH_OPTIONS = [36, 48, 60, 72];

define('checkout-payment', {
  setup() {
    if (!ensureCartNotEmpty() || !ensureShippingCommitted()) return html``;

    const method = signal<PaymentMethod>('cash');
    const downPayment = signal(5000);
    const termMonths = signal(60);
    const verificationCode = signal('');
    const error = signal('');

    const tradeInEnabled = signal(committedTradeIn !== null);
    const tradeInDescription = signal(committedTradeIn?.description ?? '');
    const tradeInValue = signal(Number.parseFloat(committedTradeIn?.estimatedValueUsd ?? '0'));

    function onMethodChange(e: Event): void {
      method.value = (e as CustomEvent<{ values: string[] }>).detail.values[0] as PaymentMethod;
      error.value = '';
    }

    function onTradeInToggle(e: Event): void {
      tradeInEnabled.value = (e as CustomEvent<{ values: string[] }>).detail.values[0] === 'yes';
    }

    function onContinue(): void {
      if (method.value === 'financing' && verificationCode.value !== DEMO_VERIFICATION_CODE) {
        error.value = t('checkout.payment.verificationError');

        return;
      }

      committedPayment = {
        financing:
          method.value === 'financing'
            ? { aprPercent: 4.9, downPaymentAmount: downPayment.value.toFixed(2), termMonths: termMonths.value }
            : null,
        method: method.value,
      };

      committedTradeIn =
        tradeInEnabled.value && tradeInDescription.value.trim() !== ''
          ? { description: tradeInDescription.value.trim(), estimatedValueUsd: tradeInValue.value.toFixed(2) }
          : null;

      const sent = checkoutMachine.send({ type: 'NEXT' });

      if (sent.status !== 'transitioned') logger.warn(`Unexpected checkout transition from payment: ${sent.status}`);

      goto('checkoutReview');
    }

    return html`
      ${checkoutStepper('payment')}
      <h1>${() => t('checkout.payment.title')}</h1>
      <ore-radio-group
        label=${() => t('checkout.payment.methodLabel')}
        value=${() => method.value}
        @change=${onMethodChange}>
        <ore-radio value="cash">${() => t('checkout.payment.methodCash')}</ore-radio>
        <ore-radio value="financing">${() => t('checkout.payment.methodFinancing')}</ore-radio>
        <ore-radio value="lease">${() => t('checkout.payment.methodLease')}</ore-radio>
      </ore-radio-group>
      ${when(
        () => method.value === 'financing',
        () => html`
          <div class="checkout-form__row">
            <ore-number-input
              label=${() => t('checkout.payment.downPaymentLabel')}
              min="0"
              step="500"
              max=${() => Number(displayTotal())}
              value=${() => downPayment.value}
              @input=${(e: Event) =>
                (downPayment.value =
                  Number((e.currentTarget as HTMLElementTagNameMap['ore-number-input']).value) ||
                  0)}></ore-number-input>
            <ore-select
              label=${() => t('checkout.payment.termLabel')}
              options=${TERM_MONTH_OPTIONS.map((months) => ({ label: t('checkout.payment.termOption', { months }), value: String(months) }))}
              value=${() => String(termMonths.value)}
              @change=${(e: Event) =>
                (termMonths.value = Number(
                  (e.currentTarget as HTMLElementTagNameMap['ore-select']).value,
                ))}></ore-select>
          </div>
          <ore-otp-input
            label=${() => t('checkout.payment.verificationCode')}
            length="6"
            value=${() => verificationCode.value}
            @change=${(e: Event) =>
              (verificationCode.value =
                (e.currentTarget as HTMLElementTagNameMap['ore-otp-input']).value ?? '')}></ore-otp-input>
          <p class="checkout-form__hint">${() => t('checkout.payment.verificationHint')}</p>
        `,
      )}
      ${when(
        () => error.value !== '',
        () => html`
          <ore-alert color="error">${() => error.value}</ore-alert>
        `,
      )}

      <section class="checkout-tradein">
        <h2>${() => t('checkout.tradeIn.title')}</h2>
        <ore-radio-group value=${() => (tradeInEnabled.value ? 'yes' : 'no')} @change=${onTradeInToggle}>
          <ore-radio value="no">${() => t('checkout.tradeIn.no')}</ore-radio>
          <ore-radio value="yes">${() => t('checkout.tradeIn.toggle')}</ore-radio>
        </ore-radio-group>
        ${when(
          () => tradeInEnabled.value,
          () => html`
            <div class="checkout-form__row">
              <ore-input
                label=${() => t('checkout.tradeIn.descriptionLabel')}
                value=${() => tradeInDescription.value}
                @input=${(e: Event) =>
                  (tradeInDescription.value =
                    (e.currentTarget as HTMLElementTagNameMap['ore-input']).value ?? '')}></ore-input>
              <ore-number-input
                label=${() => t('checkout.tradeIn.valueLabel')}
                min="0"
                step="500"
                value=${() => tradeInValue.value}
                @input=${(e: Event) =>
                  (tradeInValue.value =
                    Number((e.currentTarget as HTMLElementTagNameMap['ore-number-input']).value) ||
                    0)}></ore-number-input>
            </div>
            <div class="checkout-tradein__photos">
              <ore-icon name="camera" size="18" aria-hidden="true"></ore-icon>
              <span>${() => t('checkout.tradeIn.photosLabel')} — ${() => t('checkout.tradeIn.photosHint')}</span>
            </div>
          `,
        )}
      </section>

      <div class="checkout-actions">
        <ore-button rounded variant="bordered" @click=${() => goto('checkoutShipping')}>
          ${() => t('common.back')}
        </ore-button>
        <ore-button rounded variant="solid" color="primary" @click=${onContinue}>
          ${() => t('checkout.review.title')}
        </ore-button>
      </div>
    `;
  },
  shadow: false,
});

// ── Step: Review ─────────────────────────────────────────────────────────────

define('checkout-review', {
  setup() {
    if (!ensureCartNotEmpty() || !ensureShippingCommitted() || !ensurePaymentCommitted()) return html``;

    const placing = signal(false);
    const dealer = committedDelivery?.dealerId ? DEALERS.find((d) => d.id === committedDelivery?.dealerId) : undefined;

    async function onPlaceOrder(): Promise<void> {
      if (!committedShipping || !committedPayment || !committedDelivery) {
        goto('cart');

        return;
      }

      placing.value = true;

      const order: Order = {
        dealerId: committedDelivery.dealerId,
        deliveryMethod: committedDelivery.method,
        estimatedDeliveryDate: estimateDeliveryDate(),
        financing: committedPayment.financing,
        id: crypto.randomUUID(),
        items: cartLineBreakdowns.value.map((l) => ({
          breakdown: l.priceBreakdown,
          configuration: l.item.configuration,
          modelId: l.model.id,
          modelName: l.model.name,
          quantity: l.item.quantity,
        })),
        paymentMethod: committedPayment.method,
        placedAt: new Date().toISOString(),
        shippingAddress: committedShipping,
        status: 'placed',
        totalAmount: displayTotal(),
        tradeIn: committedTradeIn,
        userId: currentUser.value.id,
      };

      const placed = await attemptPlaceOrder(order);

      placing.value = false;

      if (!placed) return;

      lastPlacedOrder = placed;
      cartItems.value = [];

      const sent = checkoutMachine.send({ orderId: placed.id, type: 'CONFIRM' });

      if (sent.status !== 'transitioned') logger.warn(`Unexpected checkout transition from review: ${sent.status}`);

      goto('checkoutConfirmation', { orderId: placed.id });
    }

    return html`
      ${checkoutStepper('review')}
      <h1>${() => t('checkout.review.title')}</h1>
      <div class="checkout-review__lines">
        ${cartLineBreakdowns.value.map(
          (l) => html`
            <div class="checkout-review__line">
              <span>${() => `${l.model.name} × ${l.item.quantity}`}</span>
              <strong>${() => formatPrice(l.priceBreakdown.total)}</strong>
            </div>
          `,
        )}
      </div>
      ${when(
        () => committedTradeIn !== null,
        () => html`
          <div class="checkout-review__line">
            <span>${() => t('checkout.tradeIn.creditLabel')}</span>
            <strong>−${() => formatPrice(committedTradeIn!.estimatedValueUsd)}</strong>
          </div>
        `,
      )}
      <dl class="checkout-review__total">
        <dt>${() => t('common.total')}</dt>
        <dd>${() => formatPrice(displayTotal())}</dd>
      </dl>
      ${when(
        () => committedShipping !== null,
        () => html`
          <p class="checkout-review__address">
            ${() => `${committedShipping?.fullName}, ${committedShipping?.street}, ${committedShipping?.city}`}
          </p>
        `,
      )}
      ${when(
        () => committedDelivery !== null,
        () => html`
          <ore-chip size="sm" variant="flat">
            ${() =>
              committedDelivery?.method === 'pickup'
                ? `${t('checkout.delivery.methodPickup')} — ${dealer?.name ?? ''}`
                : t('checkout.delivery.methodDelivery')}
          </ore-chip>
        `,
      )}
      ${when(
        () => committedPayment !== null,
        () => html`
          <ore-chip size="sm" variant="flat">${() => formatPaymentMethod(committedPayment!.method)}</ore-chip>
        `,
      )}
      ${when(
        () => committedPayment?.financing != null,
        () => html`
          <section class="checkout-review__financing">
            <h2>${() => t('checkout.review.financingTitle')}</h2>
            <dl>
              <dt>${() => t('checkout.review.financingApr')}</dt>
              <dd>${() => `${committedPayment!.financing!.aprPercent}%`}</dd>
              <dt>${() => t('checkout.review.financingTerm')}</dt>
              <dd>
                ${() => t('checkout.review.financingTermValue', { months: committedPayment!.financing!.termMonths })}
              </dd>
              <dt>${() => t('checkout.review.financingDown')}</dt>
              <dd>${() => formatPrice(committedPayment!.financing!.downPaymentAmount)}</dd>
            </dl>
          </section>
        `,
      )}
      <div class="checkout-actions">
        <ore-button rounded variant="bordered" @click=${() => goto('checkoutPayment')}>
          ${() => t('common.back')}
        </ore-button>
        <ore-button
          rounded
          variant="solid"
          color="primary"
          ?disabled=${() => placing.value}
          @click=${() => void onPlaceOrder()}>
          ${() => t('checkout.review.placeOrder')}
        </ore-button>
      </div>
    `;
  },
  shadow: false,
});

// ── Step: Confirmation ────────────────────────────────────────────────────────

define('checkout-confirmation', {
  setup() {
    const orderId = activeRouteParams.value['orderId'];
    const order = lastPlacedOrder?.id === orderId ? lastPlacedOrder : null;
    const dealer = order?.dealerId ? DEALERS.find((d) => d.id === order.dealerId) : undefined;

    function onShare(): void {
      const line = order?.items[0];
      const model = line ? modelMap.value.get(line.modelId) : undefined;

      if (!line || !model) return;

      const resolved = resolveConfiguration(model, line.configuration);

      openShareBuildDialog({
        breakdown: line.breakdown,
        model,
        selections: { color: resolved.color.name, trim: resolved.trim.name, wheels: resolved.wheel.name },
      });
    }

    return html`
      ${checkoutStepper('confirmed')}
      <h1>${() => t('confirmation.title')}</h1>
      ${when(
        () => order === null,
        () => html`
          <p class="checkout-form__hint">${() => t('confirmation.notFound')}</p>
        `,
      )}
      ${when(
        () => order !== null,
        () => html`
          <p>
            ${() => t('confirmation.orderNumber')}:
            <strong>${() => order!.id}</strong>
          </p>
          <p>
            ${() => t('confirmation.estimatedDelivery')}:
            <strong>${() => formatLongDate(order!.estimatedDeliveryDate)}</strong>
          </p>
          <p>
            ${() =>
              order!.deliveryMethod === 'pickup'
                ? `${t('checkout.delivery.methodPickup')} — ${dealer?.name ?? ''}`
                : t('checkout.delivery.methodDelivery')}
          </p>
          ${when(
            () => order?.tradeIn != null,
            () => html`
              <p>
                ${() => t('checkout.tradeIn.creditLabel')}:
                <strong>−${() => formatPrice(order!.tradeIn!.estimatedValueUsd)}</strong>
              </p>
            `,
          )}
          ${when(
            () => order?.financing != null,
            () => html`
              <section class="checkout-review__financing">
                <h2>${() => t('checkout.review.financingTitle')}</h2>
                <dl>
                  <dt>${() => t('checkout.review.financingApr')}</dt>
                  <dd>${() => `${order!.financing!.aprPercent}%`}</dd>
                  <dt>${() => t('checkout.review.financingTerm')}</dt>
                  <dd>${() => t('checkout.review.financingTermValue', { months: order!.financing!.termMonths })}</dd>
                  <dt>${() => t('checkout.review.financingDown')}</dt>
                  <dd>${() => formatPrice(order!.financing!.downPaymentAmount)}</dd>
                </dl>
              </section>
            `,
          )}
        `,
      )}
      <div class="checkout-actions">
        <ore-button rounded variant="bordered" @click=${onShare}>${() => t('confirmation.shareBuild')}</ore-button>
        <ore-button rounded variant="solid" color="primary" @click=${() => goto('orders')}>
          ${() => t('confirmation.backToOrders')}
        </ore-button>
      </div>
    `;
  },
  shadow: false,
});

export function createCheckoutView(routeName: RouteNames | string): HTMLElement {
  const tag =
    routeName === 'checkoutShipping'
      ? 'checkout-shipping'
      : routeName === 'checkoutPayment'
        ? 'checkout-payment'
        : routeName === 'checkoutReview'
          ? 'checkout-review'
          : 'checkout-confirmation';

  const el = document.createElement(tag);

  el.className = 'checkout';

  return el;
}
