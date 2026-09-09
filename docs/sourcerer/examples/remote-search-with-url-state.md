---
title: 'Sourcerer Examples — Page Params with URL State'
description: 'Validate URL values and load a page source with typed params.'
---

## Page Params with URL State

### Problem

You need bookmarkable search and page state without coupling Sourcerer to one router or URL codec.

### Solution

Validate URL values, set params, and navigate with direct page commands.

```ts
import { createPageSource } from '@vielzeug/sourcerer';

type Item = { id: number; name: string };
const items: Item[] = [{ id: 1, name: 'Ada' }, { id: 2, name: 'Grace' }];
const source = createPageSource({
  load: async ({ page, pageSize, params: search }) => {
    const matching = items.filter((item) => item.name.toLowerCase().includes(search.toLowerCase()));
    const start = (page - 1) * pageSize;
    return { items: matching.slice(start, start + pageSize), totalItems: matching.length };
  },
  params: '',
});

const url = new URL('https://example.test/users?page=1&search=ada');
const parsedPage = Number.parseInt(url.searchParams.get('page') ?? '1', 10);
const page = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
await source.setParams(url.searchParams.get('search') ?? '');
await source.goTo(page);

history.replaceState(null, '', `?page=${source.state.pagination.page}&search=${encodeURIComponent(source.state.params)}`);
source.dispose();
```

### Pitfalls

- Validate page numbers before calling `goTo()`.
- Serialize committed `state.params`, not `state.pendingParams`.
- Keep route decoding at the application boundary.

### Related

- [Usage Guide](../usage#pass-loader-parameters)
- [Wayfinder integration](./sourcerer-with-wayfinder)
- [Page source API](../api#createpagesource)
