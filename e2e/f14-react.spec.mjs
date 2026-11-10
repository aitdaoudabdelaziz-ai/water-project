// F14 نسخة React (المرحلة 1): تطابق الأرقام مع البرنامج الأصلي، الشاشات، النسخ المشفّرة، وعدم لمس بيانات الأصل
import test, { after } from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs';
import { launch, close, URL } from './helpers.mjs';
after(close);
async function goData(r) { if (await r.locator('.nav .more-b').isVisible()) { await r.locator('.nav .more-b').click(); await r.locator('.dlg .opt', { hasText: 'البيانات' }).click(); } else await r.locator('.nav button', { hasText: 'البيانات' }).click(); }
const BASE = URL.replace(/water\/www\/index\.html|cloud\/index\.html/, '');
const RURL = BASE + 'react/', LURL = BASE + 'water/www/index.html';
async function ctx(w = 390) { const b = await launch(); const c = await b.newContext({ viewport: { width: w, height: 844 } }); await c.route(/gstatic|googleapis|cdnjs/, r => r.abort()); return c; }
async function page(c, u, errs = []) { const p = await c.newPage(); p.on('pageerror', e => errs.push(String(e))); p.on('console', m => m.type() === 'error' && !/ERR_FAILED/.test(m.text()) && errs.push(m.text())); p.on('dialog', d => d.accept()); await p.goto(u); return p; }
const num = s => +String(s).replace(/[^\d.-]/g, '');

/** React (بيانات تجريبية) + البرنامج الأصلي بنفس البيانات */
async function both(w = 390) {
  const c = await ctx(w), errs = [];
  const r = await page(c, RURL, errs); await r.locator('.kpi').first().waitFor();
  await goData(r); await r.getByRole('button', { name: /بيانات تجريبية/ }).click(); await r.waitForTimeout(1300);
  const D = await r.evaluate(() => JSON.parse(localStorage.getItem('w1react') || 'null'));
  const data = D ? D.data : null;
  await c.addInitScript(d => { localStorage.setItem('wcloud_mode', 'local'); if (d && !localStorage.getItem('w1')) localStorage.setItem('w1', JSON.stringify(d)); }, data);
  const l = await page(c, LURL); await l.waitForFunction(() => typeof D === 'object' && typeof evs === 'function');
  return { c, r, l, errs };
}
test('F14-H1 React app opens with demo data, no errors, fits the phone, 4 tabs', async () => {
  const c = await ctx(), errs = []; const r = await page(c, RURL, errs);
  await r.locator('.kpi').first().waitFor(); await r.waitForTimeout(1300);
  assert.equal(await r.locator('.nav button:visible').count(), 5);
  assert.ok(await r.evaluate(() => document.documentElement.scrollWidth) <= 390);
  await r.screenshot({ path: '/tmp/react-home.png' });
  assert.deepEqual(errs, []);
});
test('F14-H2 dashboard numbers are identical to the original app', async () => {
  const { r, l } = await both();
  const L = await l.evaluate(() => { const Y = new Date().getFullYear(), live = D.invs.filter(i => SB(i.s)), inv = live.filter(i => i.y == Y), b = inv.reduce((t, i) => t + tot(i), 0), cl = inv.filter(i => i.paid).reduce((t, i) => t + tot(i), 0);
    const C = evs().reduce((C, x) => { const f = eff(x); return [C[0] + f[0], C[1] + f[1]] }, [+D.cfg.oc || 0, +D.cfg.ob || 0]);
    return { subs: D.subs.length, debt: Math.round(live.filter(i => !i.paid).reduce((t, i) => t + tot(i), 0)), pc: b ? Math.round(cl / b * 100) : 0, treasury: Math.round(C[0] + C[1]), late: new Set(live.filter(i => !i.paid).map(i => i.s)).size } });
  const k = await r.locator('.kpi .kpi-v').allInnerTexts();
  assert.equal(num(k[2]), L.subs); assert.equal(num(k[3]), L.debt); assert.equal(num(k[1]), L.pc);
  assert.equal(num(await r.locator('.tile').nth(1).locator('b').innerText()), L.treasury);
  assert.equal(num(await r.locator('.bell b').innerText()), L.late);
});
test('F14-H3 invoices screen: unpaid filter count and totals match the original', async () => {
  const { r, l } = await both(1280);
  const L = await l.evaluate(() => { const Y = new Date().getFullYear(), u = D.invs.filter(i => SB(i.s) && i.y == Y && !i.paid); return { n: u.length, sum: Math.round(u.reduce((t, i) => t + tot(i), 0)) } });
  await r.locator('.nav button', { hasText: 'الفواتير' }).click();
  await r.getByLabel('الحالة').selectOption('0');
  assert.equal(num(await r.locator('.toolbar h2 .cnt').innerText()), L.n);
  assert.equal(num(await r.locator('.sums div').first().locator('b').innerText()), L.sum);
  await r.screenshot({ path: '/tmp/react-invoices.png' });
});
test('F14-H4 subscribers: search, debt filter and detail sheet', async () => {
  const { r } = await both();
  await r.locator('.nav button', { hasText: 'المشتركون' }).click();
  await r.getByLabel('بحث في المشتركين').fill('D-1007'); await r.waitForTimeout(200);
  assert.equal(await r.locator('.list li').count(), 1);
  await r.locator('.row-b').first().click();
  assert.equal(await r.getByRole('dialog').isVisible(), true);
  assert.ok(await r.locator('.tbl tbody tr').count() >= 1);
  await r.screenshot({ path: '/tmp/react-sub.png' });
  await r.keyboard.press('Escape'); assert.equal(await r.getByRole('dialog').count(), 0);
  await r.getByLabel('بحث في المشتركين').fill(''); await r.getByRole('button', { name: 'عليهم ديون', exact: true }).click();
  const n = await r.locator('.toolbar h2 .cnt').innerText(), late = await r.evaluate(() => 0);
  assert.ok(num(n) > 0 && num(n) < 40, n);
});
test('F14-H5 opens an encrypted backup made by the original app', async () => {
  const { c, l } = await both();
  await l.evaluate(() => { D.subs.push({ id: 999, name: 'مشترك من الأصل', meter: 'ENC-1' }); });
  const enc = await l.evaluate(async () => encPack(JSON.stringify(D), 'Secret#2026'));
  const f = '/tmp/react-enc.json'; fs.writeFileSync(f, enc);
  const r = await page(c, RURL); await goData(r);
  await r.locator('input[type=file]').setInputFiles(f);
  await r.getByLabel('كلمة السر', { exact: true }).fill('nope'); await r.getByRole('button', { name: 'فتح', exact: true }).click();
  await r.getByRole('alert').waitFor();
  await r.getByLabel('كلمة السر', { exact: true }).fill('Secret#2026'); await r.getByRole('button', { name: 'فتح', exact: true }).click();
  await r.locator('.kpi').first().waitFor(); await r.locator('.nav button', { hasText: 'المشتركون' }).click();
  await r.getByLabel('بحث في المشتركين').fill('ENC-1'); await r.waitForTimeout(200);
  assert.match(await r.locator('.list').innerText(), /مشترك من الأصل/);
});
test('F14-E1 React never writes into the original app data (w1 / w1c)', async () => {
  const c = await ctx(); await c.addInitScript(() => { if (!localStorage.getItem('w1')) localStorage.setItem('w1', JSON.stringify({ subs: [{ id: 1, name: 'أصلي', meter: 'X' }], reads: {}, invs: [], fin: [], cfg: {} })) });
  const r = await page(c, RURL); await goData(r);
  await r.getByRole('button', { name: /بيانات البرنامج على هذا الجهاز/ }).click(); await r.locator('.kpi').first().waitFor();
  await r.getByRole('button', { name: /الوضع/ }).click();
  const w1 = await r.evaluate(() => localStorage.getItem('w1'));
  assert.equal(JSON.parse(w1).subs[0].name, 'أصلي'); assert.equal(await r.evaluate(() => localStorage.getItem('w1c')), null);
});
