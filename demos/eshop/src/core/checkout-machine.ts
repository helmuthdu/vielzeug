import { defineMachine } from '@vielzeug/clockwork';

// ── Types ─────────────────────────────────────────────────────────────────────

export type CheckoutStep = 'confirmed' | 'payment' | 'review' | 'shipping';

type CheckoutContext = {
  orderId: string | null;
};

type CheckoutEvent = { type: 'BACK' } | { orderId: string; type: 'CONFIRM' } | { type: 'NEXT' } | { type: 'RESTART' };

// ── Singleton — one checkout flow at a time, reset via RESTART after confirmation ────

export const checkoutMachine = defineMachine<CheckoutContext, CheckoutEvent>()({
  context: { orderId: null },
  initial: 'shipping',
  states: {
    confirmed: {
      on: {
        RESTART: { reduce: ({ context }) => ({ ...context, orderId: null }), target: 'shipping' },
      },
    },
    payment: {
      on: {
        BACK: { target: 'shipping' },
        NEXT: { target: 'review' },
      },
    },
    review: {
      on: {
        BACK: { target: 'payment' },
        CONFIRM: {
          reduce: ({ context, event }) => ({ ...context, orderId: event.orderId }),
          target: 'confirmed',
        },
      },
    },
    shipping: {
      on: {
        NEXT: { target: 'payment' },
      },
    },
  },
}).createActor();
