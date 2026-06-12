export const pieBasicExample = {
  code: `// Donut chart with reactive data and slice hover events
import { createPieChart } from '@vielzeug/prism'
import { signal } from '@vielzeug/ripple'

const container = document.createElement('div')
container.style.cssText = 'width:300px;height:300px;background:#fff;border-radius:8px'
document.body.appendChild(container)

const data = signal([
  { label: 'Direct',  value: 42, color: '#6366f1' },
  { label: 'Organic', value: 28, color: '#22d3ee' },
  { label: 'Referral', value: 18, color: '#f59e0b' },
  { label: 'Social',  value: 12, color: '#10b981' },
])

const chart = createPieChart(container, {
  data,
  variant: 'donut',
  tooltip: true,
  transition: { duration: 600, easing: 'ease-out' },
  onHover: (slice, index) => {
    if (slice) console.log(\`Hovering: \${slice.label} (\${slice.value})\`)
  },
})

// Simulate a data update — animation re-runs automatically
setTimeout(() => {
  data.value = [
    { label: 'Direct',  value: 55, color: '#6366f1' },
    { label: 'Organic', value: 20, color: '#22d3ee' },
    { label: 'Referral', value: 15, color: '#f59e0b' },
    { label: 'Social',  value: 10, color: '#10b981' },
  ]
  console.log('Data updated — pie re-animates without RAF leak')
}, 1200)

console.log('pie chart el:', chart.el.tagName)`,
  name: 'Pie / donut chart — reactive slices',
};
