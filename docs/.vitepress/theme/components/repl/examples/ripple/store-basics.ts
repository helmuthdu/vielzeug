export const storeBasicsExample = {
  code: "import { store, computed } from '/ripple'\n\n// Create an object-state store\nconst user = store({ name: 'Alice', age: 30, email: 'alice@example.com' })\n\nconsole.log('Initial:', user.value)\n\n// Shallow-merge partial updates\nuser.patch({ age: 31 })\nconsole.log('After patch:', user.value)\n\n// Derive next state via updater\nuser.update((s) => ({ ...s, name: 'Alice Smith' }))\nconsole.log('After update:', user.value)\n\n// Derive a slice via computed()\nconst greeting = computed(() => `${user.value.name} (age ${user.value.age})`)\nconsole.log('Greeting:', greeting.value)\n\n// Reset to initial state\nuser.reset()\nconsole.log('After reset:', user.value)\n\ngreeting.dispose()",
  name: 'Store - Object State',
};
