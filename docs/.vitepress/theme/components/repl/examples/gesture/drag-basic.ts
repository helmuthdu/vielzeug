export const dragBasicExample = {
  code: `import { createDragGesture } from '@vielzeug/gesture'

const surface = document.createElement('div')
surface.textContent = 'Drag freely'
surface.style.cssText = 'width:160px;padding:32px;text-align:center;background:#dcfce7;border-radius:12px;touch-action:none;user-select:none;'
document.body.appendChild(surface)

const drag = createDragGesture(surface, {
  onMove: ({ delta }) => {
    surface.style.translate = \`\${delta.x}px \${delta.y}px\`
  },
  onEnd: () => {
    surface.style.translate = ''
  },
})

console.log('Drag gesture ready:', drag.disposed === false)`,
  name: 'createDragGesture - Basic',
};
