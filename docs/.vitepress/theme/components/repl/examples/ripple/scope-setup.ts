export const scopeSetupExample = {
  code: `import { signal, effect, scope, onCleanup, getSignalName } from '@vielzeug/ripple'

// scope(setup?) runs setup immediately — no separate s.run() needed.
// Useful for grouping a set of reactive resources into one lifecycle unit.

const temperature = signal(20, { name: 'temperature' })
const unit = signal<'C' | 'F'>('C', { name: 'unit' })

console.log('temperature signal name:', getSignalName(temperature))
console.log('unit signal name:', getSignalName(unit))

// Create a scope with inline setup
const weatherScope = scope(() => {
  const display = signal('', { name: 'display' })

  const stopEffect = effect(() => {
    const t = temperature.value
    const u = unit.value
    display.value = u === 'C' ? \`\${t}°C\` : \`\${(t * 9) / 5 + 32}°F\`
    console.log('weather display:', display.value)
  })

  onCleanup(() => {
    stopEffect.dispose()
    display.dispose()
    console.log('weather scope cleaned up')
  })
})

// Reactive updates
temperature.value = 25
unit.value = 'F'

// Dispose the entire scope at once
weatherScope.dispose()`,
  name: 'Scope — setup shorthand & getSignalName',
};
