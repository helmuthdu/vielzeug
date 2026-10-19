import { REQUEST_MARKER_HEADER } from '../contract';
import { noStore } from '../worker/http';
import { LINK_TTL_MS } from './store';

export const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

const scriptValue = (value: string): string =>
  JSON.stringify(value).replace(
    /[<>&\u2028\u2029]/g,
    (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`,
  );

export function confirmationPage({
  appName,
  nonce,
  publicOrigin,
  token,
}: {
  appName: string;
  nonce: string;
  publicOrigin: string;
  token: string | null;
}): Response {
  const valid = token !== null;
  const title = valid ? 'Confirm sign-in' : 'This sign-in link is not valid';
  const script = valid
    ? `
const button = document.getElementById('confirm');
const status = document.getElementById('status');
const recovery = document.getElementById('recovery');
let pending = false;
let terminal = false;
let disposed = false;
let cooldown;
let timeout;
let controller;
let retryAt = 0;
const announce = (message) => { status.textContent = message; };
const ready = () => {
  button.disabled = false;
  button.textContent = 'Try again';
};
const stop = () => {
  clearTimeout(cooldown);
  clearTimeout(timeout);
  controller?.abort();
  controller = undefined;
};
const tick = () => {
  if (disposed) return;
  const seconds = Math.max(0, Math.ceil((retryAt - Date.now()) / 1000));
  if (seconds === 0) {
    ready();
    announce('You can try signing in again now.');
    return;
  }
  button.textContent = 'Try again in ' + seconds + 's';
  cooldown = setTimeout(tick, 1000);
};
const recover = (message) => {
  announce(message);
  recovery.hidden = false;
  document.getElementById('exit').hidden = true;
};
button.hidden = false;
button.focus();
addEventListener('pagehide', () => {
  disposed = true;
  stop();
});
addEventListener('pageshow', (event) => {
  if (!event.persisted || !disposed) return;
  disposed = false;
  pending = false;
  document.getElementById('actions').removeAttribute('aria-busy');
  if (terminal) return;
  if (retryAt > Date.now()) tick();
  else {
    ready();
    announce('Confirm sign-in when you are ready.');
  }
});
button.addEventListener('click', async () => {
  if (disposed || pending || terminal || retryAt > Date.now()) return;
  pending = true;
  button.disabled = true;
  button.textContent = 'Signing you in';
  document.getElementById('actions').setAttribute('aria-busy', 'true');
  announce('Signing you in. Please wait.');
  const active = new AbortController();
  controller = active;
  let timedOut = false;
  const requestTimeout = setTimeout(() => {
    timedOut = true;
    active.abort();
  }, 15000);
  timeout = requestTimeout;
  try {
    const response = await fetch('/api/v1/auth/verify', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json', '${REQUEST_MARKER_HEADER}': '1' },
      body: JSON.stringify({ token: ${scriptValue(token ?? '')} }),
      signal: active.signal,
      redirect: 'error',
      referrerPolicy: 'no-referrer'
    });
    void response.body?.cancel().catch(() => {});
    if (disposed || controller !== active) return;
    if (response.status === 204) {
      terminal = true;
      button.textContent = 'Signed in';
      announce('You are signed in. Continuing to the app.');
      location.replace(${scriptValue(`${publicOrigin}/signed-in`)});
    } else if (response.status === 410 || response.status === 400) {
      terminal = true;
      button.hidden = true;
      recovery.setAttribute('class', 'primary');
      recover(response.status === 410
        ? 'This link has expired or was already used. Request a new sign-in link.'
        : 'This sign-in link is not valid. Request a new sign-in link.');
      recovery.focus();
    } else if (response.status === 429) {
      const value = response.headers.get('retry-after');
      const httpDate = /^(?:(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun), (?:0[1-9]|[12]\\d|3[01]) (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \\d{4} (?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d GMT|(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday), (?:0[1-9]|[12]\\d|3[01])-(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-\\d{2} (?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d GMT|(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun) (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (?: [1-9]|[12]\\d|3[01]) (?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d \\d{4})$/;
      // HTTP dates are always GMT; bare asctime forms need the suffix or Date.parse reads them as local time.
      const seconds = value && /^\\d+$/.test(value)
        ? Number(value)
        : (value && httpDate.test(value)
            ? (Date.parse(value.endsWith('GMT') ? value : value + ' GMT') - Date.now()) / 1000
            : NaN);
      const wait = Number.isFinite(seconds) ? Math.min(300, Math.max(1, Math.ceil(seconds))) : 30;
      retryAt = Date.now() + wait * 1000;
      recover('Too many attempts. Wait ' + wait + ' seconds before trying again.');
      tick();
    } else if (response.status === 503) {
      recover('Sign-in is temporarily unavailable. Try again shortly, or request a new sign-in link.');
      ready();
    } else {
      recover('Sign-in could not be completed. Try again, or request a new sign-in link.');
      ready();
    }
  } catch {
    if (!disposed && controller === active) {
      recover(timedOut
        ? 'Sign-in took too long. Try again, or request a new sign-in link.'
        : 'Unable to connect. Check your connection and try again, or request a new sign-in link.');
      ready();
    }
  } finally {
    active.abort();
    clearTimeout(requestTimeout);
    if (!disposed && controller === active) {
      controller = undefined;
      pending = false;
      document.getElementById('actions').removeAttribute('aria-busy');
    }
  }
});`
    : '';
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="referrer" content="no-referrer">
<title>${escapeHtml(title)} | ${escapeHtml(appName)}</title>
<script nonce="${nonce}">history.replaceState(null, '', location.pathname);</script>
<style nonce="${nonce}">
:root { color-scheme: light dark; --paper: #fcfbf9; --ink: #302d2b; --muted: #68615c; --accent: #934b2b; --hover: #783a20; --rule: #d6d0ca; --focus: #934b2b; }
* { box-sizing: border-box; }
body { margin: 0; background: var(--paper); color: var(--ink); font: 1rem/1.6 'Avenir Next', 'Segoe UI', sans-serif; letter-spacing: 0; }
main { width: min(100%, 38rem); margin: 0 auto; padding: 5rem 1.5rem 3rem; }
h1 { margin: 0 0 1.5rem; font-family: 'Iowan Old Style', 'Palatino Linotype', 'Book Antiqua', Palatino, serif; font-size: 2.25rem; line-height: 1.2; font-weight: 500; overflow-wrap: anywhere; text-wrap: balance; }
p { margin: 0 0 1rem; }
.detail { color: var(--muted); }
.actions { margin-top: 2rem; display: flex; flex-wrap: wrap; gap: 1rem; align-items: center; }
button, .primary { min-height: 44px; max-width: 100%; padding: .75rem 1.25rem; border: 1px solid var(--accent); border-radius: 4px; background: var(--accent); color: #fff; font: inherit; font-weight: 600; text-align: center; text-decoration: none; overflow-wrap: anywhere; cursor: pointer; transition: background-color 120ms ease-out; }
button { min-width: 12rem; }
button:hover:not(:disabled), .primary:hover { background: var(--hover); }
button:disabled { cursor: wait; opacity: .75; }
a { color: var(--accent); text-underline-offset: .2em; overflow-wrap: anywhere; }
a:not(.primary) { display: inline-flex; align-items: center; min-height: 44px; }
:focus-visible { outline: 3px solid var(--focus); outline-offset: 4px; }
::selection { background: var(--accent); color: #fff; }
#status { min-height: 3.2em; margin-top: 1.5rem; }
footer { margin-top: 2rem; padding-top: 1rem; border-top: 1px solid var(--rule); }
[hidden] { display: none !important; }
@media (prefers-color-scheme: dark) { :root { --paper: #242220; --ink: #f2efeb; --muted: #bfb7b0; --accent: #e0a07b; --hover: #efb998; --rule: #504942; --focus: #e0a07b; } button, .primary { color: #242220; } ::selection { color: #242220; } }
@media (max-width: 480px) { main { padding: 3rem 1.25rem 2rem; } h1 { font-size: 2rem; } .actions { align-items: stretch; flex-direction: column; } }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { transition: none !important; } }
</style>
</head>
<body>
<main id="main" aria-labelledby="title">
<h1 id="title" tabindex="-1">${valid ? `Sign in to ${escapeHtml(appName)}` : escapeHtml(title)}</h1>
<p>${valid ? 'Continue only if you requested this sign-in link.' : `Request a new sign-in link for ${escapeHtml(appName)}.`}</p>
${valid ? `<p class="detail">This link works once and expires ${LINK_TTL_MS / 60_000} minutes after it was requested.</p>` : ''}
<div class="actions" id="actions">
${valid ? '<button type="button" id="confirm" hidden>Confirm sign-in</button>' : ''}
<a${valid ? '' : ' class="primary"'} id="recovery" href="${escapeHtml(`${publicOrigin}/account`)}"${valid ? ' hidden' : ''}>Request a new sign-in link</a>
</div>
<p role="status" aria-live="polite" aria-atomic="true" id="status"></p>
${valid ? `<noscript><p>JavaScript is required to confirm this sign-in. No sign-in has been completed. <a href="${escapeHtml(`${publicOrigin}/account`)}">Request a new sign-in link</a>.</p></noscript>` : ''}
${valid ? `<footer id="exit"><a href="${escapeHtml(`${publicOrigin}/`)}">Back to app</a></footer>` : ''}
</main>
${
  valid
    ? `<script nonce="${nonce}">${script}
</script>`
    : ''
}
</body>
</html>`;
  return new Response(html, {
    headers: {
      ...noStore,
      'content-security-policy': `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`,
      'content-type': 'text/html; charset=utf-8',
      'referrer-policy': 'no-referrer',
      'x-content-type-options': 'nosniff',
    },
    status: valid ? 200 : 400,
  });
}
