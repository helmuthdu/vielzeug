import { devOnly, warn } from '../../_dev';
import type { ChartEventHandlers, RadialScaffoldContext } from '../../core/chart-scaffold';
import { createRadialScaffold } from '../../core/chart-scaffold';
import { chartArea, resolveMargin } from '../../core/layout';
import { comparisonContent } from '../../interaction/tooltip';
import { createSvgElement, removeChildren, setAttributes } from '../../svg/element';
import { estimateTextWidth } from '../../svg/text';
import type { ChartHandle, HeatmapCell, HeatmapChartConfig, HeatmapData, HeatmapEvent } from '../../types';
import { createRamp, valueColorFor } from './heatmap-color';

const ARROW_STEPS: Record<string, number> = { ArrowDown: 1, ArrowLeft: -1, ArrowRight: 1, ArrowUp: -1 };
const DEFAULT_COLOR_RANGE = ['#e0f2fe', '#7dd3fc', '#0ea5e9', '#0369a1', '#082f49'];
const EMPTY_FALLBACK = 'var(--prism-grid-color, #e2e8f0)';
const LABEL_FONT_SIZE = 11;
const LABEL_PAD = 8;
const MAX_LABEL_GUTTER_RATIO = 0.4;
const MAX_HEADER_BAND = 96;
const ROTATED_LABEL_SLOPE = 0.71;

interface CellGeometry {
  column: string;
  columnWidth: number;
  fill: string;
  row: string;
  rowHeight: number;
  x: number;
  y: number;
}

interface HeatmapLayout {
  cells: CellGeometry[];
  columnCount: number;
  colWidth: number;
  gridX: number;
  gridY: number;
  rowCount: number;
  rowHeight: number;
}

function warnOnInvalid(rows: readonly string[], columns: readonly string[], cells: readonly HeatmapCell[]): void {
  devOnly(() => {
    const rowSet = new Set(rows);
    const columnSet = new Set(columns);

    for (const cell of cells) {
      if (!rowSet.has(cell.row)) warn(`Heatmap cell for column "${cell.column}" has unknown row "${cell.row}".`);
      if (!columnSet.has(cell.column)) {
        warn(`Heatmap cell for row "${cell.row}" has unknown column "${cell.column}".`);
      }
    }
  });
}

/**
 * A matrix heatmap: rows down the left, columns across the top, one colored cell per
 * row/column pair. The ramp is continuous by default; `bins` turns it into discrete
 * steps with a swatch legend. Cells show their formatted value when they are large
 * enough, choosing dark or light text against the fill.
 *
 * Keyboard: arrows move the active cell, Enter/Space fires `onCellClick`, Escape
 * deactivates. The tooltip (or the live region without one) describes the active cell.
 */
export function createHeatmapChart(container: HTMLElement, config: HeatmapChartConfig): ChartHandle<HeatmapData> {
  let rows = config.rows;
  let columns = config.columns;
  let cells = config.cells;
  let domain = config.domain;
  let rowSummary = config.rowSummary;

  warnOnInvalid(rows, columns, cells);

  const margin = resolveMargin({ bottom: 8, left: 8, right: 8, top: 8, ...config.margin });
  const gap = Math.max(0, config.gap ?? 2);
  const showValues = config.showValues ?? true;
  const formatValue = config.valueFormat ?? String;
  const ramp = createRamp(config.colorRange ?? DEFAULT_COLOR_RANGE);
  const emptyColor = config.emptyColor ?? EMPTY_FALLBACK;
  const binBounds = buildBinBounds(config.bins);
  const binCount = binBounds.length;

  const cellsByKey = new Map<string, HeatmapCell>();
  const cellKey = (row: string, column: string): string => `${row}\u0000${column}`;

  let layout: HeatmapLayout | null = null;
  let activeIndex = -1;
  let highlight: SVGRectElement | null = null;
  // Set by render(): the ramp position for a value depends on the current domain/bins.
  let positionOf: (value: number) => number = () => 0.5;

  const root = createSvgElement('g');

  const add = <K extends keyof SVGElementTagNameMap>(
    tag: K,
    parent: SVGElement,
    attrs?: Record<string, number | string | undefined>,
  ): SVGElementTagNameMap[K] => {
    const el = createSvgElement(tag, attrs);

    parent.appendChild(el);

    return el;
  };

  function currentDomain(): [number, number] {
    if (domain) return domain;

    const values = cells.filter((cell) => cell.value !== null).map((cell) => cell.value as number);

    if (values.length === 0) return [0, 1];

    return [Math.min(...values), Math.max(...values)];
  }

  function computePositionOf(): (value: number) => number {
    if (binCount === 0) {
      const [d0, d1] = currentDomain();

      return (value) => (d1 === d0 ? 1 : Math.min(1, Math.max(0, (value - d0) / (d1 - d0))));
    }

    return (value) => {
      let bin = binCount - 1;

      for (let i = 0; i < binCount; i += 1) {
        const upper = binBounds[i]![1];

        if (upper !== null && value < upper) {
          bin = i;
          break;
        }
      }

      return binCount === 1 ? 0.5 : bin / (binCount - 1);
    };
  }

  function render(ctx: RadialScaffoldContext): void {
    const { legend, svg } = ctx;

    if (!svg.contains(root)) svg.appendChild(root);
    removeChildren(root);
    highlight = null;
    activeIndex = -1;
    layout = null;

    cellsByKey.clear();
    for (const cell of cells) cellsByKey.set(cellKey(cell.row, cell.column), cell);

    positionOf = computePositionOf();

    if (binCount > 0 && legend) {
      const items = binBounds.map((bounds, i) => ({
        color: ramp(binCount === 1 ? 0.5 : i / (binCount - 1)),
        name: (config.binLabel ?? defaultBinLabel(formatValue))(bounds[0], bounds[1]),
      }));

      if (config.emptyLabel) items.push({ color: emptyColor, name: config.emptyLabel });
      legend.update(items);
    }

    if (rows.length === 0 || columns.length === 0) {
      legend?.update([]);

      return;
    }

    const area = chartArea(ctx.dimensions.width, ctx.dimensions.height, margin);
    const summary = rowSummary && rowSummary.values.length > 0 ? rowSummary : null;
    const leftGutter = Math.min(
      Math.max(...rows.map((row) => estimateTextWidth(row, LABEL_FONT_SIZE))) + LABEL_PAD * 2,
      area.width * MAX_LABEL_GUTTER_RATIO,
    );
    let rightGutter = 0;

    if (summary) {
      const summaryTexts = summary.values.filter((value): value is string => value !== null);
      const widest = Math.max(
        estimateTextWidth(summary.header ?? '', LABEL_FONT_SIZE),
        ...summaryTexts.map((value) => estimateTextWidth(value, LABEL_FONT_SIZE)),
      );

      rightGutter = Math.min(widest + LABEL_PAD * 2, area.width * MAX_LABEL_GUTTER_RATIO);
    }

    const maxColumnLabelWidth = Math.max(...columns.map((column) => estimateTextWidth(column, LABEL_FONT_SIZE)));
    const rotate = maxColumnLabelWidth > area.width / columns.length - LABEL_PAD;
    const headerBand = rotate
      ? Math.min(maxColumnLabelWidth * ROTATED_LABEL_SLOPE + LABEL_PAD, MAX_HEADER_BAND)
      : LABEL_FONT_SIZE + LABEL_PAD;

    const gridX = margin.left + leftGutter;
    const gridY = margin.top + headerBand;
    const colWidth = Math.max(0, area.width - leftGutter - rightGutter) / columns.length;
    const rowHeight = Math.max(0, area.height - headerBand) / rows.length;

    const geometries: CellGeometry[] = [];

    for (let r = 0; r < rows.length; r += 1) {
      for (let c = 0; c < columns.length; c += 1) {
        const row = rows[r]!;
        const column = columns[c]!;
        const value = cellsByKey.get(cellKey(row, column))?.value ?? null;

        geometries.push({
          column,
          columnWidth: colWidth,
          fill: value === null ? emptyColor : ramp(positionOf(value)),
          row,
          rowHeight,
          x: gridX + c * colWidth,
          y: gridY + r * rowHeight,
        });
      }
    }

    layout = {
      cells: geometries,
      columnCount: columns.length,
      colWidth,
      gridX,
      gridY,
      rowCount: rows.length,
      rowHeight,
    };

    // Column headers: horizontal when they fit their column, rotated -45° otherwise.
    for (let c = 0; c < columns.length; c += 1) {
      const cx = gridX + c * colWidth + colWidth / 2;
      const label = add('text', root, {
        'aria-hidden': 'true',
        class: 'prism-heatmap-column-label',
        x: String(cx),
        y: String(margin.top + headerBand - 4),
      });

      label.textContent = columns[c];

      if (rotate) {
        setAttributes(label, { 'text-anchor': 'start', transform: `rotate(-45 ${cx} ${margin.top + headerBand - 4})` });
      } else {
        setAttributes(label, { 'text-anchor': 'middle' });
      }
    }

    // Row labels in the left gutter.
    for (let r = 0; r < rows.length; r += 1) {
      const label = add('text', root, {
        'aria-hidden': 'true',
        class: 'prism-heatmap-row-label',
        'dominant-baseline': 'central',
        'text-anchor': 'end',
        x: String(gridX - LABEL_PAD),
        y: String(gridY + r * rowHeight + rowHeight / 2),
      });

      label.textContent = rows[r];
    }

    // Row summary in the right gutter: header in the column-header band, one value per row.
    if (summary) {
      const summaryX = margin.left + area.width - rightGutter / 2;

      if (summary.header) {
        const header = add('text', root, {
          'aria-hidden': 'true',
          class: 'prism-heatmap-summary-header',
          'text-anchor': 'middle',
          x: String(summaryX),
          y: String(margin.top + headerBand - 4),
        });

        header.textContent = summary.header;
      }

      for (let r = 0; r < rows.length; r += 1) {
        const label = add('text', root, {
          'aria-hidden': 'true',
          class: 'prism-heatmap-summary',
          'dominant-baseline': 'central',
          'text-anchor': 'middle',
          x: String(summaryX),
          y: String(gridY + r * rowHeight + rowHeight / 2),
        });

        label.textContent = summary.values[r] ?? '\u2014';
      }
    }

    // Cells, with their in-cell value when it fits.
    for (const geometry of geometries) {
      const value = cellsByKey.get(cellKey(geometry.row, geometry.column))?.value ?? null;
      const group = add('g', root, { 'aria-hidden': 'true', class: 'prism-heatmap-cell' });
      const rect = add('rect', group, {
        class: 'prism-heatmap-cell-rect',
        height: String(Math.max(0, geometry.rowHeight - gap)),
        rx: '2',
        width: String(Math.max(0, geometry.columnWidth - gap)),
        x: String(geometry.x + gap / 2),
        y: String(geometry.y + gap / 2),
      });

      rect.style.setProperty('fill', geometry.fill);

      if (showValues && value !== null && colWidth > 28 && rowHeight > 16) {
        const text = add('text', group, {
          class: 'prism-heatmap-value',
          'dominant-baseline': 'central',
          'text-anchor': 'middle',
          x: String(geometry.x + colWidth / 2),
          y: String(geometry.y + rowHeight / 2),
        });

        text.textContent = formatValue(value);
        text.style.setProperty('fill', valueColorFor(geometry.fill, 'var(--prism-text-color, #0f172a)'));
      }
    }

    highlight = add('rect', root, {
      class: 'prism-heatmap-highlight',
      height: '0',
      rx: '2',
      visibility: 'hidden',
      width: '0',
      x: '0',
      y: '0',
    });
  }

  function eventFor(geometry: CellGeometry, originalEvent: Event): HeatmapEvent {
    return {
      cell: cellsByKey.get(cellKey(geometry.row, geometry.column)),
      column: geometry.column,
      originalEvent,
      row: geometry.row,
    };
  }

  function indexAt(svg: SVGSVGElement, event: MouseEvent): number {
    if (!layout) return -1;

    const rect = svg.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const col = Math.floor((x - layout.gridX) / layout.colWidth);
    const row = Math.floor((y - layout.gridY) / layout.rowHeight);

    if (col < 0 || row < 0 || col >= layout.columnCount || row >= layout.rowCount) return -1;

    return row * layout.columnCount + col;
  }

  function describe(index: number): string {
    const geometry = layout!.cells[index]!;
    const value = cellsByKey.get(cellKey(geometry.row, geometry.column))?.value ?? null;

    return `${geometry.row} \u00b7 ${geometry.column}: ${value === null ? '\u2014' : formatValue(value)}`;
  }

  function activate(ctx: RadialScaffoldContext, index: number, originalEvent: Event): void {
    if (!layout || !highlight) return;

    const geometry = layout.cells[index];

    if (!geometry) return;

    activeIndex = index;
    const value = cellsByKey.get(cellKey(geometry.row, geometry.column))?.value ?? null;

    setAttributes(highlight, {
      height: String(Math.max(0, geometry.rowHeight - gap)),
      visibility: 'visible',
      width: String(Math.max(0, geometry.columnWidth - gap)),
      x: String(geometry.x + gap / 2),
      y: String(geometry.y + gap / 2),
    });

    config.onCellHover?.(eventFor(geometry, originalEvent));

    const text = describe(index);

    if (!ctx.tooltip) {
      ctx.announcer.announce(text);

      return;
    }

    const svgRect = ctx.svg.getBoundingClientRect();
    const containerRect = ctx.container.getBoundingClientRect();

    ctx.tooltip.show(
      geometry.x + geometry.columnWidth / 2 + (svgRect.left - containerRect.left),
      geometry.y + (svgRect.top - containerRect.top),
      { key: cellKey(geometry.row, geometry.column), meta: { text }, value: value ?? 0 },
      { color: geometry.fill, data: [], name: `${geometry.row} \u00b7 ${geometry.column}` },
      comparisonContent(
        ctx.svg.ownerDocument,
        `${geometry.row} \u00b7 ${geometry.column}`,
        [{ color: geometry.fill, name: geometry.column, value: value === null ? '\u2014' : formatValue(value) }],
        text,
      ),
    );
  }

  function deactivate(ctx: RadialScaffoldContext): void {
    if (activeIndex === -1) return;

    activeIndex = -1;
    highlight?.setAttribute('visibility', 'hidden');
    config.onCellHover?.(null);
    ctx.tooltip?.hide();
    ctx.announcer.clear();
  }

  return createRadialScaffold<HeatmapData>(
    container,
    {
      a11y: config.a11y,
      legend: binCount > 0 && config.legend !== false ? {} : false,
      margin: config.margin,
      tooltip: config.tooltip,
    },
    (ctx): ChartEventHandlers | undefined => {
      render(ctx);

      if (!layout) return undefined;

      return {
        onClick(event) {
          const index = indexAt(ctx.svg, event);

          if (index >= 0) config.onCellClick?.(eventFor(layout!.cells[index]!, event));
        },
        onKeyDown(event) {
          const step = ARROW_STEPS[event.key];

          if (step !== undefined) {
            event.preventDefault();

            if (activeIndex < 0) {
              activate(ctx, 0, event);

              return;
            }

            const colCount = layout!.columnCount;
            const row = Math.floor(activeIndex / colCount);
            const col = activeIndex % colCount;

            if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
              const nextRow = row + step;

              if (nextRow >= 0 && nextRow < layout!.rowCount) {
                activate(ctx, nextRow * colCount + col, event);
              }
            } else {
              const nextCol = col + step;

              if (nextCol >= 0 && nextCol < layout!.columnCount) {
                activate(ctx, row * colCount + nextCol, event);
              }
            }
          } else if ((event.key === 'Enter' || event.key === ' ') && activeIndex >= 0) {
            event.preventDefault();
            config.onCellClick?.(eventFor(layout!.cells[activeIndex]!, event));
          } else if (event.key === 'Escape') {
            deactivate(ctx);
          }
        },
        onMouseLeave: () => deactivate(ctx),
        onMouseMove(event) {
          const index = indexAt(ctx.svg, event);

          if (index < 0) {
            if (activeIndex >= 0) deactivate(ctx);
          } else if (index !== activeIndex) {
            activate(ctx, index, event);
          }
        },
      };
    },
    (next) => {
      if (next.rows) rows = next.rows;
      if (next.columns) columns = next.columns;
      cells = next.cells;
      if (next.domain) domain = next.domain;
      // Key present (even as `undefined`) replaces the summary; absent keeps it (partial updates).
      if ('rowSummary' in next) rowSummary = next.rowSummary;
      warnOnInvalid(rows, columns, cells);
    },
  );
}

// ─── Bins ─────────────────────────────────────────────────────────────────────

function buildBinBounds(bins: number[] | undefined): Array<[number | null, number | null]> {
  if (!bins || bins.length === 0) return [];

  const thresholds = [...bins].sort((a, b) => a - b);
  const bounds: Array<[number | null, number | null]> = [];
  let lower: number | null = null;

  for (const threshold of thresholds) {
    bounds.push([lower, threshold]);
    lower = threshold;
  }

  bounds.push([lower, null]);

  return bounds;
}

function defaultBinLabel(formatValue: (value: number) => string): (from: number | null, to: number | null) => string {
  return (from, to) => {
    if (from === null && to !== null) return `<${formatValue(to)}`;
    if (from !== null && to === null) return `\u2265${formatValue(from)}`;
    if (from !== null && to !== null) return `${formatValue(from)}\u2013${formatValue(to)}`;

    return '\u2014';
  };
}
