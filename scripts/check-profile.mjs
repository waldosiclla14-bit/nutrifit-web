/**
 * Verificación de la persistencia del perfil del cliente entre compras.
 * Comprueba que getCustomerProfile() devuelve los datos de la modalidad de
 * entrega (bug corregido: la lectura descartaba los campos nuevos).
 *
 * Uso: node scripts/check-profile.mjs <url>
 */
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const url = process.argv[2];
if (!url) {
  console.error('Uso: node scripts/check-profile.mjs <url>');
  process.exit(1);
}

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const port = 9500 + Math.floor(Math.random() * 300);
const profile = mkdtempSync(join(tmpdir(), 'cdp-profile-'));

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
    localStorage.setItem('nutrifit:customer:v1', JSON.stringify({
      name: 'Ana Pérez', phone: '912345678',
      deliveryMethod: 'domicilio', address: 'Av. Siempre Viva 742', comuna: 'Ñuñoa',
      blueSize: 'M', metroLine: '3', metroStation: 'Los Leones'
    }));
  } catch (e) {} })()`,
}, sessionId);

await send('Page.navigate', { url }, sessionId);
await sleep(3500);

await send('Runtime.evaluate', {
  expression: `(() => {
    const b = [...document.querySelectorAll('button,a')].find(x => /carrito/i.test((x.getAttribute('aria-label')||'')+' '+(x.textContent||'')));
    if (b) b.click();
    return 'ok';
  })()`,
}, sessionId);
await sleep(1800);

const r = await send('Runtime.evaluate', {
  expression: `(() => {
    const inputs = [...document.querySelectorAll('aside input, aside select')];
    const val = (label) => {
      const el = inputs.find(i => (i.getAttribute('aria-label')||i.placeholder||'') === label);
      return el ? el.value : null;
    };
    const radios = [...document.querySelectorAll('[role="radio"]')];
    return JSON.stringify({
      nombre: val('Nombre completo'),
      telefono: val('Teléfono'),
      domicilioChecked: radios.find(x=>/domicilio/i.test(x.textContent))?.getAttribute('aria-checked'),
      direccion: val('Dirección de envío'),
      comuna: val('Comuna'),
      talla: val('Tamaño del paquete'),
      hayLineaMetro: !!val('Línea de Metro'),
    });
  })()`,
  returnByValue: true,
}, sessionId);
console.log('perfil precargado:', r.result.value);

ws.close();
chrome.kill();
process.exit(0);
