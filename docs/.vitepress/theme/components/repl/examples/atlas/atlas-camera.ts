export const atlasCameraExample = {
  code: `import { createCamera, createSpatialIndex } from '@vielzeug/atlas'

// A small scene of world-space rects, indexed for hit-testing.
const index = createSpatialIndex()
const colors = ['#38bdf8', '#a78bfa', '#f472b6', '#34d399', '#fbbf24']
for (let i = 0; i < 40; i++) {
  const x = (i % 8) * 90 - 320
  const y = Math.floor(i / 8) * 70 - 140
  index.insert('r' + i, { x, y, width: 60, height: 44 }, colors[i % colors.length])
}

const camera = createCamera({ minZoom: 0.2, maxZoom: 8 })
camera.fitBounds({ x: -320, y: -140, width: 700, height: 420 }, { size: { x: 480, y: 300 }, padding: 20 })

const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
svg.setAttribute('viewBox', '0 0 480 300')
svg.style.cssText = 'width:100%;max-width:560px;background:#0f172a;border-radius:12px;touch-action:none;cursor:grab'
document.body.appendChild(svg)

function render() {
  svg.replaceChildren()
  const visible = index.queryRect(camera.visibleRect({ x: 480, y: 300 }))
  for (const entry of visible) {
    const p = camera.toScreen({ x: entry.rect.x, y: entry.rect.y })
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    rect.setAttribute('x', String(p.x))
    rect.setAttribute('y', String(p.y))
    rect.setAttribute('width', String(entry.rect.width * camera.state.zoom))
    rect.setAttribute('height', String(entry.rect.height * camera.state.zoom))
    rect.setAttribute('rx', '6')
    rect.setAttribute('fill', String(entry.value))
    svg.appendChild(rect)
  }
}
render()

// Wheel zoom anchored at the cursor.
svg.addEventListener('wheel', (event) => {
  event.preventDefault()
  const box = svg.getBoundingClientRect()
  const sx = (event.clientX - box.left) * (480 / box.width)
  const sy = (event.clientY - box.top) * (300 / box.height)
  camera.zoomAt({ x: sx, y: sy }, Math.exp(-event.deltaY * 0.0015))
  render()
}, { passive: false })

// Drag to pan; double-click fits the whole scene again.
let dragging = false
svg.addEventListener('pointerdown', (event) => {
  dragging = true
  svg.setPointerCapture(event.pointerId)
  svg.style.cursor = 'grabbing'
})
svg.addEventListener('pointermove', (event) => {
  if (dragging) { camera.panBy(event.movementX, event.movementY); render() }
})
svg.addEventListener('pointerup', () => { dragging = false; svg.style.cursor = 'grab' })
svg.addEventListener('dblclick', () => {
  camera.animateTo({ x: 0, y: 0, zoom: 1, rotation: 0 }, { duration: 400 })
})

console.log('visible rects:', index.queryRect(camera.visibleRect({ x: 480, y: 300 })).length)`,
  name: 'createCamera - Pan, zoom and culling',
};
