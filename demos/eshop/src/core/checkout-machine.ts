import type { MachineConfig, MachineInstance } from '@vielzeug/clockwork';

import { createMachine } from '@vielzeug/clockwork';

// ── Types ─────────────────────────────────────────────────────────────────────

export type CheckoutStep = 'confirmed' | 'payment' | 'review' | 'shipping';

type CheckoutContext = {
  orderId: string | null;
};

type CheckoutEvent = { type: 'BACK' } | { orderId: string; type: 'CONFIRM' } | { type: 'NEXT' } | { type: 'RESTART' };

// ── Machine definition ────────────────────────────────────────────────────────

export const checkoutMachineDefinition: MachineConfig<CheckoutStep, CheckoutContext, CheckoutEvent> = {
  context: { orderId: null },
  initial: 'shipping',
  states: {
    confirmed: {
      on: {
        RESTART: { actions: [({ context }) => (context.orderId = null)], target: 'shipping' },
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
          actions: [({ context, event }) => (context.orderId = event.orderId)],
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
};

// ── Singleton — one checkout flow at a time, reset via RESTART after confirmation ────

export const checkoutMachine: MachineInstance<CheckoutStep, CheckoutContext, CheckoutEvent> =
  createMachine(checkoutMachineDefinition).start();
