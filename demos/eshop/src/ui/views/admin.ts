import '@vielzeug/refine/button';
import '@vielzeug/refine/input';
import '@vielzeug/refine/select';
import '@vielzeug/refine/badge';
import '@vielzeug/refine/icon';
import '@vielzeug/refine/checkbox';

import type { BarChartConfig, ChartHandle } from '@vielzeug/prism';

import { define, each, html, onCleanup, onMounted, ref, when } from '@vielzeug/ore';
import { createBarChart } from '@vielzeug/prism';
import { computed, effect, signal } from '@vielzeug/ripple';

import type { Order, OrderStatus } from '../../core/types';

import { canAccessAdmin } from '../../core/auth';
import { getReportService } from '../../core/container';
import { formatPrice } from '../../core/currency';
import { bus } from '../../core/events';
import { formatOrderStatus, formatShortDate } from '../../core/format';
import { t } from '../../core/i18n';
import { createOrdersSource } from '../../core/inventory-source';
import { attemptBulkUpdateOrderStatus, attemptUpdateOrderStatus } from '../../core/order-actions';
import { allOrdersSignal } from '../../core/orders';
import { router } from '../../core/router';
import { exportOrdersAsCsv } from '../../core/worker-tasks';

const STATUS_VALUES: OrderStatus[] = ['placed', 'processing', 'in-transit', 'delivered', 'cancelled'];

define('admin-view', {
  setup() {
    if (!canAccessAdmin()) {
      queueMicrotask(() => void router.navigate({ name: 'catalog' }));

      return html`
        <p>Access denied — redirecting…</p>
      `;
    }

    const chartRef = ref<HTMLElement>();
    const source = createOrdersSource(allOrdersSignal.value);
    const visibleOrders = signal<Order[]>(allOrdersSignal.value);
    const pageInfo = signal({ page: 1, pageCount: 1 });
    const statusOptions = computed(() =>
      STATUS_VALUES.map((status) => ({ label: formatOrderStatus(status), value: status })),
    );

    // Bulk selection — Admin's one data-heavy surface, so a shopper-facing single-row-at-a-time
    // status select isn't enough here; `selectedIds` drives both the per-row checkbox and the
    // bulk-apply bar below.
    const selectedIds = signal<Set<string>>(new Set());
    const bulkStatus = signal<OrderStatus>('processing');

    let chartHandle: ChartHandle | null = null;

    function syncSource(): void {
      visibleOrders.value = [...source.current];
      pageInfo.value = { page: source.meta.pageNumber, pageCount: source.meta.pageCount };
    }

    onMounted(() => {
      const chartContainer = chartRef.value!;

      const stop = effect(() => {
        void allOrdersSignal.value;

        void getReportService().then((service) => {
          const report = service.generateSalesReport(allOrdersSignal.value);

          const config: BarChartConfig = {
            ariaLabel: t('admin.revenue'),
            series: [{ color: 'var(--color-primary)', data: report.revenueByDay, name: 'Revenue' }],
            tooltip: true,
            xAxis: { grid: false, tickFormat: (v) => formatShortDate(new Date(v as number).toISOString()) },
            yAxis: { grid: true },
          };

          chartHandle?.dispose();
          chartHandle = createBarChart(chartContainer, config);
        });

        void source.setData(allOrdersSignal.value);
      });

      source.subscribe(syncSource);
      syncSource();

      onCleanup(() => {
        stop.dispose();
        chartHandle?.dispose();
        source.dispose();
      });
    });

    const onSearch = (e: Event): void => {
      void source.search((e as CustomEvent<{ value: string }>).detail.value);
    };

    const onStatusChange = (order: Order, e: Event): void => {
      const status = (e as CustomEvent<{ values: OrderStatus[] }>).detail.values[0];

      if (status) void attemptUpdateOrderStatus(order, status);
    };

    function toggleSelected(orderId: string): void {
      const next = new Set(selectedIds.value);

      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);

      selectedIds.value = next;
    }

    function toggleSelectAll(): void {
      selectedIds.value =
        selectedIds.value.size === visibleOrders.value.length
          ? new Set()
          : new Set(visibleOrders.value.map((o) => o.id));
    }

    async function onExportCsv(): Promise<void> {
      await exportOrdersAsCsv(allOrdersSignal.value);
      bus.emit('toast:show', { message: t('admin.exportSuccess'), variant: 'success' });
    }

    async function onApplyBulkStatus(): Promise<void> {
      const targets = visibleOrders.value.filter((o) => selectedIds.value.has(o.id));
      const updated = await attemptBulkUpdateOrderStatus(targets, bulkStatus.value);

      if (updated > 0) selectedIds.value = new Set();
    }

    return html`
      <h1>${() => t('admin.title')}</h1>
      <section class="admin__chart-section">
        <h2>${() => t('admin.revenue')}</h2>
        <div class="admin__chart" ref=${chartRef}></div>
      </section>
      <section class="admin__toolbar">
        <ore-input
          placeholder=${() => t('admin.searchPlaceholder')}
          type="search"
          clearable
          @input=${onSearch}></ore-input>
        <ore-checkbox
          :checked=${() => visibleOrders.value.length > 0 && selectedIds.value.size === visibleOrders.value.length}
          @change=${toggleSelectAll}>
          ${() => t('admin.selectAll')}
        </ore-checkbox>
        <ore-button rounded variant="bordered" @click=${() => void onExportCsv()}>
          ${() => t('admin.exportCsv')}
        </ore-button>
      </section>
      ${when(
        () => selectedIds.value.size > 0,
        () => html`
          <section class="admin__bulk-bar">
            <ore-select
              size="sm"
              :label=${() => t('admin.bulkStatusLabel')}
              :options=${statusOptions}
              :value=${() => bulkStatus.value}
              @change=${(e: Event) => {
                const status = (e as CustomEvent<{ values: OrderStatus[] }>).detail.values[0];

                if (status) bulkStatus.value = status;
              }}></ore-select>
            <ore-button rounded size="sm" variant="solid" color="primary" @click=${() => void onApplyBulkStatus()}>
              ${() => t('admin.bulkApply', { count: selectedIds.value.size })}
            </ore-button>
          </section>
        `,
      )}
      <div class="admin__orders">
        ${each(
          visibleOrders,
          (o) => o.id,
          (o) => html`
            <div class="order-card">
              <div class="order-card__header">
                <div class="order-card__header-left">
                  <ore-checkbox
                    :checked=${() => selectedIds.value.has(o.value.id)}
                    @change=${() => toggleSelected(o.value.id)}></ore-checkbox>
                  <span class="order-card__id">${() => o.value.id}</span>
                </div>
                <span>${() => formatPrice(o.value.totalAmount)}</span>
              </div>
              <p class="order-card__meta">${() => `${o.value.userId} — ${formatShortDate(o.value.placedAt)}`}</p>
              <ore-select
                size="sm"
                :options=${statusOptions}
                :value=${() => o.value.status}
                @change=${(e: Event) => onStatusChange(o.value, e)}></ore-select>
            </div>
          `,
        )}
      </div>
      ${when(
        () => pageInfo.value.pageCount > 1,
        () => html`
          <div class="admin__pagination">
            <ore-button rounded size="sm" variant="bordered" @click=${() => void source.prev()}>← Prev</ore-button>
            <span>${() => `Page ${pageInfo.value.page} / ${pageInfo.value.pageCount}`}</span>
            <ore-button rounded size="sm" variant="bordered" @click=${() => void source.next()}>Next →</ore-button>
          </div>
        `,
      )}
    `;
  },
  shadow: false,
});

export function createAdminView(): HTMLElement {
  const el = document.createElement('admin-view');

  el.className = 'admin-view';

  return el;
}
