# @vielzeug/tavern

> Table sessions over mesh — host-owned state replication with guest command forwarding

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
  commands: {
    apply: (name, args) => myStore.apply(name, args),
    has: (name) => name in myStore,
  },
  subjectId: 'doc-1',
  subjects: {
    onChanged: (listener) => myStore.onUpdated('doc-1', listener),
    onRemoved: (listener) => myStore.onRemoved('doc-1', listener),
    snapshot: () => myStore.read('doc-1'),
  },
});

const invitation = await host.createInvitationText();
const { answerText, guest } = await joinTavern({
  invitationText: invitation,
  mount: (snapshot) => parseAndMount(snapshot),
  name: 'Alex',
});
await host.acceptAnswerText(answerText);

guest.sendCommand('doc-1', 'rename', ['Quarterly report']);
```

## Documentation

- [Overview](https://vielzeug.dev/tavern/)
- [Usage Guide](https://vielzeug.dev/tavern/usage)
- [API Reference](https://vielzeug.dev/tavern/api)
- [Examples](https://vielzeug.dev/tavern/examples)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
