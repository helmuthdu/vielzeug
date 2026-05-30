export const onceAndWaitExample = {
  code: "import { createBus } from '/herald'\n\ntype AppEvents = {\n  'data:ready': { items: string[] }\n  'task:done': { result: number }\n}\n\nconst bus = createBus<AppEvents>()\n\nbus.once('data:ready', (payload) => {\n  console.log('Data arrived (once):', payload.items.join(', '))\n})\n\nbus.emit('data:ready', { items: ['alpha', 'beta', 'gamma'] })\nbus.emit('data:ready', { items: ['will not fire once listener'] })\n\nasync function waitForTask() {\n  console.log('Waiting for task to complete...')\n  const result = await bus.wait('task:done')\n  console.log('Task done! Result:', result.result)\n}\n\nvoid waitForTask()\n\nsetTimeout(() => {\n  bus.emit('task:done', { result: 99 })\n}, 50)",
  name: 'once() and wait()',
};
