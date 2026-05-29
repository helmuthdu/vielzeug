---
title: Paginated Data Loading with Search
description: Use Sourcerer with Machine to manage async data loading, pagination, and search state.
---

## Problem

Paginated data interfaces need to coordinate:
- Loading state (idle, loading, success, error)
- Current page and page size
- Search filters and sort order
- Retry logic on failures
- Cancelling in-flight requests

Managing all these states together leads to spaghetti code with race conditions between pagination, filtering, and loading.

## Solution

Use Machine for overall state machine (idle → loading → success/error), and Sourcerer for data source management with pagination and filtering. The machine orchestrates the state, while sourcerer handles fetching and caching.

```ts
import { defineMachine, interpret, assign } from '@vielzeug/machine';
import { createSource } from '@vielzeug/sourcerer';
import { signal, readonly } from '@vielzeug/ripple';

type DataEvent =
  | { type: 'FETCH' }
  | { type: 'SET_PAGE'; page: number }
  | { type: 'SET_SEARCH'; query: string }
  | { type: 'SET_SORT'; field: string; order: 'asc' | 'desc' }
  | { type: 'RETRY' }
  | { type: 'DONE'; items: unknown[]; total: number }
  | { type: 'FAILED'; error: Error };

const dataMachine = defineMachine({
  initial: 'idle',
  context: {
    page: 1,
    pageSize: 20,
    search: '',
    sortField: 'createdAt',
    sortOrder: 'desc' as const,
    items: [] as unknown[],
    total: 0,
    error: null as Error | null,
    attempts: 0,
  },
  states: {
    idle: {
      on: {
        FETCH: [{ target: 'loading', actions: [incrementAttempts] }],
        SET_PAGE: [{ actions: [updatePage] }],
        SET_SEARCH: [{ actions: [updateSearch], target: 'idle' }],
        SET_SORT: [{ actions: [updateSort], target: 'idle' }],
      },
    },
    loading: {
      entry: [fetchData],
      on: {
        DONE: [
          {
            target: 'success',
            actions: [recordData, resetAttempts],
          },
        ],
        FAILED: [
          {
            target: 'error',
            guard: ({ context }) => context.attempts < 3,
            actions: [recordError],
          },
          {
            target: 'failed',
            actions: [recordError],
          },
        ],
        SET_PAGE: [{ actions: [updatePage], target: 'loading' }],
        SET_SEARCH: [{ actions: [updateSearch], target: 'loading' }],
      },
    },
    success: {
      on: {
        FETCH: [{ target: 'loading', actions: [incrementAttempts] }],
        SET_PAGE: [{ actions: [updatePage], target: 'loading' }],
        SET_SEARCH: [{ actions: [updateSearch], target: 'loading' }],
        SET_SORT: [{ actions: [updateSort], target: 'loading' }],
      },
    },
    error: {
      on: {
        RETRY: [{ target: 'loading', actions: [incrementAttempts] }],
        FETCH: [{ target: 'loading', actions: [incrementAttempts] }],
        SET_SEARCH: [{ actions: [updateSearch], target: 'loading' }],
      },
    },
    failed: {
      on: {
        SET_SEARCH: [{ actions: [updateSearch], target: 'idle' }],
      },
    },
  },
});

const incrementAttempts = assign(({ context }) => ({
  attempts: context.attempts + 1,
}));

const resetAttempts = assign(() => ({
  attempts: 0,
}));

const updatePage = assign(({ context, event }) => ({
  page: (event as any).page,
}));

const updateSearch = assign(({ context, event }) => ({
  search: (event as any).query,
  page: 1, // Reset to first page on search
}));

const updateSort = assign(({ context, event }) => ({
  sortField: (event as any).field,
  sortOrder: (event as any).order,
  page: 1,
}));

const recordData = assign(({ event }) => ({
  items: (event as any).items,
  total: (event as any).total,
  error: null,
}));

const recordError = assign(({ event }) => ({
  error: (event as any).error,
}));

// Setup data source
const userSource = createSource({
  async query(params) {
    const res = await fetch(
      `/api/users?page=${params.page}&size=${params.pageSize}&q=${params.search}&sort=${params.sortField}:${params.sortOrder}`
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },
});

// Initialize machine
const machine = interpret(dataMachine, {
  context: {
    page: 1,
    pageSize: 20,
    search: '',
    sortField: 'createdAt',
    sortOrder: 'desc',
    items: [],
    total: 0,
    error: null,
    attempts: 0,
  },
});

// Sync machine context to data source
async function fetchData() {
  const ctx = machine.context.value;
  try {
    const result = await userSource.query({
      page: ctx.page,
      pageSize: ctx.pageSize,
      search: ctx.search,
      sortField: ctx.sortField,
      sortOrder: ctx.sortOrder,
    });
    machine.send({ type: 'DONE', items: result.items, total: result.total });
  } catch (err) {
    machine.send({ type: 'FAILED', error: err as Error });
  }
}

// Reactive state for UI bindings
export const isLoading = machine.state.pipe(s => s === 'loading');
export const hasError = machine.state.pipe(s => s === 'error' || s === 'failed');
export const errorMessage = machine.context.pipe(c => c.error?.message || '');
export const items = machine.context.pipe(c => c.items);
export const currentPage = machine.context.pipe(c => c.page);
export const pageCount = machine.context.pipe(c => Math.ceil(c.total / c.pageSize));
export const searchQuery = machine.context.pipe(c => c.search);

// API for UI components
export function loadData() {
  machine.send({ type: 'FETCH' });
}

export function goToPage(page: number) {
  machine.send({ type: 'SET_PAGE', page });
}

export function search(query: string) {
  machine.send({ type: 'SET_SEARCH', query });
}

export function sort(field: string, order: 'asc' | 'desc') {
  machine.send({ type: 'SET_SORT', field, order });
}

export function retry() {
  machine.send({ type: 'RETRY' });
}
```

## Pitfalls

1. **Multiple fetches in flight** - If user changes page before previous fetch completes, both requests resolve and may update data out of order. Use AbortController to cancel pending requests on new fetch, or use invoke with cancellation.

2. **Search/filter changes lose pagination** - When user searches, page should reset to 1, but machine stays on page 5. Always reset page: 1 in updateSearch and updateSort actions.

3. **Cache not invalidated on filter change** - Sourcerer caches results per query. If search query changes but params look identical, stale data may be returned. Clear cache when filters change: `source.invalidate()`.

4. **Error state blocks retry indefinitely** - If error state is reached after 3 attempts, RETRY transitions don't work. Provide RETRY transitions from error state, or use a different final state for permanent failures.

5. **Total count doesn't update with search** - Machine records total items but doesn't recalculate pageCount after search narrows results. Ensure DONE event includes updated total from backend.

## Related

- [Sourcerer](../sourcerer/) - Reactive data sources with pagination
- [Courier](../courier/) - HTTP client with caching
- [Fetch with Retry](./fetch-retry.md) - Retry patterns
- [Toolkit](../toolkit/) - Array utilities for sorting and filtering
