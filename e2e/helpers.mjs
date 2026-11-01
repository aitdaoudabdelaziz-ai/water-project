import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium; try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/npm-tools/node_modules/playwright')); }
export const URL = process.env.WURL || 'http://127.0.0.1:8765/water/www/index.html';
let browser;
export async function launch() { browser ??= await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }); return browser; }
export async function close() { if (browser) await browser.close(); browser = null; }
// Opens the app in a fresh profile. Collects alerts, page errors and 5xx.
export async function open({ width = 1280, height = 900, seed, ctx } = {}) {
  const b = await launch();
  const context = ctx || await b.newContext({ viewport: { width, height }, locale: 'ar-MA' });
  await context.route(/cdnjs|gstatic|googleapis|firebase/, r => r.abort());
  const page = await context.newPage();
  const log = { alerts: [], errors: [], http5xx: [] };
  page.on('dialog', d => { log.alerts.push(d.type() + ':' + d.message()); d.type() === 'prompt' ? d.dismiss() : d.accept(); });
  page.on('pageerror', e => log.errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|net::|Failed to load resource/.test(m.text())) log.errors.push(m.text()); });
  page.on('response', r => { if (r.status() >= 500) log.http5xx.push(r.url()); });
  await context.addInitScript(() => { if (!localStorage.getItem('wcloud_mode')) localStorage.setItem('wcloud_mode', 'local'); });
  if (seed) await context.addInitScript(s => { if (!localStorage.getItem('w1')) localStorage.setItem('w1', s); }, JSON.stringify(seed));
  await page.goto(URL);
  await page.waitForFunction(() => typeof D === 'object' && typeof go === 'function');
  return { page, context, log };
}
export const data = page => page.evaluate(() => { flush(); return JSON.parse(localStorage.getItem('w1')); });
export async function tab(page, name) { await page.locator('nav button', { hasText: name }).first().click(); }
export async function addSub(page, { name, meter, cin = '', phone = '', addr = '' }) {
  await tab(page, 'المشتركون');
  await page.getByRole('button', { name: '＋ جديد' }).click();
  await page.fill('#n', name); await page.fill('#m', meter); await page.fill('#ci', cin); await page.fill('#p', phone); await page.fill('#a', addr);
  await page.locator('#msub').getByRole('button', { name: 'حفظ' }).click();
}
export async function enterReading(page, id, o, n) {
  await tab(page, 'القراءات');
  if (o != null) { await page.fill('#o' + id, String(o)); await page.dispatchEvent('#o' + id, 'change'); }
  await page.fill('#n' + id, String(n)); await page.dispatchEvent('#n' + id, 'change');
}
export function clean(log) { return log.errors.length === 0 && log.http5xx.length === 0; }
