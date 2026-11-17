export const stageLayersExample = {
  code: `import { createStage } from '@vielzeug/stage'

const canvas = document.createElement('canvas')
canvas.style.cssText = 'width:100%;max-width:560px;background:#0f172a;border-radius:12px'
document.body.appendChild(canvas)

const stage = createStage(canvas, {
  width: 560,
  height: 320,
  dpr: window.devicePixelRatio || 1,
  layers: [
    {
      id: 'grid',
      // Grid layer: painted once, cached until the transform changes.
      paint: (ctx, { visibleRect }) => {
        ctx.strokeStyle = '#1e293b'
        ctx.lineWidth = 1
        const step = 32
        for (let x = Math.floor(visibleRect.x / step) * step; x < visibleRect.x + visibleRect.width; x += step) {
          ctx.beginPath(); ctx.moveTo(x, visibleRect.y); ctx.lineTo(x, visibleRect.y + visibleRect.height); ctx.stroke()
        }
        for (let y = Math.floor(visibleRect.y / step) * step; y < visibleRect.y + visibleRect.height; y += step) {
          ctx.beginPath(); ctx.moveTo(visibleRect.x, y); ctx.lineTo(visibleRect.x + visibleRect.width, y); ctx.stroke()
        }
      },
    },
    {
      id: 'tokens',
      // Token layer: repaints whenever a token moves.
      paint: (ctx) => {
        ctx.fillStyle = '#38bdf8'
        ctx.beginPath(); ctx.arc(0, 0, 24, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = '#f472b6'
        ctx.beginPath(); ctx.arc(120, 60, 16, 0, Math.PI * 2); ctx.fill()
      },
    },
  ],
})

// Pan with drag, zoom with the wheel: the stage re-composites cached
// layers and repaints them against the new world transform.
let zoom = 1, panX = 0, panY = 0
function applyTransform() {
  stage.setTransform([zoom, 0, 0, zoom, panX, panY])
}
applyTransform()

canvas.addEventListener('wheel', (event) => {
  event.preventDefault()
  const box = canvas.getBoundingClientRect()
  const sx = event.clientX - box.left, sy = event.clientY - box.top
  const next = Math.min(8, Math.max(0.2, zoom * Math.exp(-event.deltaY * 0.0015)))
  // Keep the world point under the cursor fixed.
  panX = sx - ((sx - panX) / zoom) * next
  panY = sy - ((sy - panY) / zoom) * next
  zoom = next
  applyTransform()
}, { passive: false })

let dragging = false
canvas.addEventListener('pointerdown', (event) => { dragging = true; canvas.setPointerCapture(event.pointerId) })
canvas.addEventListener('pointermove', (event) => {
  if (!dragging) return
  panX += event.movementX; panY += event.movementY
  applyTransform()
})
canvas.addEventListener('pointerup', () => { dragging = false })

// Drag the blue token: only its layer repaints.
canvas.addEventListener('dblclick', () => {
  stage.invalidate('tokens')
})

console.log('layers:', stage.layerIds.join(', '))`,
  name: 'createStage - Layered pan/zoom canvas',
};
