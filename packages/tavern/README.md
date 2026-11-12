# @vielzeug/tavern

> Table sessions over mesh: host-owned state replication with guest command forwarding

## Installation

```sh
pnpm add @vielzeug/tavern
npm install @vielzeug/tavern
yarn add @vielzeug/tavern
```

## Quick Start

```ts
import { hostTavern, joinTavern } from '@vielzeug/tavern';

const host = hostTavern({
  commands: { rename: (args) => myStore.rename(docId, args[0] as string) },
  subject: {
    onChanged: (listener) => myStore.onUpdated(docId, listener),
    onRemoved: (listener) => myStore.onRemoved(docId, listener),
    snapshot: () => myStore.read(docId),
  },
});

const invitationCode = await host.createInvitationCode();
const { answerCode, guest, ready } = await joinTavern({
  invitationCode,
  mount: (snapshot) => parseAndMount(snapshot),
  name: 'Alex',
});
await host.acceptAnswerCode(answerCode);
await ready; // the mirror is live

guest.sendCommand('rename', ['Quarterly report']);
```

## Documentation

- [Overview](https://vielzeug.dev/tavern/)
- [Usage Guide](https://vielzeug.dev/tavern/usage)
- [API Reference](https://vielzeug.dev/tavern/api)
- [Examples](https://vielzeug.dev/tavern/examples)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu): part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
