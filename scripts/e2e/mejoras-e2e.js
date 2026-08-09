const puppeteer = require('puppeteer-core');

const CHROME =
  process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = process.env.BASE || 'http://localhost:3111';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-popup-blocking'],
  });
  const results = [];
  const check = (label, actual, expected) => {
    const ok = String(actual) === String(expected);
    results.push({ label, actual: String(actual), expected: String(expected), ok });
    console.log(`${ok ? 'OK  ' : 'FAIL'} | ${label.padEnd(46)} | esperado: ${expected} | actual: ${actual}`);
  };

  const ctx = await browser.createBrowserContext();

  // HOME desktop
  const page = await ctx.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle2', timeout: 60000 });
  await sleep(1500);

  const body = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));

  // Item 2: TrustStrip
  check('trust: "Entrega mismo día"', /Entrega mismo d/i.test(body), true);
  check('trust: "+140 estaciones"', /\+140 estaciones/.test(body), true);
  check('trust: "Envío gratis" / $30.000', /sobre \$30\.000/.test(body), true);
  check('trust: "100% originales"', /100% originales/.test(body), true);

  // Item 4: TrackOrderChip
  check('track: "¿Dónde está mi pedido?"', /¿Dónde está mi pedido\?/i.test(body), true);

  // Item 3: Más vendidos grid
  const grid = await page.evaluate(() => {
    const sec = document.querySelector('#destacados');
    if (!sec) return { present: false, cards: 0, waButtons: 0, help: false };
    const hrefs = new Set(
      Array.from(sec.querySelectorAll('a[href^="/productos/"]')).map((a) => a.getAttribute('href')),
    );
    const wa = Array.from(sec.querySelectorAll('button[aria-label^="Pedir"]'));
    return {
      present: true,
      cards: hrefs.size,
      waButtons: wa.length,
      help: /no sabes cu[aá]l elegir/i.test(sec.innerText),
    };
  });
  check('destacados: sección presente', grid.present, true);
  check('destacados: 4 tarjetas de producto', grid.cards, 4);
  check('destacados: 4 botones WhatsApp', grid.waButtons, 4);
  check('destacados: CTA asesoría', grid.help, true);

  await page.click('#destacados button[aria-label^="Pedir"]');
  await sleep(3000);
  const waPages = (await browser.pages()).map((p) => p.url());
  const waMatch = waPages.find((u) => u.includes('phone=56923883826'));
  check('destacados: wa.me correcto', !!waMatch, true);

  // Item 13: canonical + JSON-LD
  const homeCanonical = await page.evaluate(
    () => document.querySelector('link[rel="canonical"]')?.href || '',
  );
  check('seo: canonical home', new URL(homeCanonical).pathname, '/');
  const ld = await page.evaluate(() =>
    Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map((s) =>
      JSON.parse(s.textContent || '{}'),
    ),
  );
  const hasType = (type) =>
    ld.some((o) => {
      const list = Array.isArray(o['@graph']) ? o['@graph'] : [o];
      return list.some((n) => n['@type'] === type);
    });
  check('seo: JSON-LD Store', hasType('Store'), true);
  check('seo: JSON-LD WebSite', hasType('WebSite'), true);

  // Item 11-12: fonts self-hosted + logo optimizado + hero eager
  const extFonts = await page.evaluate(() =>
    Array.from(document.querySelectorAll('link[rel="stylesheet"]')).some((l) =>
      (l.href || '').includes('fonts.googleapis'),
    ),
  );
  check('perf: sin CSS externo de Google Fonts', extFonts, false);
  const heroImg = await page.evaluate(() => {
    const img = Array.from(document.querySelectorAll('section img')).find((i) =>
      (i.src || '').includes('producto1'),
    );
    const fontPreload = document.querySelectorAll('link[rel="preload"][as="font"]').length;
    return { loading: img ? img.getAttribute('loading') : null, fontPreload };
  });
  check('perf: hero img eager (no lazy)', heroImg.loading === null || heroImg.loading === 'eager', true);
  check('perf: fuentes woff2 preloaded', heroImg.fontPreload >= 2, true);
  const logo = await page.evaluate(() => document.querySelector('header img')?.src || '');
  check('perf: logo vía next/image', logo.includes('_next/image'), true);

  // Item 1: modal 5% OFF (sesión limpia)
  const modalPage = await ctx.newPage();
  await modalPage.setViewport({ width: 390, height: 844 });
  await modalPage.goto(`${BASE}/`, { waitUntil: 'networkidle2', timeout: 60000 });
  await sleep(6000);
  const modal = await modalPage.evaluate(() => {
    const dlg = document.querySelector('[role="dialog"][aria-label*="5% OFF"]');
    if (!dlg) return { shown: false, coupon: false, close: false };
    return {
      shown: true,
      coupon: /NUTRIFIT5/.test(dlg.innerText),
      close: !!dlg.querySelector('button[aria-label="Cerrar"]'),
      cta: /Quiero mi 5% OFF/.test(dlg.innerText),
    };
  });
  check('oferta: modal 5% OFF visible', modal.shown, true);
  check('oferta: cupón NUTRIFIT5', modal.coupon, true);
  check('oferta: botón cerrar', modal.close, true);
  check('oferta: CTA WhatsApp', modal.cta, true);

  // a11y: sin overflow horizontal en móvil
  const overflow = await modalPage.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth,
  );
  check('móvil: sin overflow horizontal', overflow, true);

  // canónica productos
  await page.goto(`${BASE}/productos`, { waitUntil: 'networkidle2', timeout: 60000 });
  const prodCanonical = await page.evaluate(
    () => document.querySelector('link[rel="canonical"]')?.href || '',
  );
  check('seo: canonical /productos', new URL(prodCanonical).pathname, '/productos');

  await ctx.close();
  await browser.close();

  const fails = results.filter((r) => !r.ok).length;
  console.log(
    `\nRESULTADO: ${results.length - fails}/${results.length} PASS${fails ? ` | ${fails} FAIL` : ' | TODO OK'}`,
  );
  process.exit(fails ? 1 : 0);
}

main().catch((e) => {
  console.error('E2E ERROR', e);
  process.exit(1);
});
