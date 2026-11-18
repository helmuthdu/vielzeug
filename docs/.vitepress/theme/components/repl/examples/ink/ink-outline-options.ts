export const inkOutlineOptionsExample = {
  code: `import { polylineToSvgPath, strokeOutline, strokeWidths } from '@vielzeug/ink'

// A hairpin turn plus a straight run: sharp enough that naive offsets spike.
const samples = [
  { time: 0, x: 20, y: 40 },
  { time: 16, x: 150, y: 40 },
  { time: 32, x: 70, y: 110 },
  { time: 48, x: 60, y: 30 },
]

const widths = strokeWidths(samples, {
  width: 14,
  taper: { start: 30, end: 30 }, // fade the ends over 30px of arc length
  simulatePressure: true, // mouse strokes have no pressure: synthesize it
})

const variants = [
  { label: 'round join + round cap', options: {} },
  { label: 'bevel join + butt cap', options: { cap: 'butt', join: 'bevel' } },
  { label: 'miter join + square cap', options: { cap: 'square', join: 'miter', miterLimit: 6 } },
]

const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
svg.setAttribute('viewBox', '0 0 320 260')
svg.style.cssText = 'width:100%;max-width:480px;background:#f8fafc;border-radius:12px;'

variants.forEach((variant, row) => {
  const outline = strokeOutline(samples, widths, variant.options)
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  path.setAttribute('d', polylineToSvgPath(outline, { close: true }))
  path.setAttribute('fill', '#0f172a')
  path.setAttribute('transform', \`translate(0 \${row * 84})\`)
  const label = document.createElementNS('http://www.w3.org/2000/svg', 'text')
  label.setAttribute('x', '8')
  label.setAttribute('y', 12 + row * 84)
  label.setAttribute('font-size', '10')
  label.setAttribute('fill', '#64748b')
  label.textContent = variant.label
  svg.append(label, path)
  console.log(variant.label, 'outline points:', outline.length)
})

document.body.appendChild(svg)`,
  name: 'strokeOutline options - caps, joins, and taper',
};
