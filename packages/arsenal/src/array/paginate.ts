/**
 * A page of items plus the arithmetic that produced it, in the caller's own page base.
 * Deliberately server-neutral: it models no HTTP dialect (Spring, JSON:API, RFC 9457);
 * adapters map their response onto this shape and map this shape back out.
 */
export type PageEnvelope<T> = Readonly<{
  /** The page's items; empty when `page` is past the last page. */
  items: readonly T[];
  /** The requested page, echoed in the caller's base. */
  page: number;
  /** Items per page. */
  pageSize: number;
  /** Size of the full list the page was cut from. */
  totalItems: number;
  /** At least 1, even for an empty list, so `page < totalPages` never underflows. */
  totalPages: number;
}>;

export type PaginateOptions = Readonly<{
  /** Page to cut, in the caller's base. Defaults to the first page of that base. */
  page?: number;
  /** Items per page. Default 20. */
  pageSize?: number;
  /** Base of `page`: 0 for zero-based servers (Spring), 1 for one-based (default). */
  pageOffset?: 0 | 1;
}>;

/**
 * Cuts one page out of an in-memory list.
 *
 * @example
 * ```ts
 * paginate([1, 2, 3, 4, 5], { page: 2, pageSize: 2 });
 * // { items: [3, 4], page: 2, pageSize: 2, totalItems: 5, totalPages: 3 }
 *
 * paginate(items, { page: springPage, pageOffset: 0 }); // zero-based caller
 * ```
 *
 * @param items - The full list to page over.
 * @param options - Page number (in `pageOffset`'s base), page size, and base.
 * @returns The page envelope. Pages past the last yield empty `items`; the request is echoed, not clamped.
 *
 * @throws {TypeError} If the first argument is not an array.
 * @throws {RangeError} If `page` is not an integer in the base, or `pageSize` is not a positive integer.
 */
export function paginate<T>(items: readonly T[], options: PaginateOptions = {}): PageEnvelope<T> {
  if (!Array.isArray(items)) throw new TypeError('paginate: first argument must be an array');

  const { pageOffset = 1, pageSize = 20 } = options;
  const page = options.page ?? pageOffset;

  if (!Number.isInteger(pageSize) || pageSize < 1)
    throw new RangeError('paginate: pageSize must be a positive integer');
  if (!Number.isInteger(page) || page < pageOffset)
    throw new RangeError(`paginate: page must be an integer >= ${pageOffset}`);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const start = (page - pageOffset) * pageSize;

  return {
    items: items.slice(start, start + pageSize),
    page,
    pageSize,
    totalItems: items.length,
    totalPages,
  };
}
