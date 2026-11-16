export const atlasSnapExample = {
  code: `import { alignRects, distributeRects, snapRect, type Rect } from '@vielzeug/atlas'

// Drag a rect with the pointer; it snaps to nearby rects and a 50px grid.
const candidates: Rect[] = [
  { x: -120, y: -80, width: 80, height: 60 },
  { x: 40, y: 20, width: 100, height: 40 },
  { x: -30, y: 110, width: 60, height: 60 },
]
let moving: Rect = { x: 150, y: -40, width: 90, height: 50 }

const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
svg.setAttribute('viewBox', '-200 -150 480 340')
svg.style.cssText = 'width:100%;max-width:560px;background:#0f172a;border-radius:12px;touch-action:none'
document.body.appendChild(svg)

function render(guides) {
  svg.replaceChildren()
  const ns = 'http://www.w3.org/2000/svg'
  for (const g of guides) {
    const line = document.createElementNS(ns, 'line')
    if (g.axis === 'x') {
      line.setAttribute('x1', String(g.position)); line.setAttribute('x2', String(g.position))
      line.setAttribute('y1', String(g.from)); line.setAttribute('y2', String(g.to))
    } else {
      line.setAttribute('y1', String(g.position)); line.setAttribute('y2', String(g.position))
      line.setAttribute('x1', String(g.from)); line.setAttribute('x2', String(g.to))
    }
    line.setAttribute('stroke', '#f472b6'); line.setAttribute('stroke-width', '1.5')
    svg.appendChild(line)
  }
  for (const r of [...candidates, moving]) {
    const rect = document.createElementNS(ns, 'rect')
    rect.setAttribute('x', String(r.x)); rect.setAttribute('y', String(r.y))
    rect.setAttribute('width', String(r.width)); rect.setAttribute('height', String(r.height))
    rect.setAttribute('rx', '6')
    rect.setAttribute('fill', r === moving ? '#38bdf8' : '#334155')
    svg.appendChild(rect)
  }
}
render([])

svg.addEventListener('pointermove', (event) => {
  if (event.buttons !== 1) return
  const box = svg.getBoundingClientRect()
  const px = (event.clientX - box.left) * (480 / box.width) - 200
  const py = (event.clientY - box.top) * (340 / box.height) - 150
  const target = { ...moving, x: px - moving.width / 2, y: py - moving.height / 2 }
  const snap = snapRect(target, { candidates, grid: { x: 50, y: 50 }, threshold: 8 })
  moving = { ...target, x: target.x + snap.delta.x, y: target.y + snap.delta.y }
  render(snap.guides)
})

// Press A to align all rects to the top edge, D to distribute horizontally.
window.addEventListener('keydown', (event) => {
  if (event.key === 'a') candidates.splice(0, candidates.length, ...alignRects(candidates, 'top'))
  if (event.key === 'd') candidates.splice(0, candidates.length, ...distributeRects(candidates, 'x'))
  render([])
})`,
  name: 'snapRect - Magnetic snapping and guides',
};
