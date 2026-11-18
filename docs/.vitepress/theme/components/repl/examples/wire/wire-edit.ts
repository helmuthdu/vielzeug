export const wireEditExample = {
  code: `import {
  arrowhead,
  bezierRoute,
  bezierToSvgPath,
  hitBezier,
  hitPolyline,
  orthogonalRoute,
  pointOnBezier,
  polylineToSvgPath,
} from '@vielzeug/wire'

const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
svg.setAttribute('viewBox', '0 0 380 200')
svg.style.cssText = 'width:100%;max-width:520px;background:#0f172a;border-radius:12px'

function addPath(d, color, dashed) {
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  path.setAttribute('d', d)
  path.setAttribute('fill', 'none')
  path.setAttribute('stroke', color)
  path.setAttribute('stroke-width', '2')
  if (dashed) path.setAttribute('stroke-dasharray', '5 5')
  svg.appendChild(path)
  return path
}

// Rounded orthogonal corners: one option at serialization time.
const points = orthogonalRoute(
  { side: 'right', x: 60, y: 40 },
  { side: 'left', x: 320, y: 150 },
  { obstacles: [{ x: 150, y: 60, width: 80, height: 50 }], padding: 10 },
)
if (points) addPath(polylineToSvgPath(points, { cornerRadius: 10 }), '#a78bfa')

// A bezier wire with an arrowhead at the tip and a marker at its length midpoint.
const curve = bezierRoute({ side: 'right', x: 60, y: 60 }, { side: 'left', x: 320, y: 110 })
addPath(bezierToSvgPath(curve), '#38bdf8')

const tip = curve.to
const arriving = { x: tip.x - curve.c2.x, y: tip.y - curve.c2.y }
const [apex, left, right] = arrowhead(tip, arriving, { length: 10, width: 6 })
const head = document.createElementNS('http://www.w3.org/2000/svg', 'polygon')
head.setAttribute('points', [apex, left, right].map((p) => p.x + ',' + p.y).join(' '))
head.setAttribute('fill', '#38bdf8')
svg.appendChild(head)

const mid = pointOnBezier(curve, 0.5) // halfway along the drawn length
const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
dot.setAttribute('cx', String(mid.x)); dot.setAttribute('cy', String(mid.y))
dot.setAttribute('r', '4'); dot.setAttribute('fill', '#fbbf24')
svg.appendChild(dot)

// Math hit-testing: a point near the curve hits, a far point misses.
const near = hitBezier(curve, { x: 190, y: 88 }, { threshold: 8 })
const far = hitBezier(curve, { x: 190, y: 160 }, { threshold: 8 })
const polyHit = points ? hitPolyline(points, { x: 100, y: 40 }, { threshold: 8 }) : null

document.body.appendChild(svg)
console.log('near hit:', near ? 't=' + near.t.toFixed(2) + ' d=' + near.distance.toFixed(1) : 'null')
console.log('far hit:', far === null ? 'null (past threshold)' : 'unexpected')
console.log('polyline hit:', polyHit ? 't=' + polyHit.t.toFixed(2) : 'null')`,
  name: 'edit - Arrowheads, arc-length t, hit testing',
};
