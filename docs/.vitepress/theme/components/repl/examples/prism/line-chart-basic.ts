export const lineChartBasicExample = {
  code: `// Render a reactive multi-series line chart in the page
import { createLineChart } from '@vielzeug/prism'
import '@vielzeug/prism/theme'

const container = document.createElement('div')
container.style.cssText = 'width:600px;height:320px;background:#fff;border-radius:8px;padding:16px'
document.body.appendChild(container)

const chart = createLineChart(container, {
  crosshair: { vertical: true },
  series: [
    {
      color: '#6366f1',
      curve: 'monotone',
      data: [
        { x: 1, y: 12 }, { x: 2, y: 28 }, { x: 3, y: 18 },
        { x: 4, y: 35 }, { x: 5, y: 42 }, { x: 6, y: 38 },
      ],
      name: 'Revenue',
      showPoints: true,
    },
    {
      color: '#22d3ee',
      curve: 'monotone',
      data: [
        { x: 1, y: 8 }, { x: 2, y: 14 }, { x: 3, y: 22 },
        { x: 4, y: 19 }, { x: 5, y: 30 }, { x: 6, y: 27 },
      ],
      name: 'Costs',
    },
  ],
  tooltip: { render: (pt, s) => \`<b>\${s.name}</b>: \${pt.y}\` },
  xAxis: { position: 'bottom' },
  yAxis: { position: 'left' },
})

console.log('Line chart mounted. Hover over the chart to see the crosshair and tooltip.')

// Dispose after 30 s to keep the REPL tidy
setTimeout(() => { chart.dispose(); console.log('disposed') }, 30_000)`,
  name: 'Line chart — multi-series with tooltip',
};
