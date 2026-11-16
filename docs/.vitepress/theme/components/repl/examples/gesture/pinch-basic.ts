export const pinchBasicExample = {
  code: `import { createPinchGesture } from '@vielzeug/gesture'

const stage = document.createElement('div')
stage.style.cssText = 'width:100%;height:280px;display:grid;place-items:center;background:#f1f5f9;border-radius:12px;touch-action:none;user-select:none;'
const card = document.createElement('div')
card.textContent = 'Pinch me'
card.style.cssText = 'padding:24px 32px;background:#6366f1;color:white;border-radius:12px;font-weight:600;'
stage.appendChild(card)
document.body.appendChild(stage)

const output = document.createElement('pre')
document.body.appendChild(output)

let x = 0
let y = 0
createPinchGesture(stage, {
  onMove: ({ scale, rotation, deltaCentroid }) => {
    x += deltaCentroid.x
    y += deltaCentroid.y
    card.style.transform = \`translate(\${x}px, \${y}px) scale(\${scale}) rotate(\${rotation}rad)\`
    output.textContent = \`scale: \${scale.toFixed(2)} rotation: \${(rotation * 57.3).toFixed(0)}\u00b0\`
  },
  onEnd: ({ reason }) => {
    output.textContent = \`ended: \${reason}\`
  },
})

console.log('Pinch gesture ready')`,
  name: 'createPinchGesture - Basic',
};
