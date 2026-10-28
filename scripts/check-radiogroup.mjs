/**
 * Verificación de accesibilidad del selector de entrega (radiogroup) con
 * teclado real vía Chrome DevTools Protocol.
 *
 * Uso: node scripts/check-radiogroup.mjs <url>
 */
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const url = process.argv[2];
if (!url) {
  console.error('Uso: node scripts/check-radiogroup.mjs <url>');
  process.exit(1);
}

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const port = 9800 + Math.floor(Math.random() * 300);
const profile = mkdtempSync(join(tmpdir(), 'cdp-a11y-'));

const chrome = spawn(CHROME, [
  '--headless=new',
  '--disable-gpu',
  '--hide-scrollbars',
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${profile}`,
  '--window-size=390,844',
  'about:blank',
]);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getWsUrl() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      const json = await res.json();
      if (json.webSocketDebuggerUrl) return json.webSocketDebuggerUrl;
    } catch {}
    await sleep(250);
  }
  throw new Error('No se pudo conectar con Chrome');
}

const ws = new WebSocket(await getWsUrl());
await new Promise((r) => (ws.onopen = r));

let id = 0;
const pending = new Map();
ws.onmessage = (e) => {
  const msg = JSON.parse(e.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
  }
};
function send(method, params = {}, sessionId) {
  const msgId = ++id;
  return new Promise((resolve, reject) => {
    pending.set(msgId, (m) => (m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result)));
    ws.send(JSON.stringify({ id: msgId, method, params, ...(sessionId ? { sessionId } : {}) }));
  });
}

const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
await send('Page.enable', {}, sessionId);
await send('Runtime.enable', {}, sessionId);

await send('Page.addScriptToEvaluateOnNewDocument', {
  source: `(() => { try {
    localStorage.setItem('nutrifit:cart', JSON.stringify([{
      key: 'demo-1', productId: 1, slug: 'demo', name: 'FullEnergic 100% Whey Protein 1kg',
      price: 27500, oldPrice: 32000, discount: 4500, image: '/img/producto1.webp',
      quantity: 1, variant: 'Vainilla'
    }]));
  } catch (e) {} })()`,
}, sessionId);

await send('Page.navigate', { url }, sessionId);
await sleep(3500);

// Abre el carrito
await send('Runtime.evaluate', {
  expression: `(() => {
    const b = [...document.querySelectorAll('button,a')].find(x => /carrito/i.test((x.getAttribute('aria-label')||'')+' '+(x.textContent||'')));
    if (b) { b.click(); return 'ok'; } return 'no';
  })()`,
}, sessionId);
await sleep(1500);

const readState = async (label) => {
  const r = await send('Runtime.evaluate', {
    expression: `(() => {
      const radios = [...document.querySelectorAll('[role="radio"]')];
      return JSON.stringify({
        checked: radios.map(x => x.getAttribute('aria-checked')),
        tabindex: radios.map(x => x.getAttribute('tabindex')),
        focused: document.activeElement?.getAttribute('role') === 'radio'
          ? document.activeElement.textContent.trim().slice(0,20) : null,
        activeIsRadio: document.activeElement?.getAttribute('role') === 'radio',
        hasCheckIcon: !!radios.find(x => x.getAttribute('aria-checked')==='true' && x.querySelector('svg')),
      });
    })()`,
    returnByValue: true,
  }, sessionId);
  console.log(label, r.result.value);
};

await readState('inicial:');

// Tab hasta el primer radio y prueba flechas
await send('Runtime.evaluate', {
  expression: `(() => {
    const r = document.querySelector('[role="radio"][aria-checked="true"]');
    if (r) r.focus();
    return 'focused';
  })()`,
}, sessionId);
await sleep(300);

for (const key of ['ArrowRight', 'ArrowRight', 'ArrowLeft', 'End', 'Home']) {
  await send('Input.dispatchKeyEvent', {
    type: 'rawKeyDown', key, code: key, windowsVirtualKeyCode: key === 'End' ? 35 : key === 'Home' ? 36 : 39,
  }, sessionId);
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code: key }, sessionId);
  await sleep(350);
  await readState(`tras ${key}:`);
}

ws.close();
chrome.kill();
process.exit(0);
