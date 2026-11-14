// F20 اعتماد النسخة الجديدة في الموقع: التحويل، نقل وضع البرنامج القديم مرة واحدة، والبرنامج القديم في /old/
import test, { after } from 'node:test'; import assert from 'node:assert/strict';
import { launch, close, URL } from './helpers.mjs';
after(close);
const BASE = URL.replace(/water\/www\/index\.html/, '');
async function ctx() { const b = await launch(), c = await b.newContext({ viewport: { width: 390, height: 844 } }); await c.route(/gstatic|googleapis|cdnjs/, r => r.abort()); return c; }
const D3 = { subs: [1, 2, 3].map(i => ({ id: i, name: 'قديم ' + i, meter: 'O-' + i, cin: '', phone: '', addr: '' })), reads: {}, invs: [], sid: 3, seq: 0, fin: [], fid: 0, users: [], uid: 0, cfg: { price: 5, fee: 10 } };
test('F20-H1 main address and /cloud/ open the new app; invite-style links are no longer forwarded', async () => {
  const c = await ctx(), p = await c.newPage();
  await p.goto(BASE); await p.waitForURL(/\/react\/$/); await p.locator('.kpi').first().waitFor();
  assert.equal(await p.title(), 'جمعية الفتح - تدبير الماء'); assert.equal(await p.locator('.preview').count(), 0);
  await p.goto(BASE + 'cloud/'); await p.waitForURL(/\/react\/$/);
  await p.goto(BASE + 'cloud/#c=abc'); await p.waitForURL(/\/react\/$/); // روابط # لا تُمرَّر بعد الآن
});
test('F20-H2 a device that used the old app with the cloud switches to the cloud with saving on (once)', async () => {
  const c = await ctx(), p = await c.newPage(); await p.goto(BASE + 'icon-192.png');
  await p.evaluate(d => { localStorage.clear(); localStorage.setItem('w1c', JSON.stringify(d)); }, D3);
  await p.goto(BASE + 'react/'); await p.locator('.cchip').waitFor();
  assert.deepEqual(await p.evaluate(() => [localStorage.getItem('w1react_cloud'), localStorage.getItem('w1react_cloudwrite')]), ['1', '1']);
  // مرة واحدة فقط: إذا أوقف المستخدم الحفظ يبقى موقوفاً
  await p.evaluate(() => localStorage.removeItem('w1react_cloudwrite')); await p.reload(); await p.locator('.cchip').waitFor();
  assert.equal(await p.evaluate(() => localStorage.getItem('w1react_cloudwrite')), null);
});
test('F20-H3 a device that used the old app locally gets its data carried over, old data untouched', async () => {
  const c = await ctx(), p = await c.newPage(); await p.goto(BASE + 'icon-192.png');
  await p.evaluate(d => { localStorage.clear(); localStorage.setItem('wcloud_mode', 'local'); localStorage.setItem('w1', JSON.stringify(d)); }, D3);
  await p.goto(BASE + 'react/'); await p.locator('.kpi').first().waitFor();
  await p.locator('.nav button', { hasText: 'المشتركون' }).click();
  assert.equal(+(await p.locator('.toolbar h2 .cnt').innerText()), 3); assert.match(await p.locator('.list').innerText(), /قديم 1/);
  assert.equal(await p.evaluate(() => localStorage.getItem('w1react_cloud')), null);
  assert.deepEqual(JSON.parse(await p.evaluate(() => localStorage.getItem('w1'))), D3);
});
test('F20-H4 the old app still opens at /old/cloud/', async () => {
  const c = await ctx(), p = await c.newPage(), errs = []; p.on('pageerror', e => errs.push(String(e)));
  await c.addInitScript(() => localStorage.setItem('wcloud_mode', 'local'));
  await p.goto(BASE + 'old/cloud/'); await p.locator('nav').first().waitFor(); assert.deepEqual(errs, []);
});
