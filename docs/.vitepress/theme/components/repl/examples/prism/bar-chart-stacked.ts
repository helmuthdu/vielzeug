export const barChartStackedExample = {
  code: `// Stacked bar chart with reactive signal data
import { createBarChart } from '@vielzeug/prism'
import { signal } from '@vielzeug/ripple'
import '@vielzeug/prism/theme'

const container = document.createElement('div')
container.style.cssText = 'width:600px;height:320px;background:#fff;border-radius:8px;padding:16px'
document.body.appendChild(container)

const q1Data = signal([
  { x: 'Jan', y: 40 }, { x: 'Feb', y: 55 }, { x: 'Mar', y: 48 },
])
const q2Data = signal([
  { x: 'Jan', y: 25 }, { x: 'Feb', y: 30 }, { x: 'Mar', y: 35 },
])

const chart = createBarChart(container, {
  series: [
    { color: '#6366f1', data: q1Data, name: 'Product A' },
    { color: '#22d3ee', data: q2Data, name: 'Product B' },
  ],
  tooltip: { render: (pt, s) => \`\${s.name} — \${pt.x}: \${pt.y}\` },
  variant: 'stacked',
  xAxis: { position: 'bottom' },
  yAxis: { position: 'left' },
})

console.log('Stacked bar chart mounted.')

// Update data after 2 s to demonstrate reactivity
setTimeout(() => {
  q1Data.value = [{ x: 'Jan', y: 60 }, { x: 'Feb', y: 70 }, { x: 'Mar', y: 65 }]
  console.log('Data updated — chart re-renders automatically.')
}, 2000)

setTimeout(() => { chart.dispose(); console.log('disposed') }, 30_000)`,
  name: 'Bar chart — stacked with reactive data',
};
