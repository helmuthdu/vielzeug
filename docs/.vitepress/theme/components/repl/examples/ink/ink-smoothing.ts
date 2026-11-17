export const inkSmoothingExample = {
  code: `import { smoothStroke, strokeOutline, strokeOutlineToSvgPath, strokeWidths } from '@vielzeug/ink'

// Deterministic zig-zag samples: the jitter smoothing must remove.
const samples = Array.from({ length: 24 }, (_, i) => ({
  x: 20 + i * 12,
  y: 80 + (i % 2 === 0 ? 14 : -14),
}))

const smoothed = smoothStroke(samples)
const widths = strokeWidths(smoothed, { baseWidth: 8, referenceSpeed: 6 })
const outline = strokeOutline(smoothed, widths)

const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
svg.setAttribute('viewBox', '0 0 320 160')
svg.style.cssText = 'width:100%;max-width:480px;background:#f8fafc;border-radius:12px;'

const raw = document.createElementNS('http://www.w3.org/2000/svg', 'polyline')
raw.setAttribute('points', samples.map((p) => \`\${p.x},\${p.y}\`).join(' '))
raw.setAttribute('fill', 'none')
raw.setAttribute('stroke', '#cbd5e1')
raw.setAttribute('stroke-dasharray', '4 4')

const ink = document.createElementNS('http://www.w3.org/2000/svg', 'path')
ink.setAttribute('d', strokeOutlineToSvgPath(outline))
ink.setAttribute('fill', '#0f172a')

svg.append(raw, ink)
document.body.appendChild(svg)

console.log('samples:', samples.length, 'smoothed:', smoothed.length, 'outline points:', outline.length)`,
  name: 'smoothStroke - Jitter-free ink',
};
