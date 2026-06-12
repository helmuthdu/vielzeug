import { vi } from 'vitest';

globalThis.window.URL.createObjectURL = vi.fn();
