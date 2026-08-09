const puppeteer = require('puppeteer-core');

const CHROME =
  process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = process.env.BASE || 'http://localhost:3111';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function measurePage(browser, url, viewport) {
  const page = await browser.newPage();
  await page.setViewport(viewport);
  await page.evaluateOnNewDocument(() => {
    window.__audit = { cls: 0 };
    try {
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) {
          if (!e.hadRecentInput) window.__audit.cls += e.value;
        }
      }).observe({ type: 'layout-shift', buffered: true });
    } catch {
      /* observer no disponible */
    }
  });
  const resp = await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
  await sleep(1500);
  const audit = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    const h1 = document.querySelector('h1');
    const heroFont = h1 ? getComputedStyle(h1).fontFamily : '';
    return {
      loadMs: Math.round(nav?.loadEventEnd || 0),
      domMs: Math.round(nav?.domContentLoadedEventEnd || 0),
      cls: window.__audit?.cls ?? 0,
      scrollW: document.documentElement.scrollWidth,
      innerW: window.innerWidth,
      heroFont,
    };
  });
  await page.close();
  return { url, ...audit, csp: resp.headers()['content-security-policy'] || '' };
}

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

  // CSP headers
  const home = await measurePage(browser, `${BASE}/`, { width: 390, height: 844 });
  check('csp: header presente', home.csp.length > 0, true);
  check('csp: font-src self (sin gstatic)', !home.csp.includes('fonts.gstatic.com'), true);
  check('csp: style-src sin googleapis', !home.csp.includes('fonts.googleapis.com'), true);
  check('csp: script-src self', /script-src 'self'/.test(home.csp), true);

  // Carga / CLS / fuente home móvil
  check('perf: loadEventEnd < 2.5s (390px)', home.loadMs > 0 && home.loadMs < 2500, true);
  check('perf: CLS < 0.1 (390px)', home.cls < 0.1, true);
  check('perf: fuente Anton aplicada al h1', /Anton/.test(home.heroFont), true);
  check('móvil 390: sin overflow home', home.scrollW <= home.innerW, true);

  // overflow en rutas clave a 360px
  const routes = ['/productos', '/productos/fullenergic-100-whey-protein-vainilla-1kg', '/blog', '/legal', '/favoritos'];
  for (const route of routes) {
    const r = await measurePage(browser, `${BASE}${route}`, { width: 360, height: 800 });
    check(`móvil 360: sin overflow ${route}`, r.scrollW <= r.innerW, true);
  }

  await browser.close();

  const fails = results.filter((r) => !r.ok).length;
  console.log(
    `\nRESULTADO: ${results.length - fails}/${results.length} PASS${fails ? ` | ${fails} FAIL` : ' | TODO OK'}`,
  );
  process.exit(fails ? 1 : 0);
}

main().catch((e) => {
  console.error('AUDIT ERROR', e);
  process.exit(1);
});
