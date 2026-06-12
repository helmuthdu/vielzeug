export const presetsExample = {
  code: `// Preset predicates and comparators for common filter/sort patterns
import { createLocalSource, filterContains, filterEquals, filterRange, sortBy } from '@vielzeug/sourcerer'

const products = [
  { id: 1, name: 'Keyboard',  category: 'peripherals', price: 89  },
  { id: 2, name: 'Monitor',   category: 'display',     price: 349 },
  { id: 3, name: 'Headphones',category: 'audio',       price: 149 },
  { id: 4, name: 'Mousepad',  category: 'peripherals', price: 29  },
  { id: 5, name: 'Webcam',    category: 'peripherals', price: 79  },
]

const source = createLocalSource(products, { limit: 10 })

// filterContains — case-insensitive substring match on a field
await source.setFilter(filterContains(p => p.category, 'peripherals'))
console.log('Peripherals:', source.current.map(p => p.name))

// filterEquals — strict equality on a field
await source.setFilter(filterEquals(p => p.category, 'audio'))
console.log('Audio:', source.current.map(p => p.name))

// filterRange — inclusive min/max on a numeric field
await source.setFilter(filterRange(p => p.price, { min: 50, max: 200 }))
await source.setSort(sortBy(p => p.price, 'asc'))
console.log('$50–$200 asc:', source.current.map(p => \`\${p.name} (\\$\${p.price})\`))

// sortBy descending
await source.setFilter(undefined)
await source.setSort(sortBy(p => p.price, 'desc'))
console.log('All by price desc:', source.current.map(p => \`\${p.name} (\\$\${p.price})\`))

// filterRange also accepts Date values
const events = [
  { title: 'Past event',    date: new Date('2023-01-01') },
  { title: 'Recent event', date: new Date('2024-06-15') },
  { title: 'Future event', date: new Date('2026-12-31') },
]
const eventSource = createLocalSource(events, { limit: 10 })
await eventSource.setFilter(filterRange(e => e.date, { min: new Date('2024-01-01'), max: new Date('2025-12-31') }))
console.log('Events in 2024–2025:', eventSource.current.map(e => e.title))`,
  name: 'Presets (filterContains, filterEquals, filterRange, sortBy)',
};
