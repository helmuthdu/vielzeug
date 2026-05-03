export const onceAndWaitExample = {
  code: "import { createBus } from '@vielzeug/eventit'\n\n\nconst bus = createBus()\n\n// Subscribe once — auto-removes after first emit\nbus.once('data:ready', (payload) => {\n  console.log('Data arrived (once):', payload.items)\n})\n\nbus.emit('data:ready', { items: ['alpha', 'beta', 'gamma'] })\nbus.emit('data:ready', { items: ['will not fire once listener'] })\n\n// Await the next emit\nasync function waitForTask() {\n  console.log('Waiting for task to complete...')\n  const result = await bus.wait('task:done')\n  console.log('Task done! Result:', result.result)\n}\n\nwaitForTask()\n\n// Simulate task completing after a delay\nsetTimeout(() => {\n  bus.emit('task:done', { result: 99 })\n}, 50)",
  name: 'once() and wait()',
};
