export const restoreFocusExample = {
  code: `import { captureFocus } from '@vielzeug/focus'

const trigger = document.createElement('button')
trigger.textContent = 'Open dialog'

const dialogButton = document.createElement('button')
dialogButton.textContent = 'Close dialog'

document.body.append(trigger, dialogButton)
trigger.focus()

const restore = captureFocus()
dialogButton.focus()

console.log(restore()) // true
console.log(document.activeElement === trigger) // true
console.log(restore()) // false: restorers are one-shot`,
  name: 'Restore Captured Focus',
};
