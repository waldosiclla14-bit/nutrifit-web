const puppeteer = require('puppeteer-core');
const axeSource = require('axe-core').source;

const CHROME =
  process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = process.env.BASE || 'http://localhost:3111';

const ROUTES = [
  '/',
  '/productos',
  '/productos/fullenergic-100-whey-protein-vainilla-1kg',
  '/blog',
  '/blog/que-proteina-elegir',
  '/legal',
  '/favoritos',
];

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

  let totalViolations = 0;

  for (const route of ROUTES) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle2', timeout: 60000 });
    await page.addScriptTag({ content: axeSource });
    const axe = await page.evaluate(async () => {
      const parseColor = (str) => {
        if (!str) return null;
        const m = str.match(/rgba?\(([^)]+)\)/);
        if (!m) return null;
        const nums = m[1].split(',').map((x) => parseFloat(x.trim()));
        return {
          r: nums[0],
          g: nums[1],
          b: nums[2],
          a: nums.length > 3 ? nums[3] : 1,
        };
      };
      const blend = (top, base) => {
        const a = top.a + base.a * (1 - top.a);
        if (a === 0) return { r: 0, g: 0, b: 0, a: 0 };
        return {
          r: (top.r * top.a + base.r * base.a * (1 - top.a)) / a,
          g: (top.g * top.a + base.g * base.a * (1 - top.a)) / a,
          b: (top.b * top.a + base.b * base.a * (1 - top.a)) / a,
          a,
        };
      };
      const lum = (c) => {
        const f = (v) => {
          const s = v / 255;
          return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
        };
        return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
      };
      const ratio = (a, b) => {
        const L1 = lum(a);
        const L2 = lum(b);
        return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
      };
      const realContrast = (el) => {
        const cs = getComputedStyle(el);
        const fg = parseColor(cs.color);
        if (!fg) return null;
        let bg = { r: 0, g: 0, b: 0, a: 0 };
        let cur = el;
        while (cur && cur !== document.documentElement) {
          const c = getComputedStyle(cur);
          if (c.backgroundImage !== 'none') return null;
          const b = parseColor(c.backgroundColor);
          if (b) {
            bg = blend(b, bg);
            if (bg.a >= 0.999) break;
          }
          cur = cur.parentElement;
        }
        if (bg.a < 0.999) bg = { r: 255, g: 255, b: 255, a: 1 };
        const solid = {
          r: fg.r * fg.a + bg.r * (1 - fg.a),
          g: fg.g * fg.a + bg.g * (1 - fg.a),
          b: fg.b * fg.a + bg.b * (1 - fg.a),
        };
        const size = parseFloat(cs.fontSize);
        const weight = parseInt(cs.fontWeight, 10);
        const large = size >= 24 || (size >= 18 && weight >= 700);
        return { value: ratio(solid, bg), threshold: large ? 3 : 4.5 };
      };

      const res = await window.axe.run(document, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
      });
      const violations = [];
      for (const v of res.violations) {
        if (v.id === 'color-contrast') {
          const kept = [];
          for (const node of v.nodes) {
            const el = node.target[0] ? document.querySelector(node.target[0]) : null;
            if (!el) {
              kept.push(node);
              continue;
            }
            const real = realContrast(el);
            if (real === null || real.value < real.threshold) kept.push(node);
          }
          if (kept.length) {
            violations.push({ id: v.id, impact: v.impact, help: v.help, nodes: kept.length });
          }
        } else {
          violations.push({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.length });
        }
      }
      return {
        violations,
        h1Count: document.querySelectorAll('h1').length,
      };
    });
    const routeLabel = route === '/' ? 'home' : route.slice(1);
    const serious = axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    totalViolations += axe.violations.reduce((n, v) => n + v.nodes, 0);
    check(`a11y: ${routeLabel} sin violaciones`, axe.violations.length, 0);
    check(`a11y: ${routeLabel} h1 único`, axe.h1Count, 1);
    if (axe.violations.length > 0) {
      console.log(`   → ${routeLabel}: ${JSON.stringify(axe.violations)}`);
    }
    await page.close();
  }

  await browser.close();

  const fails = results.filter((r) => !r.ok).length;
  console.log(
    `\nRESULTADO: ${results.length - fails}/${results.length} PASS | violaciones totales: ${totalViolations}${fails ? ` | ${fails} FAIL` : ' | TODO OK'}`,
  );
  process.exit(fails ? 1 : 0);
}

main().catch((e) => {
  console.error('A11Y AUDIT ERROR', e);
  process.exit(1);
});
