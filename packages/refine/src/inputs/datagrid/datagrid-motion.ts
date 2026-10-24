import { createLayoutMotion, type LayoutMotion } from '../../shared/layout-motion';

/**
 * FLIP row motion for ore-datagrid, delegated to the shared layout-motion
 * helper (which delegates the FLIP recipe to necromancer).
 *
 * Sorting, paging, and filtering reorder rows in place, and an instant swap
 * loses the reader's place. This module owns only the grid-specific parts:
 * which elements are rows and how a row keeps its identity across ore's
 * re-render (`data-row-key`, set in datagrid.ts). A small stagger makes a
 * long table read as a cascade rather than one rigid block.
 */

/** Rows move, they do not scale: a subtle overshoot reads as a slip. */
const ROW_MOVE_STAGGER = 12;

export type { LayoutMotion as RowMotion } from '../../shared/layout-motion';

/**
 * Builds the grid's row-motion helper.
 *
 * @param host - The grid host element (its shadow root holds the rows).
 * @param signal - Lifecycle signal: disposing it cancels in-flight animations.
 */
export function createRowMotion(host: HTMLElement, signal: AbortSignal): LayoutMotion {
  return createLayoutMotion(host, signal, {
    elements: () => [...(host.shadowRoot?.querySelectorAll<HTMLElement>('tr[part="row"]') ?? [])],
    getKey: (row) => row.dataset.rowKey || undefined,
    stagger: ROW_MOVE_STAGGER,
  });
}
