import { css } from '@vielzeug/ore';

/**
 * Table Base Mixin
 *
 * Shared structural foundation for table-like components (`ore-table`, `ore-datagrid`).
 * Covers only the `:host` shell, `.scroll-container`, and the bare `table` element.
 * Each consumer component owns all cell, row, head, and footer styles itself.
 *
 * Token naming:
 *  - `--_accent`   Primary interactive accent (sort icons, selection borders, focus rings).
 *                  Defaults to `--color-primary-focus`. Override via `--{prefix}-accent`.
 *
 * @param prefix  CSS custom-property namespace, e.g. `'table'` or `'datagrid'`
 *
 * @example
 * ```ts
 * // ore-table
 * styles: [tableBaseMixin('table'), componentStyles]
 *
 * // ore-datagrid
 * styles: [tableBaseMixin('datagrid'), componentStyles]
 * ```
 */
export const tableBaseMixin = (prefix: string) => css`
  @layer refine.base {
    :host {
      /* ── Public token API ─────────────────────────────────────────────── */
      --_bg: var(--${prefix}-bg, var(--color-canvas));
      --_border-color: var(--${prefix}-border-color, var(--color-contrast-200));
      --_radius: var(--${prefix}-radius, var(--rounded-xl));
      --_header-bg: var(--${prefix}-header-bg, var(--color-contrast-50));
      --_accent: var(--${prefix}-accent, var(--color-neutral-focus));
      --_row-hover-bg: var(--${prefix}-row-hover-bg, color-mix(in oklch, var(--_accent) 6%, transparent));
      --_stripe-bg: var(--${prefix}-stripe-bg, color-mix(in oklch, var(--color-contrast-900) 3%, transparent));
      --_cell-padding-x: var(--${prefix}-cell-padding-x, var(--size-3));
      --_cell-padding-y: var(--${prefix}-cell-padding-y, var(--size-2-5));
      --_font-size: var(--${prefix}-font-size, var(--text-sm));

      display: block;
      overflow: hidden;
      background: var(--_bg);
      border: var(--border) solid var(--_border-color);
      border-radius: var(--_radius);
      box-shadow: var(--${prefix}-shadow, var(--shadow-sm));
    }

    /* ── Scroll wrapper ─────────────────────────────────────────────────── */

    .scroll-container {
      overflow: auto;
      max-height: var(--${prefix}-max-height, none);
    }

    /* ── Native table ───────────────────────────────────────────────────── */

    table {
      width: 100%;
      font-size: var(--_font-size);
      table-layout: auto;
      border-collapse: collapse;
      background: var(--_bg);
    }

    /* ── Loading state ──────────────────────────────────────────────────── */

    :host([loading]) .scroll-container {
      opacity: 0.5;
      pointer-events: none;
      cursor: wait;
    }
  }

  @layer refine.variants {
    /* Bordered */
    :host([bordered]) {
      overflow: hidden;
      border: var(--border) solid var(--_border-color);
      border-radius: var(--_radius);
      box-shadow: var(--shadow-xs);
    }

    :host([bordered]) .scroll-container {
      border-radius: inherit;
      clip-path: inset(0 round var(--_radius));
    }

    /* Sticky header */
    :host([sticky]) .scroll-container {
      max-height: var(--${prefix}-sticky-max-height, 24rem);
      overflow-y: auto;
    }
  }

  @layer refine.density {
    :host([density='compact']) {
      --_cell-padding-x: var(--size-2);
      --_cell-padding-y: var(--size-1-5);
    }

    :host([density='cozy']) {
      --_cell-padding-x: var(--size-3);
      --_cell-padding-y: var(--size-2-5);
    }

    :host([density='comfortable']) {
      --_cell-padding-x: var(--size-4);
      --_cell-padding-y: var(--size-3-5);
    }
  }

  @layer refine.overrides {
    :host([fullwidth]) {
      width: 100%;
    }
  }
`;
