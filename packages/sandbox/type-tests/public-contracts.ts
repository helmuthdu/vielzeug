import { createSandbox, type SandboxBridge, type SandboxMessage, type SandboxOptions } from '../src/index.js';

interface AppState {
  locale: string;
  theme: 'dark' | 'light';
}

interface AppEvents {
  'button:click': { label: string };
  ready: undefined;
}

declare const bridge: SandboxBridge<AppState, AppEvents>;
declare const container: HTMLElement;
declare const options: SandboxOptions;

const sandbox = createSandbox<AppState>(container, options);

sandbox.setState({ locale: 'en', theme: 'dark' });
sandbox.onMessage((message: SandboxMessage) => {
  if (message.type === 'custom') {
    const detail: unknown = message.detail;

    void detail;
  }
});
bridge.emit('button:click', { label: 'Save' });
bridge.emit('ready');
bridge.onState('theme', (theme) => {
  const value: 'dark' | 'light' = theme;

  void value;
});

// @ts-expect-error invalid state value
sandbox.setState({ theme: 'system' });
// @ts-expect-error custom event detail remains untrusted on the host
sandbox.onMessage((message) => message.type === 'custom' && message.detail.label);
// @ts-expect-error invalid event detail
bridge.emit('button:click', { label: 1 });
// @ts-expect-error event requires detail
bridge.emit('button:click');
