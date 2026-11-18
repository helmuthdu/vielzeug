export const atlasFramesExample = {
  code: `import { apply, boundsOfFrame, frameMatrix, resizeRect, toCssMatrix } from '@vielzeug/atlas'

// One shape: a local rect placed by a frame matrix, resized by its handles.
let rect = { x: -90, y: -50, width: 180, height: 100 }
const rotation = Math.PI / 10
const frame = frameMatrix({ rotation, x: 0, y: 0 })

const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
svg.setAttribute('viewBox', '-240 -160 480 320')
svg.style.cssText = 'width:100%;max-width:560px;background:#0f172a;border-radius:12px;touch-action:none'
document.body.appendChild(svg)

const ns = 'http://www.w3.org/2000/svg'
function render() {
  svg.replaceChildren()
  const aabb = boundsOfFrame(rect, frame)
  const box = document.createElementNS(ns, 'rect')
  box.setAttribute('x', String(aabb.x)); box.setAttribute('y', String(aabb.y))
  box.setAttribute('width', String(aabb.width)); box.setAttribute('height', String(aabb.height))
  box.setAttribute('fill', 'none'); box.setAttribute('stroke', '#64748b'); box.setAttribute('stroke-dasharray', '4 4')
  svg.appendChild(box)
  const shape = document.createElementNS(ns, 'rect')
  shape.setAttribute('x', String(rect.x)); shape.setAttribute('y', String(rect.y))
  shape.setAttribute('width', String(rect.width)); shape.setAttribute('height', String(rect.height))
  shape.setAttribute('rx', '8'); shape.setAttribute('fill', '#38bdf8')
  shape.setAttribute('transform', toCssMatrix(frame))
  svg.appendChild(shape)
  // Handles sit on the rotated corners, and drag in world space.
  const corners = [
    { dir: 'nw', x: rect.x, y: rect.y },
    { dir: 'ne', x: rect.x + rect.width, y: rect.y },
    { dir: 'sw', x: rect.x, y: rect.y + rect.height },
    { dir: 'se', x: rect.x + rect.width, y: rect.y + rect.height },
  ]
  for (const c of corners) {
    const p = apply(frame, { x: c.x, y: c.y })
    const h = document.createElementNS(ns, 'rect')
    h.setAttribute('x', String(p.x - 5)); h.setAttribute('y', String(p.y - 5))
    h.setAttribute('width', '10'); h.setAttribute('height', '10'); h.setAttribute('rx', '2')
    h.setAttribute('fill', '#fbbf24'); h.style.cursor = 'grab'
    h.dataset.dir = c.dir
    svg.appendChild(h)
  }
}
render()

// Drag a handle: resizeRect keeps the opposite corner fixed; Shift locks the ratio.
let drag = null
svg.addEventListener('pointerdown', (event) => {
  const dir = event.target instanceof Element ? event.target.dataset.dir : undefined
  if (!dir) return
  drag = dir
  svg.setPointerCapture(event.pointerId)
})
svg.addEventListener('pointermove', (event) => {
  if (!drag) return
  const box = svg.getBoundingClientRect()
  const point = {
    x: (event.clientX - box.left) * (480 / box.width) - 240,
    y: (event.clientY - box.top) * (320 / box.height) - 160,
  }
  const aspect = event.shiftKey && rect.height > 0 ? rect.width / rect.height : undefined
  rect = resizeRect(rect, drag, point, { aspect, min: 20 })
  render()
})
svg.addEventListener('pointerup', () => { drag = null })

console.log('aabb:', JSON.stringify(boundsOfFrame(rect, frame)))`,
  name: 'frameMatrix + resizeRect - Rotated frame with resize handles',
};
