export const tourBasicsExample = {
  code: `import { createTour } from '@vielzeug/beacon'

// A tiny stage so the tour has something real to anchor to.
const stage = document.createElement('div')
stage.innerHTML = '<button data-tour="nav" style="margin:24px">Navigation</button><button data-tour="share" style="margin:24px">Share</button>'
document.body.appendChild(stage)

const tour = createTour({
  autoScroll: false, // jsdom has no real scrolling
  id: 'repl-tour',
  steps: [
    { id: 'welcome', title: 'Welcome' },
    { id: 'nav', target: '[data-tour="nav"]', title: 'Navigation' },
    { id: 'share', target: '[data-tour="share"]', title: 'Share' },
  ],
  targetTimeoutMs: 0,
})

// Readable<T>: the listener takes no arguments, read .value inside.
tour.current.subscribe(() => {
  const current = tour.current.value
  if (!current.step) return
  console.log('Step ' + (current.stepIndex + 1) + ' of ' + current.totalSteps + ': ' + current.step.title)
  console.log('  anchor rect:', current.rect === null ? 'null (centered)' : JSON.stringify(current.rect))
})

tour.tap((event) => {
  if (event.type === 'tour:complete') console.log('Tour complete, reason:', event.reason)
})

tour.start()
tour.next()
tour.next()
tour.next() // past the last step finishes the tour

console.log('status:', tour.status.value)`,
  name: 'Tour Basics - Steps, Rects, Completion',
};
