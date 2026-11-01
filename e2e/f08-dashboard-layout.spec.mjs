// F08 لوحة القيادة والعرض على الهاتف
import test, { after } from 'node:test'; import assert from 'node:assert/strict';
import { open, close, addSub, enterReading, clean } from './helpers.mjs';
after(close);
for (const [w, h] of [[390, 844], [1440, 900]]) for (const th of ['light', 'dark'])
  test(`F08-H1 dashboard ${w}px ${th}: no horizontal scroll, numbers match`, async () => {
    const { page, log } = await open({ width: w, height: h });
    await addSub(page, { name: 'أحمد', meter: 'M1' }); await enterReading(page, 1, 0, 10);
    await page.getByRole('button', { name: 'تسجيل الفواتير' }).click();
    await page.evaluate(() => { payAsk([D.invs[0].id]); payGo('c'); });
    await page.evaluate(t => { document.documentElement.dataset.th = t; go(5); }, th);
    await page.locator('.fx_card').waitFor();
    await page.waitForTimeout(1200); // count-up animation
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    assert.ok(sw <= w, 'scrollWidth ' + sw);
    const t = await page.locator('.fx_card').innerText();
    assert.match(t, /المشتركون\s*1/); assert.match(t, /100%/);
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `/tmp/e2e-dash-${w}-${th}.png`, fullPage: false });
    assert.ok(clean(log), JSON.stringify(log));
  });
test('F08-H2 every section opens at 390px without horizontal scroll', async () => {
  const { page, log } = await open({ width: 390, height: 844 });
  await addSub(page, { name: 'اسم طويل جداً '.repeat(5), meter: 'M1' });
  for (const t of [0, 1, 2, 3, 4, 5]) {
    await page.evaluate(t => go(t), t);
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    assert.ok(sw <= 390, 'tab ' + t + ' scrollWidth ' + sw);
  }
  assert.ok(clean(log), JSON.stringify(log));
});
test('F08-H3 French language switch and back', async () => {
  const { page, log } = await open();
  await page.locator('#lgb').click(); await page.waitForTimeout(200);
  assert.match(await page.locator('nav').innerText(), /Abonnés|Factures/);
  await page.locator('#lgb').click(); await page.waitForTimeout(200);
  assert.match(await page.locator('nav').innerText(), /المشتركون/);
  assert.ok(clean(log), JSON.stringify(log));
});
