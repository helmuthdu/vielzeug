export const keymapLayersExample = {
  code: `import { createKeymap, createKeymapLayer } from '@vielzeug/keymap'

// createKeymapLayer() scopes a second set of bindings on top of a base keymap —
// useful for modal UI. The caller mounts/disposes each independently.
const base = createKeymap({
  'ctrl+z': () => console.log('undo'),
})

const modal = createKeymapLayer(base, {
  escape: () => console.log('close modal'),
})

const unmountBase = base.mount(document)
const unmountModal = modal.mount(document)

document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))

// deactivate() suspends the layer without touching the base keymap.
modal.deactivate()
console.log('modal active:', modal.active)
document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })) // no longer logs

modal.activate()
console.log('modal.parent === base:', modal.parent === base)

unmountModal()
unmountBase()`,
  name: 'Keymap Layers',
};
