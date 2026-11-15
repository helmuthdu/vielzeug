export const lineChartExample = {
  code: `import { createLineChart } from '@vielzeug/prism'

// Charts render into any element and update through the returned handle:
// update() replaces the whole series array, transitions animate the delta.
const host = document.createElement('div')
host.style.cssText = 'width: 100%; max-width: 640px; height: 320px'
document.body.append(host)

const months = [1, 2, 3, 4, 5, 6]
const revenue = [12, 19, 15, 25, 32, 30]

const chart = createLineChart(host, {
  a11y: { ariaLabel: 'Revenue and costs by month' },
  legend: true,
  series: [
    { curve: 'monotone', data: months.map((m, i) => ({ key: m, value: revenue[i] })), name: 'Revenue', showPoints: true },
  ],
  tooltip: true,
})

// Explicit updates: swap in a second series after a moment, like live data would.
setTimeout(() => {
  chart.update([
    { curve: 'monotone', data: months.map((m, i) => ({ key: m, value: revenue[i] })), name: 'Revenue', showPoints: true },
    { color: '#e05252', curve: 'monotone', data: months.map((m) => ({ key: m, value: m * 4 + 5 })), name: 'Costs' },
  ])
  console.log('added a second series via chart.update()')
}, 1200)`,
  name: 'Line chart',
};
