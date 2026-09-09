---
title: 'Wayfinder Examples — React Integration'
description: 'React integration example for @vielzeug/wayfinder.'
---

## React Integration

### Problem

Using `useState` + `useEffect` to bind external router state to React causes tearing: the render that reads state and the effect that subscribes to updates can be out of sync in concurrent mode.

### Solution

Use `useSyncExternalStore(subscribe, getSnapshot)` for tear-safe, concurrent-mode-compatible route state. Create the router and bind actions at module scope outside the hook.

```ts
// router.ts
import { createRouter } from '@vielzeug/wayfinder';
import { useSyncExternalStore } from 'react';

export const router = createRouter({
  routes: {
    home: { path: '/' },
    settings: { path: '/settings' },
  },
  notFound: { data: () => ({ message: 'Not found' }) },
});

// Stable router actions are safe to destructure and return from the hook.
const { getSnapshot, isActive, navigate, subscribe, url } = router;

export function useRouter() {
  const state = useSyncExternalStore(subscribe, getSnapshot);

  return { isActive, navigate, state, url };
}
```

```tsx
// RouterView.tsx — exhaustive routes and an explicit fallback
import { router, useRouter } from './router';

const views = router.createViewRegistry(
  { home: HomePage, settings: SettingsPage },
  { notFound: NotFoundPage },
);

export function RouterView() {
  const { state } = useRouter();
  const Component = views.resolve(state);

  return Component ? <Component /> : null;
}
```

```tsx
// RouterLink.tsx
import { useRouter } from './router';

type LinkName = 'home' | 'settings';

type Props = {
  children: React.ReactNode;
  name: LinkName;
};

export function RouterLink({ children, name }: Props) {
  const { isActive, navigate, url } = useRouter();

  const href = url(name);
  const active = isActive(name);

  return (
    <a
      aria-current={active ? 'page' : undefined}
      href={href}
      onClick={(event) => {
        event.preventDefault();
        void navigate({ name });
      }}>
      {children}
    </a>
  );
}
```

### Pitfalls

- Never use `useEffect` + `useState` for router state in concurrent mode — it causes tearing between reads and subscription updates.
- Do not create `getSnapshot`, `subscribe`, `navigate`, `url`, or `isActive` inside the hook. They must be stable references at module scope to avoid infinite re-renders.

### Related

- [Vue Integration](./vue-integration.md)
- [Svelte Integration](./svelte-integration.md)
