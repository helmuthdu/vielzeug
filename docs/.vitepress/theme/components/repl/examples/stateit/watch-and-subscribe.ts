export const watchAndSubscribeExample = {
  code: "import { signal, store, watch } from '@vielzeug/stateit'\n\nconst counter = signal(0)\n\n// watch: fires whenever the signal changes\nconst sub = watch(counter, (next, prev) => {\n  console.log(`Count: ${prev} → ${next}`)\n})\n\ncounter.value = 1\ncounter.value = 2\ncounter.value = 3\n\nsub.dispose()\ncounter.value = 4 // No log — disposed\n\n// Store subscriptions\nconst cart = store({ items: 0, total: 0 })\nconst itemsSignal = cart.select((s) => s.items)\n\nwatch(itemsSignal, (n) => console.log('Items changed:', n))\n\ncart.patch({ items: 2, total: 29.98 })\ncart.patch({ items: 3 })",
  name: 'Watch & Subscribe',
};
