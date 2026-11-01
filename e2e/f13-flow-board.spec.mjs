// F13 سير الجولة في لوحة القيادة + الحركات + شارة الفواتير
import test, { after } from 'node:test'; import assert from 'node:assert/strict';
import { open, close, addSub, enterReading, clean } from './helpers.mjs';
after(close);
async function setup() {
  const o = await open({ width: 390, height: 844 });
  await addSub(o.page, { name: 'أمينة', meter: 'A1', phone: '0612345678' });
  await addSub(o.page, { name: 'بشير', meter: 'B1' });
  await enterReading(o.page, 1, 0, 10);
  await o.page.getByRole('button', { name: 'تسجيل الفواتير' }).click();
  await o.page.evaluate(() => go(5)); await o.page.locator('.fw').waitFor();
  return o;
}
const col = (page, i) => page.locator('.fw_col').nth(i);
test('F13-H1 columns: waiting / unpaid / paid with the right people and counts', async () => {
  const { page, log } = await setup();
  assert.match(await col(page, 0).innerText(), /بشير/); assert.match(await col(page, 1).innerText(), /أمينة/);
  assert.equal((await col(page, 0).locator('.fw_n').innerText()).trim(), '1');
  assert.equal(await page.locator('nav button[data-t="2"] .fw_nb').innerText(), '1');
  assert.ok(clean(log), JSON.stringify(log));
});
test('F13-H2 pay from the board moves the card to "paid" and clears the badge', async () => {
  const { page } = await setup();
  await col(page, 1).getByRole('button', { name: '✓ دفع' }).click();
  await page.getByRole('button', { name: 'نقداً (الصندوق)' }).click();
  await page.waitForTimeout(200);
  assert.match(await col(page, 2).innerText(), /أمينة/); assert.equal(await page.locator('nav button[data-t="2"] .fw_nb').isHidden(), true);
});
test('F13-H3 "record" opens the quick screen on that subscriber', async () => {
  const { page } = await setup();
  await col(page, 0).getByRole('button', { name: '✎ تسجيل' }).click();
  assert.equal(await page.locator('#qk').isVisible(), true); assert.equal(await page.locator('#qk_nm').innerText(), 'بشير');
  await page.fill('#qk_o', '0'); await page.fill('#qk_n', '7'); await page.getByRole('button', { name: 'حفظ القراءة وإصدار الفاتورة' }).click();
  await page.locator('#qk').getByRole('button', { name: 'إغلاق ✕' }).click();
  assert.match(await col(page, 1).innerText(), /بشير/);
});
test('F13-E1 numbers end at their real values; animations do not replay on every sync', async () => {
  const { page } = await setup();
  await page.waitForTimeout(1200);
  assert.equal(await page.locator('.fx_k').nth(2).locator('bdi').innerText(), '2');
  assert.equal(await page.evaluate(() => { lDash(); return document.querySelector('.fx_card').classList.contains('fx_go') }), false);
});
test('F13-E2 a viewer without edit rights sees no pay / record buttons', async () => {
  const { page } = await setup();
  const has = await page.evaluate(() => { D.users = [{ id: 1, u: 'v', r: 'u', p: ['v0', 'v1', 'v2', 'v3'] }]; sessionStorage.setItem('wu', JSON.stringify({ id: 1 })); lDash(); return document.querySelectorAll('.fw .fw_pay,.fw button[onclick^="fwRead"]').length });
  assert.equal(has, 0);
});
