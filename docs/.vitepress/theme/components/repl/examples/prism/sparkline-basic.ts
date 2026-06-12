export const sparklineBasicExample = {
  code: `// Sparklines: inline line, area, bar, and stack variants
import { createSparkline } from '@vielzeug/prism'
import { signal } from '@vielzeug/ripple'
import '@vielzeug/prism/theme'

function row(label: string): { div: HTMLDivElement; spark: HTMLDivElement } {
  const div = document.createElement('div')
  div.style.cssText = 'display:flex;align-items:center;gap:12px;margin:8px 0'
  const lbl = document.createElement('span')
  lbl.style.cssText = 'width:60px;font:12px/1 sans-serif;color:#64748b'
  lbl.textContent = label
  const spark = document.createElement('div')
  spark.style.cssText = 'width:120px;height:32px'
  div.appendChild(lbl)
  div.appendChild(spark)
  document.body.appendChild(div)
  return { div, spark }
}

// Line sparkline with reactive data
const lineData = signal([10, 24, 18, 36, 28, 42, 35])
const { spark: lineSpark } = row('Line')
createSparkline(lineSpark, { color: '#6366f1', data: lineData, variant: 'line' })

// Area sparkline
const { spark: areaSpark } = row('Area')
createSparkline(areaSpark, { color: '#22d3ee', data: [5, 15, 10, 30, 20, 40], fillOpacity: 0.3, variant: 'area' })

// Bar sparkline
const { spark: barSpark } = row('Bar')
createSparkline(barSpark, { color: '#f59e0b', data: [8, 20, 14, 28, 18, 32], variant: 'bar' })

// Stack sparkline with named segments
const { spark: stackSpark } = row('Stack')
createSparkline(stackSpark, {
  data: [
    { color: '#6366f1', label: 'A', value: 40 },
    { color: '#22d3ee', label: 'B', value: 35 },
    { color: '#f59e0b', label: 'C', value: 25 },
  ],
  variant: 'stack',
})

// Reactive update — line sparkline re-renders via signal
setTimeout(() => {
  lineData.value = [...lineData.value, 50]
  console.log('Point added — line sparkline updated')
}, 1200)`,
  name: 'Sparkline — line, area, bar, stack variants',
};
