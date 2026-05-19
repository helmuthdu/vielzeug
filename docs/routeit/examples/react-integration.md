---
title: 'Routeit Examples — React Integration'
description: useSyncExternalStore integration with routeit, plus minimal RouterView/RouterLink primitives.
---

## React Integration

Export a single `useRouter()` hook from `router.ts`. It returns reactive route state and bound router actions, so components import one symbol and call one hook.

```ts
// router.ts
import { createRouter } from '@vielzeug/routeit';
import { useSyncExternalStore } from 'react';

const router = createRouter({
  routes: {
    home: { component: HomePage, path: '/' },
    settings: { component: SettingsPage, path: '/settings' },
    notFound: { component: NotFoundPage, path: '*' },
  },
});

const { getSnapshot, subscribe } = router.toStore();

// Stable bound references, safe to return from the hook.
const isActive = router.isActive.bind(router);
const navigate = router.navigate.bind(router);
const url = router.url.bind(router);

export function useRouter() {
  const state = useSyncExternalStore(subscribe, getSnapshot);

  return { isActive, navigate, state, url };
}
```

```tsx
// RouterView.tsx
import { useRouter } from './router';

type RouteComponent = React.ComponentType | undefined;

export function RouterView() {
  const { state } = useRouter();
  const Component = state.matches.at(-1)?.component as RouteComponent;

  return Component ? <Component /> : null;
}
```

```tsx
// RouterLink.tsx
import { useRouter } from './router';

type LinkName = 'home' | 'settings' | 'notFound';

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
      }}
    >
      {children}
    </a>
  );
}
```

This mirrors React Router's hook-first mental model without needing an adapter package.
