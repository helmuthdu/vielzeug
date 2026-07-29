import { createContainer, token } from '@vielzeug/conduit';
import { Temporal } from '@vielzeug/tempo';

import type { Order, OrderStatus } from './types';

import { courier } from './api';
import { logger } from './logger';

// ---------------------------------------------------------------------------
// Tokens — one per dependency contract, resolved through the container instead
// of imported as bare module singletons. Demonstrates @vielzeug/conduit's DI
// wiring for the app's admin-only reporting service, which itself composes
// the api client and logger tokens below.
// ---------------------------------------------------------------------------

export const LoggerToken = token<typeof logger>('Logger');
export const ApiToken = token<typeof courier>('Api');

export interface RevenuePoint {
  key: Date;
  value: number;
}

export interface SalesReport {
  ordersByStatus: Record<OrderStatus, number>;
  revenueByDay: RevenuePoint[];
  totalRevenueUsd: number;
}

export interface ReportService {
  generateSalesReport(orders: Order[]): SalesReport;
}

export const ReportServiceToken = token<ReportService>('ReportService');

function createReportService(api: typeof courier, log: typeof logger): ReportService {
  return {
    generateSalesReport(orders: Order[]): SalesReport {
      log.debug(`Generating sales report for ${orders.length} orders (api client disposed: ${api.disposed})`);

      const ordersByStatus: Record<OrderStatus, number> = {
        cancelled: 0,
        delivered: 0,
        'in-transit': 0,
        placed: 0,
        processing: 0,
      };

      let totalRevenueUsd = 0;
      const revenueByDayMap = new Map<string, number>();

      const today = Temporal.Now.plainDateISO();

      for (let i = 6; i >= 0; i--) {
        const day = today.subtract({ days: i });

        revenueByDayMap.set(day.toString(), 0);
      }

      for (const order of orders) {
        ordersByStatus[order.status] += 1;

        if (order.status === 'cancelled') continue;

        totalRevenueUsd += Number.parseFloat(order.totalAmount);

        const dayKey = order.placedAt.slice(0, 10);

        if (revenueByDayMap.has(dayKey)) {
          revenueByDayMap.set(dayKey, (revenueByDayMap.get(dayKey) ?? 0) + Number.parseFloat(order.totalAmount));
        }
      }

      const revenueByDay: RevenuePoint[] = [...revenueByDayMap.entries()].map(([key, value]) => ({
        key: new Date(`${key}T00:00:00Z`),
        value: Math.round(value),
      }));

      return { ordersByStatus, revenueByDay, totalRevenueUsd: Math.round(totalRevenueUsd) };
    },
  };
}

// ---------------------------------------------------------------------------
// Container
// ---------------------------------------------------------------------------

export const container = createContainer({ name: 'vielzeug-motors' });

container.value(LoggerToken, logger);
container.value(ApiToken, courier);
container.factory(ReportServiceToken, async (r) => {
  const api = await r.resolve(ApiToken);
  const log = await r.resolve(LoggerToken);

  return createReportService(api, log);
});

let reportServicePromise: Promise<ReportService> | null = null;

/** Lazily resolves (and caches) the report service — avoids a top-level `await` at module scope. */
export function getReportService(): Promise<ReportService> {
  reportServicePromise ??= container.resolve(ReportServiceToken);

  return reportServicePromise;
}
