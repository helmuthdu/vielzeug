import { currency, format as formatMoney, money } from '@vielzeug/coins';
import { classifyExpiry, format as formatDate, parse } from '@vielzeug/tempo';

import type { Task } from './types';

/** Renders a task's budget as a locale-aware currency string, e.g. `$1,200`. */
export function formatBudget(budget: Task['budget']): string | null {
  if (!budget) return null;

  return formatMoney(money(budget.amount, currency(budget.currency)), {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  });
}

/** Renders an ISO (`yyyy-MM-dd`) due date as e.g. `Jul 20`. */
export function formatDueDate(dueDate: string): string {
  return formatDate(parse(dueDate, { as: 'plainDate' }), {
    intl: { day: 'numeric', month: 'short' },
    timeZone: 'UTC',
  });
}

export type DueDateUrgency = 'overdue' | 'soon' | null;

/**
 * Classifies a due date relative to now — drives the task card's due-date color.
 * `done` tasks never read as overdue; a shipped task's original deadline is history, not risk.
 */
export function dueDateUrgency(dueDate: string | null, status: Task['status']): DueDateUrgency {
  if (!dueDate || status === 'done') return null;

  // Thresholds are cumulative upper bounds on (date − now), sorted ascending: anything at or
  // before now is 'overdue'; anything within the next 3 days is 'soon'; further out is null.
  return classifyExpiry({
    thresholds: { overdue: { days: 0 }, soon: { days: 3 } },
    timeZone: 'UTC',
    value: parse(dueDate, { as: 'plainDate' }),
  });
}
