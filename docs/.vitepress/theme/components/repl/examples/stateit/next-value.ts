export const nextValueExample = {
  code: "import { signal, nextValue } from '@vielzeug/stateit'\n\nconst status = signal('idle')\n\n// nextValue: wait for the next emission that satisfies the predicate\nconst waitForDone = nextValue(status, (v) => v === 'done')\n\n// Simulate async state transitions\nsetTimeout(() => { status.value = 'loading'; console.log('→ loading') }, 100)\nsetTimeout(() => { status.value = 'done'; console.log('→ done') }, 300)\n\nconst finalStatus = await waitForDone\nconsole.log('Resolved to:', finalStatus)\n\n// Without predicate — resolves on next emission\nconst counter = signal(0)\nconst next = nextValue(counter)\ncounter.value = 42\nconsole.log('Next value:', await next)",
  name: 'nextValue - Await Signal Change',
};
