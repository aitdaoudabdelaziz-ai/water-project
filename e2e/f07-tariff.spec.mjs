// F07 الثمن والأشطر
import test, { after } from 'node:test'; import assert from 'node:assert/strict';
import { open, close, addSub, enterReading } from './helpers.mjs';
after(close);
test('F07-H1 changing the price does not change old invoices', async () => {
  const { page } = await open();
  await addSub(page, { name: 'أحمد', meter: 'M1' }); await enterReading(page, 1, 0, 10);
  await page.getByRole('button', { name: 'تسجيل الفواتير' }).click();
  const a = await page.evaluate(() => tot(D.invs[0]));
  await page.evaluate(() => go(4)); await page.fill('#cp', '9'); await page.dispatchEvent('#cp', 'change');
  assert.equal(await page.evaluate(() => tot(D.invs[0])), a);
});
test('F07-H2 tiered tariff: 0-10 at 3, above at 5 -> 28 m3 = 120', async () => {
  const { page } = await open();
  const v = await page.evaluate(() => tierAmt(28, [{ to: 10, price: 3 }, { to: null, price: 5 }]));
  assert.equal(v, 120);
});
