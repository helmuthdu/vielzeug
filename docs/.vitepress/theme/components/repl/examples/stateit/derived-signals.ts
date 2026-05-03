export const derivedSignalsExample = {
  code: "import { signal, derived, computed } from '@vielzeug/stateit'\n\nconst price = signal(100)\nconst quantity = signal(2)\nconst taxRate = signal(0.1)\n\n// derived() — combine multiple source signals\nconst subtotal = derived([price, quantity], (p, q) => p * q)\nconst tax = computed(() => subtotal.value * taxRate.value)\nconst total = computed(() => subtotal.value + tax.value)\n\nconsole.log('Subtotal:', subtotal.value)\nconsole.log('Tax:', tax.value)\nconsole.log('Total:', total.value)\n\n// Update sources — all derived values re-compute\nprice.value = 150\nconsole.log('After price change:')\nconsole.log('Subtotal:', subtotal.value)\nconsole.log('Total:', total.value)",
  name: 'Derived Signals',
};
