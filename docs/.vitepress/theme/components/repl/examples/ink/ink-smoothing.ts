export const inkSmoothingExample = {
  code: `import { polylineToSvgPath, stabilizeStroke, strokeOutline, strokeWidths } from '@vielzeug/ink'

// Deterministic zig-zag samples with timestamps: the jitter stabilization must remove.
const samples = Array.from({ length: 24 }, (_, i) => ({
  time: i * 16,
  x: 20 + i * 12,
  y: 80 + (i % 2 === 0 ? 14 : -14),
}))

const stabilized = stabilizeStroke(samples)
const widths = strokeWidths(stabilized, { width: 8 })
const outline = strokeOutline(stabilized, widths)

const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
svg.setAttribute('viewBox', '0 0 320 160')
svg.style.cssText = 'width:100%;max-width:480px;background:#f8fafc;border-radius:12px;'

const raw = document.createElementNS('http://www.w3.org/2000/svg', 'polyline')
raw.setAttribute('points', samples.map((p) => \`\${p.x},\${p.y}\`).join(' '))
raw.setAttribute('fill', 'none')
raw.setAttribute('stroke', '#cbd5e1')
raw.setAttribute('stroke-dasharray', '4 4')

const ink = document.createElementNS('http://www.w3.org/2000/svg', 'path')
ink.setAttribute('d', polylineToSvgPath(outline, { close: true }))
ink.setAttribute('fill', '#0f172a')

svg.append(raw, ink)
document.body.appendChild(svg)

console.log('samples:', samples.length, 'stabilized:', stabilized.length, 'outline points:', outline.length)`,
  name: 'stabilizeStroke - Jitter-free ink',
};
