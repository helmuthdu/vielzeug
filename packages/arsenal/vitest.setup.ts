import { vi } from 'vitest';

import { Scheduler } from './src/async/scheduler';

globalThis.window.URL.createObjectURL = vi.fn();

new Scheduler();
