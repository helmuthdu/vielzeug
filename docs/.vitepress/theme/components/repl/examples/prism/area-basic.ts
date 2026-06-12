export const areaBasicExample = {
  code: `// Stacked area chart with monotone curve and animated transitions
import { createAreaChart } from '@vielzeug/prism'
import { signal } from '@vielzeug/ripple'

const container = document.createElement('div')
container.style.cssText = 'width:540px;height:280px;background:#fff;border-radius:8px;padding:8px'
document.body.appendChild(container)

const series = signal([
  {
    name: 'Revenue',
    color: '#6366f1',
    curve: 'monotone',
    fillOpacity: 0.25,
    showLine: true,
    data: [
      { x: 1, y: 12 }, { x: 2, y: 28 }, { x: 3, y: 18 },
      { x: 4, y: 35 }, { x: 5, y: 42 }, { x: 6, y: 38 },
    ],
  },
  {
    name: 'Costs',
    color: '#f59e0b',
    curve: 'monotone',
    fillOpacity: 0.2,
    showLine: true,
    data: [
      { x: 1, y: 8 }, { x: 2, y: 14 }, { x: 3, y: 22 },
      { x: 4, y: 19 }, { x: 5, y: 30 }, { x: 6, y: 27 },
    ],
  },
])

const chart = createAreaChart(container, {
  series,
  xAxis: { position: 'bottom' },
  yAxis: { position: 'left', grid: true },
  tooltip: true,
  crosshair: true,
  transition: { duration: 500, easing: 'ease-out' },
})

// Update data — fill and line animate in sync via RAF interpolation
setTimeout(() => {
  series.value = series.value.map((s) => ({
    ...s,
    data: s.data.map((pt) => ({ x: pt.x, y: Math.round(pt.y * 1.3) })),
  }))
  console.log('Data updated — area re-animates with matching fill curve')
}, 1500)

console.log('area chart el:', chart.el.tagName)`,
  name: 'Area chart — multi-series with fill',
};
