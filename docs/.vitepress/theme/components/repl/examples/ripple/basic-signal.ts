export const basicSignalExample = {
  code: "import { signal, effect, computed, batch } from '/ripple'\n\n// Create reactive signals\nconst count = signal(0)\nconst name = signal('World')\n\n// Computed derives from signals automatically\nconst greeting = computed(() => `Hello, ${name.value}! Count: ${count.value}`)\n\n// Effect re-runs when dependencies change\neffect(() => {\n  console.log('Greeting:', greeting.value)\n})\n\n// Updates trigger effects\ncount.value = 1\nname.value = 'Alice'\n\n// Batch multiple writes into one flush\nbatch(() => {\n  count.value = 10\n  name.value = 'Bob'\n})\n// Only one re-run after the batch",
  name: 'Signal, Computed & Effect',
};
