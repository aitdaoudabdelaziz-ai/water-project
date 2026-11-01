// F03 التحصيل السريع
import test, { after } from 'node:test'; import assert from 'node:assert/strict';
import { open, close, addSub, data, clean } from './helpers.mjs';
after(close);

test('F03-H1 search, reading, invoice and cash payment in one screen', async () => {
  const { page, log } = await open();
  await addSub(page, { name: 'فاطمة', meter: 'Q7' });
  await page.getByRole('button', { name: '⚡ تحصيل سريع' }).click();
  await page.fill('#qk_q', 'Q7'); await page.press('#qk_q', 'Enter');
  await page.fill('#qk_o', '5'); await page.fill('#qk_n', '17');
  await page.getByRole('button', { name: 'حفظ القراءة وإصدار الفاتورة' }).click();
  await page.getByRole('button', { name: 'تأكيد الدفع نقداً' }).click();
  const d = await data(page); assert.equal(d.invs.length, 1); assert.equal(d.invs[0].paid, 1); assert.equal(d.invs[0].pw, 'c');
  assert.ok(clean(log), JSON.stringify(log));
});
test('F03-N1 empty or smaller reading shows a warning, no invoice', async () => {
  const { page } = await open();
  await addSub(page, { name: 'فاطمة', meter: 'Q7' });
  await page.getByRole('button', { name: '⚡ تحصيل سريع' }).click();
  await page.fill('#qk_q', 'Q7'); await page.press('#qk_q', 'Enter');
  await page.fill('#qk_o', '30'); await page.fill('#qk_n', '10');
  await page.getByRole('button', { name: 'حفظ القراءة وإصدار الفاتورة' }).click();
  assert.match(await page.locator('#qk_w').innerText(), /أصغر/); assert.equal((await data(page)).invs.length, 0);
});
test('F03-E1 double click on save makes one invoice', async () => {
  const { page } = await open();
  await addSub(page, { name: 'فاطمة', meter: 'Q7' });
  await page.getByRole('button', { name: '⚡ تحصيل سريع' }).click();
  await page.fill('#qk_q', 'Q7'); await page.press('#qk_q', 'Enter');
  await page.fill('#qk_o', '1'); await page.fill('#qk_n', '9');
  await page.locator('#qk_save').dblclick();
  assert.equal((await data(page)).invs.length, 1);
});
