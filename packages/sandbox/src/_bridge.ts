import type { BridgeBootstrap } from './_protocol.js';

export function buildBridgeScript(bootstrap: BridgeBootstrap): string {
  const channel = JSON.stringify(bootstrap.channel);
  const generation = String(bootstrap.generation);

  return `
window.__sandboxChannel = ${channel};
window.__sandboxGeneration = ${generation};
const __sandboxChannel = window.__sandboxChannel;
const __sandboxGeneration = window.__sandboxGeneration;
if ('ontouchstart' in window) document.addEventListener('touchstart', function() {}, { passive: true });
window.addEventListener('message', function(e) {
  var msg = e.data;
  if (e.source !== parent || !msg || msg.channel !== __sandboxChannel || msg.generation !== __sandboxGeneration) return;
  if (msg.type === 'state-update') {
    document.dispatchEvent(new CustomEvent('sandbox:state-update', { detail: { key: msg.key, value: msg.value } }));
  }
  if (msg.type === 'state-update-all' && msg.record && typeof msg.record === 'object') {
    var keys = Object.keys(msg.record);
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      document.dispatchEvent(new CustomEvent('sandbox:state-update', { detail: { key: k, value: msg.record[k] } }));
    }
  }
  if (msg.type === 'style-patch' && msg.id && typeof msg.css === 'string') {
    var el = document.getElementById(msg.id);
    if (el && el.tagName === 'STYLE') el.textContent = msg.css;
  }
  if (msg.type === 'html-replace' && typeof msg.html === 'string') {
    document.body.innerHTML = msg.html;
  }
});
function post(msg) {
  msg.channel = __sandboxChannel;
  msg.generation = __sandboxGeneration;
  parent.postMessage(msg, '*');
}
window.onerror = function(message, _src, _line, _col, err) {
  post({ type: 'error', message: String(message), stack: err && err.stack });
  return true;
};
window.addEventListener('unhandledrejection', function(e) {
  var reason = e.reason;
  post({ type: 'error', message: String(reason), stack: reason && reason.stack });
});
window.__sandbox__ = {
  emit: function(event, detail) {
    post({ type: 'custom', event: String(event), detail: detail });
  },
  onState: function(key, handler) {
    function listener(e) {
      if (e.detail && e.detail.key === key) handler(e.detail.value);
    }
    document.addEventListener('sandbox:state-update', listener);
    return function() {
      document.removeEventListener('sandbox:state-update', listener);
    };
  }
};
post({ type: 'ready' });
if (typeof ResizeObserver !== 'undefined') {
  new ResizeObserver(function(entries) {
    var entry = entries[0];
    if (!entry) return;
    var h = entry.borderBoxSize && entry.borderBoxSize[0]
      ? entry.borderBoxSize[0].blockSize
      : entry.contentRect.height;
    post({ type: 'resize', height: h });
  }).observe(document.body);
}
`.trim();
}
