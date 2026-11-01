// F10 النسخة التجريبية: بيانات وهمية، مفاتيح منفصلة، إعادة الضبط
import test, { after } from 'node:test'; import assert from 'node:assert/strict';
import { open, close, clean } from './helpers.mjs';
after(close);
const DEMO = (process.env.WURL || 'http://127.0.0.1:8765/water/www/index.html').replace(/water\/www\/index\.html|cloud\/index\.html/, 'demo/index.html');
for (const [w, h] of [[390, 844], [1440, 900]])
  test(`F10-H1 demo opens with fake data at ${w}px, no errors, no h-scroll`, async () => {
    const { page, log, context } = await open({ width: w, height: h });
    await page.goto(DEMO); await page.waitForFunction(() => typeof D === 'object' && D.subs.length === 40);
    await page.evaluate(() => localStorage.setItem('w1', JSON.stringify({ subs: [{ id: 1, name: 'REAL', meter: 'R' }], reads: {}, invs: [], fin: [] })));
    await page.evaluate(() => { D.subs[0].name = 'تعديل'; save(); flush(1); }); await page.reload(); await page.waitForFunction(() => typeof D === 'object');
    for (const t of [5, 0, 1, 2, 3, 4]) {
      await page.evaluate(t => go(t), t); await page.waitForTimeout(150);
      const sw = await page.evaluate(() => document.documentElement.scrollWidth); assert.ok(sw <= w, 'tab ' + t + ' ' + sw);
    }
    await page.evaluate(() => go(5)); await page.waitForTimeout(1200);
    await page.screenshot({ path: `/tmp/demo-${w}.png` });
    assert.match(await page.locator('#dm_bar').innerText(), /نسخة تجريبية/);
    assert.equal(JSON.parse(await page.evaluate(() => localStorage.getItem('w1'))).subs[0].name, 'REAL', 'real data untouched');
    assert.ok(clean(log), JSON.stringify(log));
  });
test('F10-H2 changes stay, reset brings back the original demo', async () => {
  const { page } = await open();
  await page.goto(DEMO); await page.waitForFunction(() => typeof D === 'object' && D.subs.length === 40);
  await page.evaluate(() => { rmSubs(new Set([1, 2, 3])); flush(); });
  await page.reload(); await page.waitForFunction(() => typeof D === 'object');
  assert.equal(await page.evaluate(() => D.subs.length), 37);
  await Promise.all([page.waitForEvent('load'), page.getByRole('button', { name: '↺ إعادة البيانات' }).click()]);
  await page.waitForFunction(() => typeof D === 'object');
  assert.equal(await page.evaluate(() => D.subs.length), 40);
});
