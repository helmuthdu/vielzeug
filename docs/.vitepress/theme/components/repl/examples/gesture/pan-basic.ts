export const panBasicExample = {
  code: `import { createPanGesture } from '@vielzeug/gesture'

const surface = document.createElement('div')
surface.textContent = 'Drag horizontally'
surface.style.cssText = 'width:240px;padding:32px;text-align:center;background:#e0e7ff;border-radius:12px;touch-action:pan-y;user-select:none;'
document.body.appendChild(surface)

const output = document.createElement('pre')
document.body.appendChild(output)

const pan = createPanGesture(surface, {
  axis: 'x',
  onMove: ({ distance }) => {
    surface.style.transform = \`translateX(\${distance}px)\`
    output.textContent = \`distance: \${Math.round(distance)}px\`
  },
  onEnd: ({ distance, reason }) => {
    surface.style.transform = ''
    output.textContent = reason === 'release' && Math.abs(distance) >= 48
      ? \`swipe: \${distance < 0 ? 'left' : 'right'}\`
      : \`ended: \${reason}\`
  },
})

console.log('Pan gesture ready:', pan.disposed === false)`,
  name: 'createPanGesture - Basic',
};
