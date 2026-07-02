export const watchMultiSourceExample = {
  code: `import { signal, watch } from '@vielzeug/ripple'

// watch() accepts a function instead of a single signal — it tracks every
// reactive read inside, like computed(), so no intermediate computed() is needed.
const firstName = signal('Ada')
const lastName = signal('Lovelace')

const sub = watch(
  () => \`\${firstName.value} \${lastName.value}\`,
  (fullName, prev) => console.log(\`\${prev} → \${fullName}\`),
)

lastName.value = 'King' // → 'Ada Lovelace → Ada King'
firstName.value = 'Grace' // → 'Ada King → Grace King'

sub.dispose()
lastName.value = 'Hopper' // silent — disposed

// immediate + once still work the same as the single-source form
const width = signal(100)
const height = signal(50)

watch(
  () => width.value * height.value,
  (area) => console.log('Initial area:', area),
  { immediate: true, once: true },
)
// → 'Initial area: 5000' (fires immediately, then auto-disposes)

width.value = 200 // silent — already disposed`,
  name: 'watch — multiple sources',
};
