export const scalesBasicExample = {
  code: `// Build and inspect linear, time, and band scales
import { bandScale, buildXScale, buildYScale, linearScale, timeScale } from '@vielzeug/prism'

// Linear scale: maps domain [0, 100] to pixel range [0, 500]
const y = linearScale({ domain: [0, 100], range: [0, 500] })
console.log('y.map(50):', y.map(50))       // 250
console.log('y.invert(250):', y.invert(250)) // 50
console.log('y.ticks(5):', y.ticks(5))

// Time scale: maps a date range to pixels
const start = new Date('2024-01-01')
const end   = new Date('2024-12-31')
const x = timeScale({ domain: [start, end], nice: false, range: [0, 800] })
console.log('x.map(start):', x.map(start))   // 0
console.log('x.map(end):', x.map(end))        // 800
console.log('x.ticks(4).length:', x.ticks(4).length)

// Band scale: categorical axis for bar charts
const cat = bandScale({ domain: ['Q1', 'Q2', 'Q3', 'Q4'], padding: 0.2, range: [0, 400] })
console.log('cat.bandwidth():', cat.bandwidth())
console.log('cat.map("Q1"):', cat.map('Q1'))
console.log('cat.map("Q3"):', cat.map('Q3'))

// buildXScale / buildYScale: auto-detect numeric vs Date
const autoX = buildXScale([10, 20, 30, 40], 600)
console.log('autoX domain:', autoX.domain)    // [10, 40]
const autoY = buildYScale([5, 15, 25], 400)
console.log('autoY domain:', autoY.domain)    // [0, 25]`,
  name: 'Scales — linear, time, band',
};
