/**
 * Captura del carrito abierto (drawer) vía Chrome DevTools Protocol.
 * Uso: node scripts/capture-cart.mjs <url> <salida.png> [ancho] [alto] [clickEntrega]
 *   clickEntrega: "domicilio" | "metro" | "" (solo abrir el drawer)
 */
import { spawn } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [, , url, out, w = '390', h = '844', mode = ''] = process.argv;
if (!url || !out) {
  console.error('Uso: node scripts/capture-cart.mjs <url> <salida.png> [ancho] [alto] [domicilio|metro]');
  process.exit(1);
}

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const port = 9222 + Math.floor(Math.random() * 500);
const profile = mkdtempSync(join(tmpdir(), 'cdp-'));

const chrome = spawn(CHROME, [
  '--headless=new',
  '--disable-gpu',
  '--hide-scrollbars',
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${profile}`,
  `--window-size=${w},${h}`,
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
const events = [];
ws.onmessage = (e) => {
  const msg = JSON.parse(e.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
  } else if (msg.method) {
    events.push(msg);
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
await send('Emulation.setDeviceMetricsOverride', {
  width: Number(w),
  height: Number(h),
  deviceScaleFactor: 1,
  mobile: Number(w) < 500,
}, sessionId);

// Inyecta un carrito con un producto antes de que monte la app:
// CartProvider lee localStorage al iniciar.
await send('Page.addScriptToEvaluateOnNewDocument', {
  source: `(() => {
    try {
      localStorage.setItem('nutrifit:cart', JSON.stringify([
        {
          key: 'demo-1', productId: 4, slug: 'demo', name: 'FullEnergic 100% Whey Protein 1kg',
          price: 27500, oldPrice: 32000, discount: 4500, image: '/img/producto1.webp',
          quantity: 1, variant: 'Vainilla'
        }
      ]));
    } catch (e) {}
  })()`,
}, sessionId);

await send('Page.navigate', { url }, sessionId);
await sleep(3500);

const addRes = await send('Runtime.evaluate', {
  expression: `(() => {
    const btns = [...document.querySelectorAll('button,a')];
    const add = btns.find(b => /agregar .* al carrito/i.test(b.getAttribute('aria-label') || ''))
      || btns.find(b => /agregar|añadir|comprar/i.test(b.textContent || ''));
    if (add) { add.click(); return 'added:' + (add.getAttribute('aria-label') || add.textContent).trim().slice(0,40); }
    return 'no-add';
  })()`,
  returnByValue: true,
}, sessionId);
console.log('add:', addRes.result.value);
await sleep(1200);

const cartRes = await send('Runtime.evaluate', {
  expression: `(() => {
    const btns = [...document.querySelectorAll('button,a')];
    const cart = btns.find(b => /carrito/i.test((b.getAttribute('aria-label') || '') + ' ' + (b.textContent || '')));
    if (cart) { cart.click(); return 'opened'; }
    return 'no-cart';
  })()`,
  returnByValue: true,
}, sessionId);
console.log('cart:', cartRes.result.value);
await sleep(1500);

if (mode) {
  const modeRes = await send('Runtime.evaluate', {
    expression: `(() => {
      const btns = [...document.querySelectorAll('[role="radio"],button')];
      const target = btns.find(b => /${mode}/i.test(b.textContent || ''));
      if (target) { target.click(); return 'clicked:' + target.textContent.trim().slice(0,40); }
      return 'no-mode';
    })()`,
    returnByValue: true,
  }, sessionId);
  console.log('mode:', modeRes.result.value);
  await sleep(1200);
}

const check = await send('Runtime.evaluate', {
  expression: `(() => {
    const asides = [...document.querySelectorAll('aside')];
    const drawer = asides.find(a => /Retiro en Metro|carrito vacío|Subtotal|Total/i.test(a.textContent || ''));
    const scope = drawer || document;
    const radios = [...scope.querySelectorAll('[role="radio"]')];
    const dom = radios.find(r => /domicilio/i.test(r.textContent || ''));
    return JSON.stringify({
      asides: asides.length,
      drawerFound: !!drawer,
      radios: radios.length,
      domicilioChecked: dom ? dom.getAttribute('aria-checked') : null,
      hasMetro: /Retiro en Metro/.test(scope.textContent || ''),
      hasDom: /domicilio/i.test(scope.textContent || ''),
      total: (scope.textContent || '').match(/Total.{0,20}/)?.[0] || null,
    });
  })()`,
  returnByValue: true,
}, sessionId);
console.log('check:', check.result.value);

const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }, sessionId);
writeFileSync(out, Buffer.from(shot.data, 'base64'));
console.log('OK ->', out);

ws.close();
chrome.kill();
process.exit(0);
