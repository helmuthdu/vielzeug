import { Scheduler } from '@vielzeug/toolkit';

globalThis.window.URL.createObjectURL = () => '';

new Scheduler();
