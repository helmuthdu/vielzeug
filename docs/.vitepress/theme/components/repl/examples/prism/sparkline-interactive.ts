export const sparklineInteractiveExample = {
  code: `// Sparkline — ariaLabel, curve, onHover tooltip
import { createSparkline } from '@vielzeug/prism'
import '@vielzeug/prism/theme'

const values = [12, 28, 18, 42, 35, 55, 46, 60, 52, 70]

// Container with label and hover readout
const wrap = document.createElement('div')
wrap.style.cssText = 'font:13px/1.5 sans-serif;display:flex;flex-direction:column;gap:16px;padding:16px'
document.body.appendChild(wrap)

function section(title: string, el: HTMLElement): void {
  const h = document.createElement('div')
  h.style.cssText = 'font-weight:600;color:#475569;margin-bottom:4px'
  h.textContent = title
  wrap.appendChild(h)
  wrap.appendChild(el)
}

// ─── Accessible sparkline with ariaLabel ───────────────────────────────────
const a11yWrap = document.createElement('div')
a11yWrap.style.cssText = 'display:flex;align-items:center;gap:12px'
const a11ySpark = document.createElement('div')
a11ySpark.style.cssText = 'width:160px;height:40px'
const a11yLabel = document.createElement('span')
a11yLabel.style.cssText = 'font-size:12px;color:#64748b'
a11yLabel.textContent = 'role="img" on SVG'
a11yWrap.appendChild(a11ySpark)
a11yWrap.appendChild(a11yLabel)
section('Accessible (ariaLabel)', a11yWrap)

createSparkline(a11ySpark, {
  ariaLabel: 'Revenue trend — up 58% over 10 periods',
  color: '#6366f1',
  curve: 'monotone',
  data: values,
  variant: 'area',
})
console.log('SVG role:', a11ySpark.querySelector('svg')?.getAttribute('role'))  // 'img'

// ─── Interactive sparkline with onHover ───────────────────────────────────
const intWrap = document.createElement('div')
intWrap.style.cssText = 'display:flex;flex-direction:column;gap:4px'
const intSpark = document.createElement('div')
intSpark.style.cssText = 'width:200px;height:44px;cursor:crosshair'
const readout = document.createElement('div')
readout.style.cssText = 'height:18px;font-size:11px;color:#6366f1'
readout.textContent = 'Hover to inspect…'
intWrap.appendChild(intSpark)
intWrap.appendChild(readout)
section('Interactive (onHover)', intWrap)

createSparkline(intSpark, {
  ariaLabel: 'Weekly sessions trend',
  color: '#22d3ee',
  curve: 'monotone',
  data: values,
  fillOpacity: 0.25,
  onHover: (idx, val) => {
    readout.textContent = idx === null
      ? 'Hover to inspect…'
      : \`Period \${idx + 1}: \${val}\`
  },
  variant: 'area',
})

// ─── Step curve sparkline ─────────────────────────────────────────────────
const stepWrap = document.createElement('div')
stepWrap.style.cssText = 'width:200px;height:40px'
section('Step curve', stepWrap)

createSparkline(stepWrap, {
  ariaLabel: 'Step values',
  color: '#f59e0b',
  curve: 'step',
  data: [10, 10, 30, 30, 20, 20, 40, 40],
  variant: 'line',
})`,
  name: 'Sparkline — ariaLabel, curve, onHover',
};
