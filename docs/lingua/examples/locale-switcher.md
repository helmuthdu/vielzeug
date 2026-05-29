---
title: 'Lingua Examples — Locale Switcher'
description: 'Switch locales with preload() and setLocale().'
---

## Locale Switcher

```ts
const stop = i18n.subscribe(
  ({ locale }) => {
    document.documentElement.lang = locale;
    render();
  },
  { immediate: true },
);

async function changeLocale(locale: string) {
  await i18n.preload(locale);
  await i18n.setLocale(locale);
}

for (const locale of i18n.getSupportedLocales()) {
  console.log(locale);
}

stop();
```

## Notes

- `preload()` is explicit warm-up.
- `setLocale()` performs the switch.
- `getSupportedLocales()` lists registered locale sources.
- `subscribe(callback, { immediate: true })` runs once immediately, then on future changes.
