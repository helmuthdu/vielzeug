export const barChartExample = {
  code: `import { createBarChart } from '@vielzeug/prism'

const host = document.createElement('div')
host.style.cssText = 'width: 100%; max-width: 640px; height: 300px'
document.body.append(host)

const chart = createBarChart(host, {
  a11y: { ariaLabel: 'Downloads per package' },
  legend: true,
  series: [
    { data: [{ key: 'ore', value: 420 }, { key: 'prism', value: 310 }, { key: 'refine', value: 505 }], name: 'This week' },
    { data: [{ key: 'ore', value: 380 }, { key: 'prism', value: 295 }, { key: 'refine', value: 440 }], name: 'Last week' },
  ],
  tooltip: true,
})

console.log('rendered a grouped bar chart — hover the bars')
void chart`,
  name: 'Bar chart',
};
