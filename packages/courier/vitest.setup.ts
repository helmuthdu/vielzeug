import { Scheduler } from '@vielzeug/arsenal';

globalThis.window.URL.createObjectURL = () => '';

new Scheduler();
