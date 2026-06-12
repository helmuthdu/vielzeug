export const lineBasicExample = {
  code: `// Reactive line chart — data signal drives automatic re-render
import { createLineChart } from '@vielzeug/prism'
import { signal } from '@vielzeug/ripple'

const container = document.createElement('div')
container.style.cssText = 'width:480px;height:260px;background:#fff;border-radius:8px;padding:8px'
document.body.appendChild(container)

const data = signal([
  { x: 1, y: 20 }, { x: 2, y: 35 }, { x: 3, y: 28 },
  { x: 4, y: 52 }, { x: 5, y: 44 }, { x: 6, y: 68 },
])

const chart = createLineChart(container, {
  series: [{ name: 'Revenue', data, color: '#6366f1', curve: 'monotone', strokeWidth: 2, showPoints: true }],
  xAxis: { position: 'bottom' },
  yAxis: { position: 'left', grid: true },
  tooltip: true,
  crosshair: true,
  transition: { duration: 400, easing: 'ease-out' },
})

// Append a new point after 1 s — chart updates automatically
setTimeout(() => {
  data.value = [...data.value, { x: 7, y: 80 }]
  console.log('Added point — chart re-rendered via signal')
}, 1000)

console.log('chart SVG:', chart.el.tagName)`,
  name: 'Line chart — reactive signal',
};
