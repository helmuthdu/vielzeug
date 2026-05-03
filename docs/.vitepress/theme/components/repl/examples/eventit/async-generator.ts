export const asyncGeneratorExample = {
  code: "import { createBus } from '@vielzeug/eventit'\n\n\nconst bus = createBus()\n\n// Consume events\nasync function consumeTicks() {\n  let received = 0\n  for await (const tick of bus.events('tick')) {\n    console.log('Tick:', tick)\n    received++\n    if (received >= 3) break  // stop after 3 ticks\n  }\n  console.log('Done consuming ticks')\n}\n\nconsumeTicks()\n\n// Emit several ticks\nlet count = 0\nconst interval = setInterval(() => {\n  bus.emit('tick', ++count)\n  if (count >= 5) clearInterval(interval)\n}, 30)",
  name: 'events() - Async Generator',
};
