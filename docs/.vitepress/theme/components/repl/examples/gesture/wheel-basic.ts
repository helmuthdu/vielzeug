export const wheelBasicExample = {
  code: `import { createWheelGesture } from '@vielzeug/gesture'

const viewport = document.createElement('div')
viewport.style.cssText = 'width:100%;height:220px;overflow:hidden;background:#f1f5f9;border-radius:12px;touch-action:none;'
const content = document.createElement('div')
content.style.cssText = 'width:200%;height:400%;display:grid;place-items:center;font-weight:600;color:#475569;'
content.textContent = 'Scroll inside'
viewport.appendChild(content)
document.body.appendChild(viewport)

const output = document.createElement('pre')
document.body.appendChild(output)

let x = 0
let y = 0
createWheelGesture(viewport, {
  preventDefault: true,
  onWheel: ({ deltaX, deltaY, pinch }) => {
    if (pinch) {
      output.textContent = \`pinch-zoom wheel: \${deltaY.toFixed(1)}px\`
      return
    }
    x = Math.max(-400, Math.min(0, x - deltaX))
    y = Math.max(-800, Math.min(0, y - deltaY))
    content.style.transform = \`translate(\${x}px, \${y}px)\`
    output.textContent = \`offset: \${Math.round(x)}px, \${Math.round(y)}px\`
  },
})

console.log('Wheel gesture ready')`,
  name: 'createWheelGesture - Basic',
};
