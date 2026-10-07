import type { Series } from '../types';

/**
 * Stable `data-series-id` value for a series group: the sanitized explicit
 * `id`, else the positional `series-<index>` fallback. Characters outside
 * `[A-Za-z0-9_-]` become `-` so the value is always attribute-safe.
 */
export function seriesDomId(series: Pick<Series, 'id' | 'name'> | undefined, index: number): string {
  return series?.id ? series.id.replace(/[^A-Za-z0-9_-]/g, '-') : `series-${index}`;
}
