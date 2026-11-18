export const stageExportExample = {
  code: `import { createStage } from '@vielzeug/stage'

const canvas = document.createElement('canvas')
canvas.style.cssText = 'width:100%;max-width:560px;background:#0f172a;border-radius:12px'
document.body.appendChild(canvas)

const stage = createStage(canvas, {
  width: 560,
  height: 320,
  dpr: window.devicePixelRatio || 1,
  background: '#0f172a',
  layers: [
    {
      id: 'art',
      // World-space art: a 200×200 tile grid around the origin.
      paint: (ctx) => {
        for (let row = 0; row < 4; row++) {
          for (let col = 0; col < 4; col++) {
            ctx.fillStyle = (row + col) % 2 === 0 ? '#38bdf8' : '#f472b6'
            ctx.fillRect(col * 50, row * 50, 46, 46)
          }
        }
      },
    },
  ],
})

// Zoom out a bit so the checkerboard is visible on screen.
stage.setTransform([0.8, 0, 0, 0.8, 40, 20])
stage.render()

// Export a 100×100 world-space region at 3 pixels per world unit:
// a 300×300 PNG, re-painted from the layer painters (not a screenshot).
const blob = await stage.toBlob({
  region: { x: 0, y: 0, width: 100, height: 100 },
  scale: 3,
  type: 'image/png',
})

const img = document.createElement('img')
img.style.cssText = 'display:block;margin-top:12px;border:1px solid #334155;border-radius:8px'
img.src = URL.createObjectURL(blob)
document.body.appendChild(img)
console.log('exported', blob.size, 'bytes at 3px per world unit')`,
  name: 'toBlob - Region + scale export',
};
