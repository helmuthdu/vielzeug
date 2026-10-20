export const coachmarkExample = {
  code: `import { createCoachmark } from '@vielzeug/beacon'

const button = document.createElement('button')
button.textContent = 'Share'
button.dataset.tour = 'share'
document.body.appendChild(button)

const hint = createCoachmark({
  autoShow: false,
  description: 'Send a link that opens straight into this view.',
  id: 'share-hint',
  target: '[data-tour="share"]',
  title: 'Share this board',
})

hint.tap((event) => console.log('event:', event.type))

// current is the single-step snapshot: step is the hint while visible, null while hidden.
hint.current.subscribe(() => console.log('visible:', hint.current.value.step !== null))

hint.show()
console.log('rect anchored to button:', JSON.stringify(hint.current.value.rect))

// hide() can come back; dismiss() records it as seen.
hint.hide()
hint.show()
hint.dismiss()

// Once dismissed, show() is a no-op until reset() or a version bump.
hint.show()
console.log('eligible after dismiss:', hint.eligible.value)

hint.reset()
console.log('eligible after reset:', hint.eligible.value)`,
  name: 'Coachmark - Show Once, Dismiss, Reset',
};
