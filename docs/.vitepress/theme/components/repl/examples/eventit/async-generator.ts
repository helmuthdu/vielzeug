export const asyncGeneratorExample = {
  code: "import { createBus } from '@vielzeug/eventit'\n\ntype TickEvents = {\n  tick: number\n}\n\nconst bus = createBus<TickEvents>()\n\nasync function consumeTicks() {\n  let received = 0\n  for await (const tick of bus.events('tick', { maxBuffer: 2 })) {\n    console.log('Tick:', tick)\n    received++\n    if (received >= 3) break\n  }\n  console.log('Done consuming ticks')\n}\n\nvoid consumeTicks()\n\nlet count = 0\nconst interval = setInterval(() => {\n  bus.emit('tick', ++count)\n  if (count >= 5) clearInterval(interval)\n}, 30)",
  name: 'events() - Async Generator',
};
