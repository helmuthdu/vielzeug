/**
 * Testing utilities for Pulse
 *
 * ⚠️ Requires a browser-like environment (browser / jsdom / happy-dom) for the
 * `CloseEvent`/`MessageEvent` globals the socket dispatches.
 *
 * This is the package's only public testing entry point.
 */

export { frames, MockWebSocket, type MockWebSocketOptions } from './mock-websocket';
