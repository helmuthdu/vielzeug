export const barBasicExample = {
  code: `// Grouped bar chart with stagger animation and tooltip
import { createBarChart } from '@vielzeug/prism'

const container = document.createElement('div')
container.style.cssText = 'width:480px;height:260px;background:#fff;border-radius:8px;padding:8px'
document.body.appendChild(container)

const chart = createBarChart(container, {
  series: [
    {
      name: '2023',
      data: [{ x: 'Q1', y: 120 }, { x: 'Q2', y: 180 }, { x: 'Q3', y: 150 }, { x: 'Q4', y: 210 }],
      color: '#94a3b8',
      borderRadius: 4,
    },
    {
      name: '2024',
      data: [{ x: 'Q1', y: 160 }, { x: 'Q2', y: 230 }, { x: 'Q3', y: 195 }, { x: 'Q4', y: 275 }],
      color: '#6366f1',
      borderRadius: 4,
    },
  ],
  xAxis: { position: 'bottom' },
  yAxis: { position: 'left', grid: true },
  tooltip: true,
  legend: true,
  transition: { duration: 400, easing: 'ease-out', stagger: 40 },
})

console.log('bar chart el:', chart.el.tagName)`,
  name: 'Bar chart — grouped with animation',
};
