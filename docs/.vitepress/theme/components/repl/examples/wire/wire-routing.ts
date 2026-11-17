export const wireRoutingExample = {
  code: `import { bezierRoute, orthogonalRoute, polylineToSvgPath } from '@vielzeug/wire'

// Three node boxes; edges must route around them.
const nodes = [
  { h: 46, w: 96, x: 20, y: 24 },
  { h: 46, w: 96, x: 20, y: 150 },
  { h: 46, w: 96, x: 260, y: 88 },
]
const obstacles = nodes.map((n) => ({ x: n.x, y: n.y, width: n.w, height: n.h }))

const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
svg.setAttribute('viewBox', '0 0 380 220')
svg.style.cssText = 'width:100%;max-width:520px;background:#0f172a;border-radius:12px'

for (const n of nodes) {
  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
  rect.setAttribute('x', String(n.x)); rect.setAttribute('y', String(n.y))
  rect.setAttribute('width', String(n.w)); rect.setAttribute('height', String(n.h))
  rect.setAttribute('rx', '8'); rect.setAttribute('fill', '#1e293b')
  rect.setAttribute('stroke', '#475569')
  svg.appendChild(rect)
}

function addPath(d, color, dashed) {
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  path.setAttribute('d', d)
  path.setAttribute('fill', 'none')
  path.setAttribute('stroke', color)
  path.setAttribute('stroke-width', '2')
  if (dashed) path.setAttribute('stroke-dasharray', '5 5')
  svg.appendChild(path)
}

// Curved wire from node 1's right port to node 3's left port.
addPath(bezierRoute({ side: 'right', x: 116, y: 47 }, { side: 'left', x: 260, y: 111 }), '#38bdf8')

// Manhattan wire from node 2 to node 3, routed around node 1's column.
// The edge's own nodes are excluded: an endpoint inside a padded obstacle is blocked.
const points = orthogonalRoute({ x: 116, y: 173 }, { x: 260, y: 111 }, { obstacles: [obstacles[0]], padding: 10 })
if (points) addPath(polylineToSvgPath(points), '#a78bfa')

document.body.appendChild(svg)
console.log('orthogonal waypoints:', points ? points.length : 'unreachable')`,
  name: 'orthogonalRoute - Edges around nodes',
};
